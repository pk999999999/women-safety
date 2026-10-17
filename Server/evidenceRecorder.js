// ═══════════════════════════════════════════════════════════════════════════
//  EVIDENCE RECORDER — Local File Storage with SHA-256 Integrity Hashing
//
//  Saves uploaded audio evidence to Server/evidence/ directory.
//  Each file gets a JSON sidecar with SHA-256 hash for integrity verification.
//  8-minute max recording enforced server-side.
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EVIDENCE_DIR = path.join(__dirname, 'evidence');
const MAX_RECORDING_MS = 8 * 60 * 1000; // 8 minutes

// Ensure evidence directory exists
function ensureDir() {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    console.log('[EvidenceRecorder] 📁 Created evidence directory:', EVIDENCE_DIR);
  }
}

/**
 * Save an evidence audio file
 * @param {string} trackingId - Emergency tracking ID (e.g., TRK-ABCD1234)
 * @param {Buffer} audioBuffer - Raw audio data
 * @param {string} format - File extension (default: 'webm')
 * @returns {{ filePath, metadataPath, hash }}
 */
function saveEvidence(trackingId, audioBuffer, format = 'webm') {
  ensureDir();

  const timestamp = Date.now();
  const fileName = `evidence_${trackingId}_${timestamp}.${format}`;
  const filePath = path.join(EVIDENCE_DIR, fileName);

  // Write audio file
  fs.writeFileSync(filePath, audioBuffer);

  // Compute SHA-256 hash
  const hash = crypto.createHash('sha256').update(audioBuffer).digest('hex');

  // Write metadata sidecar
  const metadata = {
    trackingId,
    fileName,
    format,
    sizeBytes: audioBuffer.length,
    sha256: hash,
    createdAt: new Date().toISOString(),
    integrityVerified: true
  };

  const metadataPath = filePath + '.json';
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`[EvidenceRecorder] ✅ Saved evidence: ${fileName} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`[EvidenceRecorder] SHA-256: ${hash}`);

  return { filePath, metadataPath, hash, fileName };
}

/**
 * Create a metadata-only record (for emergency resolution without audio)
 */
function createMetadata(trackingId, data) {
  ensureDir();

  const timestamp = Date.now();
  const fileName = `metadata_${trackingId}_${timestamp}.json`;
  const filePath = path.join(EVIDENCE_DIR, fileName);

  const record = {
    ...data,
    type: 'emergency_metadata',
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(`[EvidenceRecorder] 📄 Saved metadata: ${fileName}`);

  return filePath;
}

/**
 * List all evidence files for a tracking ID
 */
function listEvidence(trackingId) {
  ensureDir();
  const files = fs.readdirSync(EVIDENCE_DIR);
  return files.filter(f => f.includes(trackingId));
}

/**
 * Verify integrity of an evidence file
 */
function verifyIntegrity(fileName) {
  const filePath = path.join(EVIDENCE_DIR, fileName);
  const metadataPath = filePath + '.json';

  if (!fs.existsSync(filePath) || !fs.existsSync(metadataPath)) {
    return { valid: false, error: 'File or metadata not found' };
  }

  const audioBuffer = fs.readFileSync(filePath);
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const computedHash = crypto.createHash('sha256').update(audioBuffer).digest('hex');

  return {
    valid: computedHash === metadata.sha256,
    expectedHash: metadata.sha256,
    computedHash,
    fileName
  };
}

module.exports = {
  saveEvidence,
  createMetadata,
  listEvidence,
  verifyIntegrity,
  EVIDENCE_DIR,
  MAX_RECORDING_MS
};
