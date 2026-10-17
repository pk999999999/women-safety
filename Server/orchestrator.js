// ═══════════════════════════════════════════════════════════════════════════
//  ORCHESTRATOR LLM — LangGraph-Style State Machine with Tool Calling
//
//  Implements the full LangGraph state graph:
//
//    ┌──────┐   Route started    ┌────────────┐
//    │ IDLE │──────────────────▶ │ MONITORING │◀───────────────────────┐
//    └──────┘   Sarthi activated └─────┬──────┘  User: "I'm Safe"    │
//         ▲                            │                              │
//         │ Route ended               │ LLM confirms distress        │
//         └────────────────────┐      ▼                              │
//                              │ ┌─────────────────┐                 │
//                              │ │ THREAT_DETECTED  │─────────────────┘
//                              │ └────────┬────────┘
//                              │          │ 5s timer starts
//                              │          ▼
//                              │ ┌─────────────────────┐
//                              │ │ INTERCEPT_COUNTDOWN  │─── User: "I'm Safe" ──▶ MONITORING
//                              │ └────────┬────────────┘
//                              │          │ 5s elapsed (no cancel)
//                              │          ▼
//                              │ ┌─────────────────────┐
//                              │ │ EMERGENCY_PROTOCOL   │ ── Dispatch ──▶ MONITORING (Loop back to Orchestrator)
//                              │ └─────────────────────┘
//
//  Analyzes voice transcripts for threats in Hindi, Marathi, and English ONLY.
//  Uses OpenRouter GPT-4o-mini with structured tool-calling.
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { sendTranscriptionEmail } = require('./send-email');
const { EVIDENCE_DIR } = require('./evidenceRecorder');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ═══════════════════════════════════════════════════════════════
//  LANGGRAPH STATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const STATES = {
  IDLE: 'IDLE',
  MONITORING: 'MONITORING',
  THREAT_DETECTED: 'THREAT_DETECTED',
  INTERCEPT_COUNTDOWN: 'INTERCEPT_COUNTDOWN',
  EMERGENCY_PROTOCOL: 'EMERGENCY_PROTOCOL',
  RECORDING: 'RECORDING',
  RESOLVED: 'RESOLVED'
};

// ── Valid transitions (LangGraph edges) ──
const EDGES = {
  [STATES.IDLE]: [STATES.MONITORING],
  [STATES.MONITORING]: [STATES.IDLE, STATES.THREAT_DETECTED],
  [STATES.THREAT_DETECTED]: [STATES.MONITORING, STATES.INTERCEPT_COUNTDOWN],
  [STATES.INTERCEPT_COUNTDOWN]: [STATES.MONITORING, STATES.EMERGENCY_PROTOCOL],
  [STATES.EMERGENCY_PROTOCOL]: [STATES.MONITORING]
};

// ── Edge conditions (human-readable) ──
const EDGE_CONDITIONS = {
  [`${STATES.IDLE}->${STATES.MONITORING}`]: 'Route started / Sarthi activated',
  [`${STATES.MONITORING}->${STATES.IDLE}`]: 'Route ended / Sarthi disabled',
  [`${STATES.MONITORING}->${STATES.THREAT_DETECTED}`]: 'Orchestrator LLM confirms distress',
  [`${STATES.THREAT_DETECTED}->${STATES.MONITORING}`]: 'User clicks "I\'m Safe"',
  [`${STATES.THREAT_DETECTED}->${STATES.INTERCEPT_COUNTDOWN}`]: '5s timer starts',
  [`${STATES.INTERCEPT_COUNTDOWN}->${STATES.MONITORING}`]: 'User clicks "I\'m Safe"',
  [`${STATES.INTERCEPT_COUNTDOWN}->${STATES.EMERGENCY_PROTOCOL}`]: '5s elapsed (no cancel)',
  [`${STATES.EMERGENCY_PROTOCOL}->${STATES.MONITORING}`]: 'SOS email dispatched, loop back to orchestrator'
};

/**
 * Validate a state transition against the LangGraph edges
 */
function isValidTransition(from, to) {
  return EDGES[from]?.includes(to) || false;
}

/**
 * Get the edge condition label for a transition
 */
