// ═══════════════════════════════════════════════════════════════════════════
//  SEND-EMAIL.JS — Dedicated Resend Email Module for Sakhi-Sahayak
//
//  Standalone email dispatcher targeting: atharvmanojshukla7@gmail.com
//
//  Two email types:
//    1. Emergency SOS Alert   — on EMERGENCY_PROTOCOL state
//    2. Threat Transcription  — on confirmed threat detection
//
//  Usage:
//    const { sendEmergencyEmail, sendTranscriptionEmail } = require('./send-email');
//    await sendEmergencyEmail(alertData);
//    await sendTranscriptionEmail(transcript, language, location);
//
//  Standalone test:
//    node send-email.js
// ═══════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const { Resend } = require('resend');

// ── Configuration ──
const RESEND_API_KEY = process.env.RESEND_API;
const TARGET_EMAIL = 'atharvmanojshukla7@gmail.com';

// Initialize Resend
let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
  console.log('[SendEmail] ✅ Resend API initialized → target: ' + TARGET_EMAIL);
} else {
  console.error('[SendEmail] ❌ RESEND_API key missing! Email dispatch will fail.');
}

// ═══════════════════════════════════════════════════════════════
//  LANGUAGE DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════

const LANGUAGE_MAP = {
  'hi-IN': { name: 'Hindi',         flag: '🇮🇳', color: '#F59E0B' },
  'hi':    { name: 'Hindi',         flag: '🇮🇳', color: '#F59E0B' },
  'mr-IN': { name: 'Marathi',       flag: '🇮🇳', color: '#8B5CF6' },
  'mr':    { name: 'Marathi',       flag: '🇮🇳', color: '#8B5CF6' },
  'en-IN': { name: 'English',       flag: '🇬🇧', color: '#3B82F6' },
  'en':    { name: 'English',       flag: '🇬🇧', color: '#3B82F6' },
  'unknown': { name: 'Auto-Detected', flag: '🌐', color: '#64748B' }
};

function getLanguageDisplay(langCode) {
  return LANGUAGE_MAP[langCode] || LANGUAGE_MAP['unknown'];
}

// ═══════════════════════════════════════════════════════════════
//  1. EMERGENCY SOS EMAIL
//
//  Sent when the LangGraph state machine reaches EMERGENCY_PROTOCOL.
//  Contains: user info, GPS location, transcript, severity, nearest station.
// ═══════════════════════════════════════════════════════════════

