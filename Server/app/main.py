import os
import json
import tempfile
import logging

# ── Make ffmpeg available to Whisper ──
# ffmpeg.exe is placed in this directory (copied from imageio-ffmpeg)
APP_DIR = os.path.dirname(os.path.abspath(__file__))
os.environ["PATH"] = APP_DIR + os.pathsep + os.environ.get("PATH", "")

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import whisper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Load Whisper model on startup (uses GPU if available) ──
logger.info("Loading Whisper 'base' model (first run downloads ~150MB)...")
model = whisper.load_model("base")
logger.info("✅ Whisper model loaded successfully!")

# ── Distress keywords: English + Hindi (Roman + Devanagari) + Marathi (Roman + Devanagari) ──
DISTRESS_KEYWORDS = [
    # ── English (20+) ──
    "help", "help me", "save me", "stop", "leave me", "let me go",
    "please stop", "don't touch", "somebody help", "emergency",
    "call police", "i am scared", "please help", "he is following",
    "following me", "kidnap", "attack", "assault", "rape", "molest",
    "harass", "stalking", "get away", "stay away", "police",
    "leave me alone", "stop it", "get off me", "i need help",

    # ── Hindi Romanized (20+) ──
    "bachao", "bachao mujhe", "mujhe bachao", "chhodo", "chhod do",
    "ruko", "mat karo", "dur raho", "police bulao", "koi bachao",
    "madad", "madad karo", "jane do", "hatiye", "hato",
    "koi hai", "koi madad karo", "peecha kar raha", "maar raha",
    "pakad liya", "mujhe chhoddo", "mujhe mat chuo", "help karo",
    "kya kar rahe ho", "mujhe jane do", "peeche pad gaya",

    # ── Hindi Devanagari (30+) — what Sarvam AI / Whisper actually returns ──
    "बचाओ", "मुझे बचाओ", "मदद", "मदद करो", "छोड़ो", "छोड़ दो",
    "रुको", "मत करो", "दूर रहो", "पुलिस बुलाओ", "कोई बचाओ",
    "कोई मदद करो", "जाने दो", "हटिये", "हटो", "कोई है",
    "पीछा कर रहा", "मार रहा", "पकड़ लिया", "हेल्प करो",
    "मुझे छोड़ दो", "मुझे मत छुओ", "क्या कर रहे हो",
    "मुझे जाने दो", "पीछे पड़ गया", "हेल्प", "बचाओ कोई",
    "मदद चाहिए", "बचाओ मुझे", "पुलिस", "कोई तो आओ",
    "मुझे बचा लो", "मार डालेगा", "मार रहा है", "पकड़ लिया है",
    "छोड़ दे", "हट जा", "हट जाओ", "दूर हट", "दूर हटो",
    "कोई सुनो", "कोई आओ", "बचा लो", "सहायता", "मदद कीजिए",

    # ── Marathi Romanized (20+) ──
    "vachva", "mala vachva", "madad kara", "madat kara", "sodha",
    "mala sodha", "naka karu", "polees bolva", "polees bolava",
    "koni ahe ka", "sahayya kara", "thamba", "paathlag karto",
    "bhiti vatay", "mala dhara", "madad havi", "mala jaau dya",
    "dur raha", "koni tari ya", "mala sparsh karu naka",
    "mala madat kara", "sagla theek nahi",

    # ── Marathi Devanagari (20+) — what Sarvam AI / Whisper actually returns ──
    "वाचवा", "मला वाचवा", "मदत करा", "सोडा", "मला सोडा",
    "नका करू", "पोलीस बोलवा", "कोणी आहे का", "सहाय्य करा",
    "थांबा", "पाठलाग करतो", "भीती वाटतय", "मला धरा",
    "मदत हवी", "मला जाऊ द्या", "दूर राहा", "कोणी तरी या",
    "मला स्पर्श करू नका", "मला मदत करा", "सगळं ठीक नाही",
    "पोलीस", "मदत", "वाचवा मला", "सोड", "सोडा मला",
    "कोणी या", "मला मारतोय", "मला पकडलं", "सोड दे",
]

app = FastAPI(title="Sakhi-Sahayak Whisper AI", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Sakhi-Sahayak Whisper AI Pipeline is active.", "model": "base"}


@app.get("/api/danger-zones")
def get_danger_zones():
    zone_path = os.path.join(os.path.dirname(__file__), '../danger_zones.json')
    if os.path.exists(zone_path):
        with open(zone_path, 'r') as f:
            return json.load(f)
    return []


@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Accepts a WAV/WebM audio file, transcribes it with Whisper,
    and checks for distress keywords.
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")

    # Save uploaded audio to a temp file
    suffix = ".wav" if "wav" in (audio.content_type or "") else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        logger.info(f"Transcribing audio file: {tmp_path} ({len(content)} bytes)")

        # Run Whisper transcription
        result = model.transcribe(tmp_path)
        transcript = result.get("text", "").strip()
        language = result.get("language", "unknown")

        logger.info(f"Transcript: '{transcript}' (Language: {language})")

        # Check for distress keywords (normalize both sides — strip punctuation)
        import re
        def normalize(text):
            return re.sub(r'[!?.,\'"\\-_।॥()\[\]{}]', ' ', text.lower()).strip()

        normalized_transcript = normalize(transcript)
        keywords_found = [kw for kw in DISTRESS_KEYWORDS if normalize(kw) in normalized_transcript]
        distress_detected = len(keywords_found) > 0

        if distress_detected:
            logger.warning(f"🚨 DISTRESS DETECTED! Keywords: {keywords_found}")

        return {
            "success": True,
            "transcript": transcript,
            "language": language,
            "distress_detected": distress_detected,
            "keywords_found": keywords_found
        }

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