function getEdgeCondition(from, to) {
  return EDGE_CONDITIONS[`${from}->${to}`] || 'Unknown transition';
}

// ═══════════════════════════════════════════════════════════════
//  TOOL DEFINITIONS FOR THE LLM
// ═══════════════════════════════════════════════════════════════

const tools = [
  {
    type: 'function',
    function: {
      name: 'trigger_emergency_alert',
      description: 'Triggers an emergency alert when a genuine threat to the user\'s safety is detected. This dispatches notifications to emergency contacts and nearby police.',
      parameters: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Threat severity level. "critical" for life-threatening, "high" for assault/harassment, "medium" for suspicious but not immediate danger, "low" for minor concern.'
          },
          summary: {
            type: 'string',
            description: 'Brief summary of the detected threat for dispatch (max 200 chars).'
          },
          detected_language: {
            type: 'string',
            enum: ['hi-IN', 'mr-IN', 'en-IN', 'unknown'],
            description: 'The primary language detected in the distress speech. "hi-IN" for Hindi, "mr-IN" for Marathi, "en-IN" for English.'
          }
        },
        required: ['severity', 'summary', 'detected_language']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_nearest_police',
      description: 'Looks up the nearest police station given the user\'s GPS coordinates.',
      parameters: {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Latitude' },
          lng: { type: 'number', description: 'Longitude' }
        },
        required: ['lat', 'lng']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_threat_email',
      description: 'Sends an email to the emergency contact with the threat transcription details. Called when a real threat is confirmed.',
      parameters: {
        type: 'object',
        properties: {
          transcript: { type: 'string', description: 'The transcribed speech text' },
          language: { type: 'string', description: 'Detected language code (hi-IN, mr-IN, en-IN)' },
          severity: { type: 'string', description: 'Threat severity' },
          summary: { type: 'string', description: 'Brief threat summary' }
        },
        required: ['transcript', 'language', 'severity', 'summary']
      }
    }
  }
];

// ═══════════════════════════════════════════════════════════════
//  SYSTEM PROMPT — Strict Trilingual (Hindi, Marathi, English ONLY)
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are an AI safety agent protecting women during navigation. You are part of the Sakhi-Sahayak LangGraph state machine. Your node is MONITORING → THREAT_DETECTED.

Your job:
1. Analyze voice transcripts captured near the user's microphone for potential threats to women's safety
2. Determine if the transcript indicates a GENUINE threat
3. STRICTLY support THREE languages ONLY (reject any other language as non-distress):
   - **Hindi (hi-IN)**: "bachao", "madad", "chhodo", "mat karo", "koi hai", "police bulao", "mujhe bachao", "chhoddo", "jane do", "ruko", "koi madad karo", "dar lag raha", "peecha kar raha", "maar raha", "pakad liya", "help karo", "bachao koi", "mujhe chhoddo", "hato", "hatiye", "koi bachao", "mujhe chhodo", "police ko call karo", "mujhe maar raha hai", "chhod do", "kya kar rahe ho", "dur raho", "mat chuo", "mujhe mat chuo", "madad karo", "koi to madad karo", "mujhe jane do", "peeche pad gaya"
   - **Marathi (mr-IN)**: "vachva", "madad kara", "sodha", "naka karu", "polees bolva", "koni ahe ka", "sahayya kara", "mala sodha", "thamba", "mala vachva", "paathlag karto", "bhiti vatay", "mala dhara", "madat kara", "polees bolava", "madad havi", "mala jaau dya", "dur raha", "koni tari ya", "mala sparsh karu naka", "mala madat kara", "koni madatila ya ka", "sagla theek nahi"
   - **English (en-IN)**: "help", "save me", "stop", "please no", "leave me", "don't touch", "someone help", "let me go", "get away", "call police", "i am scared", "please help", "he is following", "following me", "kidnap", "attack", "assault", "rape", "molest", "harass", "threatening", "stalking", "I need help", "someone is following me", "don't hurt me", "call 911", "help me", "stay away", "leave me alone", "stop it", "no please", "somebody help", "save me please", "get off me", "police"