function buildEmergencySosHTML(data) {
  const {
    trackingId, userName, userPhone, location, transcript,
    severity, nearestStation, timestamp, detectedLanguage
  } = data;

  const googleMapsLink = location
    ? `https://maps.google.com/maps?q=${location.lat},${location.lng}`
    : '#';

  const severityColors = {
    critical: '#DC2626', high: '#EF4444',
    medium: '#F59E0B', low: '#3B82F6'
  };
  const sevColor = severityColors[severity] || '#EF4444';
  const lang = getLanguageDisplay(detectedLanguage);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1E293B;border-radius:16px;overflow:hidden;border:2px solid ${sevColor};">
        
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,${sevColor},#991B1B);padding:24px 32px;">
          <h1 style="color:white;margin:0;font-size:24px;font-weight:900;letter-spacing:1px;">
            🚨 EMERGENCY SOS ALERT
          </h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0 0;font-size:14px;">
            Sakhi-Sahayak Safety System • LangGraph EMERGENCY_PROTOCOL State
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">

          <!-- Severity + Language + Tracking -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td>
                <span style="background:rgba(239,68,68,0.15);color:${sevColor};padding:6px 16px;border-radius:20px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border:1px solid ${sevColor}40;">
                  ${(severity || 'HIGH').toUpperCase()} SEVERITY
                </span>
                <span style="background:rgba(139,92,246,0.15);color:${lang.color};padding:6px 16px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:1px;border:1px solid ${lang.color}40;margin-left:8px;">
                  ${lang.flag} ${lang.name}
                </span>
              </td>
              <td align="right">
                <span style="color:#64748B;font-size:12px;font-family:monospace;">${trackingId || 'N/A'}</span>
              </td>
            </tr>
          </table>

          <!-- User Info -->
          <table width="100%" cellpadding="12" cellspacing="0" style="background:#0F172A;border-radius:12px;margin-bottom:20px;">
            <tr>
              <td style="border-bottom:1px solid #1E293B;">
                <span style="color:#94A3B8;font-size:12px;">USER</span><br>
                <span style="color:white;font-size:16px;font-weight:700;">${userName || 'Unknown User'}</span>
              </td>
              <td style="border-bottom:1px solid #1E293B;" align="right">
                <span style="color:#94A3B8;font-size:12px;">PHONE</span><br>
                <span style="color:#4ADE80;font-size:16px;font-weight:700;">${userPhone || 'N/A'}</span>
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <span style="color:#94A3B8;font-size:12px;">GPS COORDINATES</span><br>
                <span style="color:white;font-size:14px;font-family:monospace;">
                  ${location ? `${location.lat}, ${location.lng}` : 'Location unavailable'}
                </span>
              </td>
            </tr>
          </table>

          <!-- Google Maps Button -->
          ${location ? `
          <a href="${googleMapsLink}" target="_blank" style="display:block;background:linear-gradient(135deg,#16A34A,#22C55E);color:white;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;margin-bottom:20px;letter-spacing:0.5px;">
            📍 OPEN LIVE LOCATION IN GOOGLE MAPS
          </a>` : ''}

          <!-- Detected Speech -->
          ${transcript ? `
          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="color:#94A3B8;font-size:11px;margin:0 0 6px 0;text-transform:uppercase;letter-spacing:1px;">DETECTED DISTRESS SPEECH (${lang.flag} ${lang.name})</p>
            <p style="color:#FCA5A5;font-size:15px;font-style:italic;margin:0;">"${transcript}"</p>
          </div>` : ''}

          <!-- LangGraph State -->
          <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="color:#94A3B8;font-size:11px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">LANGGRAPH STATE MACHINE</p>
            <p style="color:#A78BFA;font-size:14px;font-family:monospace;margin:0;">
              IDLE → MONITORING → THREAT_DETECTED → INTERCEPT_COUNTDOWN → <span style="color:#EF4444;font-weight:900;">EMERGENCY_PROTOCOL</span> → RECORDING → RESOLVED
            </p>
          </div>

          <!-- Nearest Station -->
          ${nearestStation ? `
          <div style="background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.25);border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="color:#94A3B8;font-size:11px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">NEAREST POLICE STATION</p>
            <p style="color:white;font-size:15px;font-weight:700;margin:0 0 4px 0;">🚔 ${nearestStation.name}</p>
            ${nearestStation.contact ? `<p style="color:#4ADE80;font-size:14px;margin:4px 0;">📞 ${nearestStation.contact}</p>` : ''}
            ${nearestStation.phone ? `<p style="color:#4ADE80;font-size:14px;margin:4px 0;">📞 ${Array.isArray(nearestStation.phone) ? nearestStation.phone.join(', ') : nearestStation.phone}</p>` : ''}
            ${nearestStation.email ? `<p style="color:#60A5FA;font-size:14px;margin:4px 0;">📧 ${nearestStation.email}</p>` : ''}
            ${nearestStation.distanceText ? `<p style="color:#F59E0B;font-size:13px;margin:4px 0;">📏 ${nearestStation.distanceText} away</p>` : ''}
          </div>` : ''}

          <!-- Timestamp -->
          <p style="color:#475569;font-size:12px;text-align:center;margin:24px 0 0 0;">
            ⏰ Alert dispatched: ${timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0F172A;padding:20px 32px;border-top:1px solid #1E293B;">
          <p style="color:#475569;font-size:11px;margin:0;text-align:center;">
            Automated emergency alert from Sakhi-Sahayak • LangGraph Orchestrated Pipeline<br>
            Sent to: ${TARGET_EMAIL}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send emergency SOS email to atharvmanojshukla7@gmail.com
 * Called from voiceAgent.js → executeEmergencyProtocol()
 */
async function sendEmergencyEmail(alertData) {
  if (!resend) {
    console.error('[SendEmail] ❌ Cannot send emergency email — Resend not initialized');
    return { success: false, error: 'Resend API not configured' };
  }

  try {
    const html = buildEmergencySosHTML(alertData);
    const severity = (alertData.severity || 'HIGH').toUpperCase();

    console.log(`[SendEmail] 📧 Sending EMERGENCY SOS email to ${TARGET_EMAIL}...`);

    const { data, error } = await resend.emails.send({
      from: 'Sakhi-Sahayak Emergency <onboarding@resend.dev>',
      to: [TARGET_EMAIL],
      subject: `🚨 EMERGENCY SOS — ${severity} — ${alertData.trackingId || 'Sakhi-Sahayak'} — LangGraph EMERGENCY_PROTOCOL`,
      html: html,
      text: `EMERGENCY SOS ALERT\nUser: ${alertData.userName || 'Unknown'} (${alertData.userPhone || 'N/A'})\nSeverity: ${severity}\nTranscript: "${alertData.transcript || 'N/A'}"\nLocation: ${alertData.location ? `${alertData.location.lat}, ${alertData.location.lng}` : 'Unknown'}\nTime: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    });

    if (error) {
      console.error(`[SendEmail] ❌ Emergency email failed:`, JSON.stringify(error));
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log(`[SendEmail] ✅ EMERGENCY EMAIL SENT to ${TARGET_EMAIL} — ID: ${data?.id}`);
    return { success: true, messageId: data?.id, recipient: TARGET_EMAIL };

  } catch (err) {
    console.error(`[SendEmail] ❌ Emergency email exception:`, err.message);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
//  2. THREAT TRANSCRIPTION EMAIL
//
//  Sent when the orchestrator LLM confirms a genuine threat.
//  Contains: transcript text, detected language, GPS, severity.
// ═══════════════════════════════════════════════════════════════

function buildTranscriptionHTML({ transcript, language, location, severity, summary, trackingId, userName, timestamp, nearestStation }) {
  const lang = getLanguageDisplay(language);
  const googleMapsLink = location
    ? `https://maps.google.com/maps?q=${location.lat},${location.lng}`
    : '#';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1E293B;border-radius:16px;overflow:hidden;border:2px solid ${lang.color};">
        
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,${lang.color},#1E1B2E);padding:24px 32px;">
          <h1 style="color:white;margin:0;font-size:22px;font-weight:900;">
            🎤 THREAT TRANSCRIPTION DETECTED
          </h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0 0;font-size:14px;">
            Sakhi-Sahayak Voice Agent • ${lang.flag} ${lang.name} Detected
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">

          <!-- Language + Severity Badges -->
          <div style="margin-bottom:20px;">
            <span style="background:rgba(139,92,246,0.15);color:${lang.color};padding:6px 16px;border-radius:20px;font-size:12px;font-weight:800;letter-spacing:1px;border:1px solid ${lang.color}40;">
              ${lang.flag} ${lang.name}
            </span>
            ${severity ? `
            <span style="background:rgba(239,68,68,0.15);color:#EF4444;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border:1px solid #EF444440;margin-left:8px;">
              ${severity.toUpperCase()} THREAT
            </span>` : ''}
          </div>

          <!-- Transcript -->
          <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:20px;margin-bottom:20px;">
            <p style="color:#94A3B8;font-size:11px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">TRANSCRIBED SPEECH (${lang.flag} ${lang.name})</p>
            <p style="color:#FCA5A5;font-size:18px;font-style:italic;margin:0;line-height:1.6;">"${transcript}"</p>
          </div>

          <!-- LLM Analysis -->
          ${summary ? `
          <div style="background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.25);border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="color:#94A3B8;font-size:11px;margin:0 0 6px 0;text-transform:uppercase;letter-spacing:1px;">ORCHESTRATOR LLM ANALYSIS</p>
            <p style="color:#93C5FD;font-size:14px;margin:0;">${summary}</p>
          </div>` : ''}

          <!-- LangGraph State -->
          <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="color:#94A3B8;font-size:11px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">LANGGRAPH STATE MACHINE</p>
            <p style="color:#A78BFA;font-size:14px;font-family:monospace;margin:0;">
              MONITORING → <span style="color:#EF4444;font-weight:900;">THREAT_DETECTED</span> → INTERCEPT_COUNTDOWN → EMERGENCY_PROTOCOL
            </p>
          </div>

          <!-- Nearest Station -->
          ${nearestStation ? `
          <div style="background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.25);border-radius:12px;padding:16px;margin-bottom:20px;">
            <p style="color:#94A3B8;font-size:11px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">NEAREST POLICE STATION</p>
            <p style="color:white;font-size:15px;font-weight:700;margin:0 0 4px 0;">🚔 ${nearestStation.name}</p>
            ${nearestStation.contact ? `<p style="color:#4ADE80;font-size:14px;margin:4px 0;">📞 ${nearestStation.contact}</p>` : ''}
            ${nearestStation.distanceText ? `<p style="color:#F59E0B;font-size:13px;margin:4px 0;">📏 ${nearestStation.distanceText} away</p>` : ''}
          </div>` : ''}

          <!-- User + Location -->
          <table width="100%" cellpadding="12" cellspacing="0" style="background:#0F172A;border-radius:12px;margin-bottom:20px;">
            <tr>
              <td>
                <span style="color:#94A3B8;font-size:12px;">USER</span><br>
                <span style="color:white;font-size:14px;font-weight:700;">${userName || 'Unknown'}</span>
              </td>
              <td align="right">
                <span style="color:#94A3B8;font-size:12px;">TRACKING</span><br>
                <span style="color:#4ADE80;font-size:14px;font-family:monospace;">${trackingId || 'N/A'}</span>
              </td>
            </tr>
          </table>

          <!-- Google Maps -->
          ${location ? `
          <a href="${googleMapsLink}" target="_blank" style="display:block;background:linear-gradient(135deg,#16A34A,#22C55E);color:white;text-align:center;padding:14px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:16px;">
            📍 VIEW LOCATION ON GOOGLE MAPS
          </a>` : ''}

          <p style="color:#475569;font-size:12px;text-align:center;margin:16px 0 0 0;">
            ⏰ ${timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0F172A;padding:16px 32px;border-top:1px solid #1E293B;">
          <p style="color:#475569;font-size:11px;margin:0;text-align:center;">
            Sakhi-Sahayak Voice Agent • Sarvam AI STT → Orchestrator LLM → Email Dispatch
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send transcription notification email to atharvmanojshukla7@gmail.com
 * Called when the orchestrator LLM confirms a genuine threat
 */
async function sendTranscriptionEmail(data) {
  if (!resend) {
    console.error('[SendEmail] ❌ Cannot send transcription email — Resend not initialized');
    return { success: false, error: 'Resend API not configured' };
  }

  const { transcript, language, location, severity, summary, trackingId, userName } = data;
  const lang = getLanguageDisplay(language);

  try {
    console.log(`[SendEmail] 📧 Sending THREAT TRANSCRIPTION email to ${TARGET_EMAIL}...`);
    console.log(`[SendEmail]    Language: ${lang.flag} ${lang.name}`);
    console.log(`[SendEmail]    Transcript: "${(transcript || '').substring(0, 80)}..."`);

    const html = buildTranscriptionHTML({
      ...data,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });

    const { data: emailData, error } = await resend.emails.send({
      from: 'Sakhi-Sahayak Voice Agent <onboarding@resend.dev>',
      to: [TARGET_EMAIL],
      subject: `🎤 THREAT DETECTED — ${lang.flag} ${lang.name} — "${(transcript || '').substring(0, 40)}..." — ${trackingId || 'Sakhi-Sahayak'}`,
      html: html,
      text: `THREAT TRANSCRIPTION DETECTED\nLanguage: ${lang.name}\nTranscript: "${transcript}"\nSeverity: ${severity || 'Unknown'}\nUser: ${userName || 'Unknown'}\nLocation: ${location ? `${location.lat}, ${location.lng}` : 'Unknown'}\nTime: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    });

    if (error) {
      console.error(`[SendEmail] ❌ Transcription email failed:`, JSON.stringify(error));
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log(`[SendEmail] ✅ TRANSCRIPTION EMAIL SENT to ${TARGET_EMAIL} — ID: ${emailData?.id}`);
    return { success: true, messageId: emailData?.id, recipient: TARGET_EMAIL };

  } catch (err) {
    console.error(`[SendEmail] ❌ Transcription email exception:`, err.message);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  sendEmergencyEmail,
  sendTranscriptionEmail,
  getLanguageDisplay,
  TARGET_EMAIL,
  LANGUAGE_MAP
};

// ═══════════════════════════════════════════════════════════════
//  STANDALONE TEST — run: node send-email.js
// ═══════════════════════════════════════════════════════════════

if (require.main === module) {
  (async () => {
    console.log('\n═══════════════════════════════════════════════');
    console.log('  📧 SEND-EMAIL.JS — Standalone Test');
    console.log('═══════════════════════════════════════════════\n');

    // Test 1: Emergency SOS email
    console.log('--- Test 1: Emergency SOS Email ---');
    const sosResult = await sendEmergencyEmail({
      trackingId: 'TEST-' + Date.now().toString(36).toUpperCase(),
      userName: 'Test User',
      userPhone: '9324396434',
      location: { lat: 21.1458, lng: 79.0882 },
      transcript: 'bachao koi madad karo',
      severity: 'critical',
      detectedLanguage: 'hi-IN',
      nearestStation: {
        name: 'Sitabuldi Police Station',
        contact: '0712-2564100',
        distanceText: '1.2 km'
      },
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
    console.log('SOS Result:', JSON.stringify(sosResult, null, 2));

    // Test 2: Transcription email
    console.log('\n--- Test 2: Transcription Email ---');
    const transcriptResult = await sendTranscriptionEmail({
      transcript: 'mala vachva, koni ahe ka, madad kara!',
      language: 'mr-IN',
      location: { lat: 21.1458, lng: 79.0882 },
      severity: 'high',
      summary: 'Marathi distress call detected — user calling for help.',
      trackingId: 'TEST-MR-001',
      userName: 'Test User'
    });
    console.log('Transcription Result:', JSON.stringify(transcriptResult, null, 2));

    console.log('\n✅ All tests complete.');
  })();
}