4. ALWAYS identify which language the distress speech is in — Hindi, Marathi, or English ONLY
5. FALSE POSITIVES: Ignore casual conversation mentioning distress words in non-threatening contexts (e.g., watching a movie, reading news, joking)
6. If you determine there IS a genuine threat, call the trigger_emergency_alert tool with:
   - appropriate severity
   - a summary of the threat
   - the detected_language (hi-IN, mr-IN, or en-IN)
7. If there is NO threat, respond with JSON: {"action": "no_action", "summary": "reason", "detected_language": "xx-IN"}

Severity Guide:
- critical: Immediate physical danger (assault, kidnapping, weapon mentioned) OR ANY direct plea for help (e.g., "help me", "bachao", "save me"). Even a simple "help me" MUST automatically trigger the SOS pipeline as critical!
- high: Verbal harassment, stalking, aggressive confrontation, OR if the user explicitly instructs/commands the system to trigger the SOS/Emergency alert (e.g. "treat this as a serious threat and email the SOS").
- medium: Following, uncomfortable situation, someone won't leave them alone
- low: Minor concern, uncertain but worth monitoring

IMPORTANT: Always err on the side of caution. Even a simple "help me" OR a direct command to trigger the SOS MUST be treated as a CRITICAL/HIGH threat and trigger the emergency alert immediately. A false alarm is better than a missed emergency.
The LangGraph state machine will transition from MONITORING → THREAT_DETECTED if you call trigger_emergency_alert.
LANGUAGE RESTRICTION: ONLY analyze Hindi, Marathi, and English. Do NOT trigger for any other language.`;

// ═══════════════════════════════════════════════════════════════
//  NEAREST POLICE LOOKUP
// ═══════════════════════════════════════════════════════════════

function getNearestPolice(lat, lng) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'safety_data.json'), 'utf8'));
    const stations = data.police_stations || [];

    let nearest = null;
    let minDist = Infinity;

    stations.forEach(s => {
      const R = 6371;
      const dLat = (s.lat - lat) * Math.PI / 180;
      const dLon = (s.lng - lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat * Math.PI / 180) * Math.cos(s.lat * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      if (d < minDist) {
        minDist = d;
        nearest = {
          name: s.name,
          contact: s.contact,
          email: s.email,
          lat: s.lat,
          lng: s.lng,
          description: s.description,
          distance: d,
          distanceText: d > 1 ? `${d.toFixed(1)} km` : `${(d * 1000).toFixed(0)} m`
        };
      }
    });

    return nearest;
  } catch (err) {
    console.error('[Orchestrator] Failed to read safety_data.json:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  TOOL CALL PROCESSOR
// ═══════════════════════════════════════════════════════════════

function processToolCalls(toolCalls, location, userInfo, transcript) {
  const results = [];
  let finalAction = { action: 'no_action', summary: 'No threat detected.', detectedLanguage: 'unknown' };

  for (const call of toolCalls) {
    const funcName = call.function.name;
    let args;
    try {
      args = JSON.parse(call.function.arguments);
    } catch (e) {
      console.error('[Orchestrator] Failed to parse tool args:', e.message);
      continue;
    }

    if (funcName === 'trigger_emergency_alert') {
      console.log(`[Orchestrator] 🚨 TOOL CALL: trigger_emergency_alert`);
      console.log(`  Severity: ${args.severity}`);
      console.log(`  Summary: ${args.summary}`);
      console.log(`  Language: ${args.detected_language}`);

      // Look up nearest police station
      let nearestStation = null;
      if (location && location.lat && location.lng) {
        nearestStation = getNearestPolice(location.lat, location.lng);
      }

      finalAction = {
        action: 'trigger_emergency_alert',
        severity: args.severity,
        summary: args.summary,
        detectedLanguage: args.detected_language || 'unknown',
        nearestStation,
        userInfo
      };

      // ── LangGraph Edge: Send transcription email on confirmed threat ──
      sendTranscriptionEmail({
        transcript: transcript || args.summary,
        language: args.detected_language || 'unknown',
        location,
        severity: args.severity,
        summary: args.summary,
        trackingId: userInfo?.trackingId || null,
        userName: userInfo?.name || 'Unknown',
        nearestStation
      }).catch(err => {
        console.error('[Orchestrator] Transcription email error:', err.message);
      });

      results.push({
        tool_call_id: call.id,
        role: 'tool',
        content: JSON.stringify({
          success: true,
          message: `Emergency alert triggered with severity: ${args.severity}`,
          language: args.detected_language,
          nearestStation: nearestStation?.name || 'None found',
          emailDispatched: true
        })
      });

    } else if (funcName === 'get_nearest_police') {
      const station = getNearestPolice(args.lat, args.lng);
      results.push({
        tool_call_id: call.id,
        role: 'tool',
        content: JSON.stringify(station || { error: 'No stations found' })
      });

    } else if (funcName === 'send_threat_email') {
      // LangGraph node: dispatch email
      sendTranscriptionEmail({
        transcript: args.transcript,
        language: args.language,
        location,
        severity: args.severity,
        summary: args.summary,
        userName: userInfo?.name || 'Unknown'
      }).catch(err => {
        console.error('[Orchestrator] Email tool error:', err.message);
      });

      results.push({
        tool_call_id: call.id,
        role: 'tool',
        content: JSON.stringify({ success: true, message: 'Email dispatched to emergency contact' })
      });
    }
  }

  return { results, finalAction };
}

// ═══════════════════════════════════════════════════════════════
//  MAIN FUNCTION: ANALYZE TRANSCRIPT
//
//  LangGraph Node: MONITORING
//  Edge: MONITORING → THREAT_DETECTED (if LLM confirms distress)
//  Edge: MONITORING → MONITORING (if no threat)
// ═══════════════════════════════════════════════════════════════

async function analyzeTranscript(transcript, location, userInfo) {
  if (!OPENROUTER_API_KEY) {
    console.error('[Orchestrator] ❌ OPENROUTER_API_KEY not set!');
    throw new Error('OpenRouter API key not configured');
  }

  // Save log locally as evidence
  try {
    const logLine = `[${new Date().toISOString()}] User: ${userInfo?.name || 'Unknown'} | LatLng: ${location?.lat || 0},${location?.lng || 0} | Transcript: "${transcript}"\n`;
    const logPath = path.join(EVIDENCE_DIR, 'orchestrator_logs.txt');
    if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    fs.appendFileSync(logPath, logLine);
  } catch (err) {
    console.error('[Orchestrator] Failed to log call locally:', err.message);
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Analyze this voice transcript captured near the user's phone during navigation.

Transcript: "${transcript}"
User Location: ${location ? `${location.lat}, ${location.lng}` : 'Unknown'}
User: ${userInfo?.name || 'Unknown'} (Phone: ${userInfo?.phone || 'N/A'})

IMPORTANT: This system STRICTLY supports Hindi (hi-IN), Marathi (mr-IN), and English (en-IN) ONLY.
Identify which language the speech is in — it MUST be one of these three.

Is this a genuine safety threat? If yes, call trigger_emergency_alert with the appropriate severity AND detected_language.
If no, respond with JSON: {"action": "no_action", "summary": "reason", "detected_language": "xx-IN"}`
    }
  ];

  try {
    console.log('[Orchestrator] 🧠 LangGraph Node: MONITORING → Sending to OpenRouter GPT-4o-mini...');

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sakhi-sahayak.app',
        'X-Title': 'Sakhi Sahayak LangGraph Orchestrator'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Orchestrator] OpenRouter error ${response.status}:`, errText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('No response from OpenRouter');
    }

    // Handle tool calls
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      console.log(`[Orchestrator] 🔧 LLM invoked ${choice.message.tool_calls.length} tool(s)`);
      const { finalAction } = processToolCalls(choice.message.tool_calls, location, userInfo, transcript);
      return finalAction;
    }

    // Handle text response (no tool call = no threat)
    const content = choice.message?.content || '';
    try {
      const parsed = JSON.parse(content);
      return {
        action: parsed.action || 'no_action',
        summary: parsed.summary || 'No threat detected.',
        detectedLanguage: parsed.detected_language || 'unknown'
      };
    } catch {
      return {
        action: 'no_action',
        summary: content.substring(0, 200),
        detectedLanguage: 'unknown'
      };
    }

  } catch (err) {
    console.error('[Orchestrator] Request failed:', err.message);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  analyzeTranscript,
  getNearestPolice,
  STATES,
  EDGES,
  EDGE_CONDITIONS,
  isValidTransition,
  getEdgeCondition
};
