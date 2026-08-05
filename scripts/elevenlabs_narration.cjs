require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

/**
 * ELEVENLABS NARRATION PIPELINE
 * 
 * Model Options:
 * - 'eleven_multilingual_v2' (10,000 char per request limit)
 * - 'eleven_v3' (5,000 char per request limit)
 * 
 * Pricing benchmark: ₹8.80 per 1,000 characters
 */

const MODEL_ID = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const DEFAULT_VOICE_ID = 'EkK5I93UQWFDigLMpZcX';
const COST_PER_1K_INR = 8.80;
const MAX_RETRIES = 3; // Hard cap on retries to prevent runaway cost
const REQUEST_TIMEOUT_MS = 60000; // 60s timeout to prevent hanging connections
const SAFE_CHUNK_LIMIT = 1800; // Character limit per chunk for script splitting

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Convert emotion tags into ElevenLabs Multilingual v2 prosody & punctuation cues.
 * ElevenLabs Multilingual v2 responds to:
 * - Ellipses (...) -> pauses & suspenseful pacing
 * - Exclamation marks (!) -> intensity & urgent emphasis
 * - Capitalization (SPARINGLY) -> vocal stress on key words
 * - Em-dashes (—) -> abrupt structural shifts
 */
function convertTagsToProsody(text) {
  const paragraphs = text.split(/\n\n+/);
  
  const convertedParagraphs = paragraphs.map(paragraph => {
    const match = paragraph.match(/^\[([a-zA-Z0-9_\-\s]+)\]\s*(.*)/s);
    if (!match) return paragraph;

    const tag = match[1].toLowerCase().trim();
    let body = match[2].trim();

    if (tag === 'tense' || tag === 'urgent') {
      // Capitalize 1-2 key stress words sparingly, add urgency exclamation/pause cues
      body = body
        .replace(/\b(terror)\b/gi, 'TERROR')
        .replace(/\b(panic)\b/gi, 'PANIC')
        .replace(/\b(immediately)\b/gi, 'IMMEDIATELY')
        .replace(/\b(screaming)\b/gi, 'SCREAMING')
        .replace(/,\s*(cold sweat|and my body|telling me)/gi, '... $1')
        .replace(/(\.\s+|\.$)/g, '! ');
      body = body.trim();
    } else if (tag === 'grave' || tag === 'somber') {
      // Ellipses at pause points for solemn/grave weight
      body = body.replace(/,\s*/g, '... ');
    } else if (tag === 'curious' || tag === 'intrigued') {
      // Pause before reveals using ellipses
      body = body.replace(/(across the gravel|dim parking lot|into his face| shadow),?\s*/gi, '$1... ');
    } else if (tag === 'measured' || tag === 'skeptical' || tag === 'calm' || tag === 'wry') {
      // Clean, flat, analytical prose
      body = body;
    }

    return body;
  });

  return convertedParagraphs.join('\n\n');
}

/**
 * Sanitize script for ElevenLabs model execution
 */
function sanitizeTextForModel(text, modelId, useProsodyConversion = false) {
  if (modelId === 'eleven_v3') {
    return text; // eleven_v3 natively interprets bracketed audio tags
  }
  
  if (useProsodyConversion) {
    return convertTagsToProsody(text);
  }

  // Standard strip mode: remove bracketed tags entirely
  return text.replace(/\[[a-zA-Z0-9_\-\s]+\]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Split text into chunks ~1800 chars without breaking paragraphs
 */
function chunkScript(text, limit = SAFE_CHUNK_LIMIT) {
  const paragraphs = text.split('\n\n').map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length > limit && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? (currentChunk + '\n\n' + para) : para;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Call ElevenLabs Text-to-Speech API with strict timeout and max 3 retries
 */
async function generateAudioChunk(text, voiceId, apiKey, modelId = MODEL_ID, useProsodyConversion = false) {
  const sanitizedText = sanitizeTextForModel(text, modelId, useProsodyConversion);
  const charCount = sanitizedText.length;
  const projectedCostINR = (charCount / 1000) * COST_PER_1K_INR;

  // MANDATORY LOGGING BEFORE CALL
  console.log(`[COST ESTIMATE] Querying ElevenLabs API | Chars: ${charCount} | Model: ${modelId} | ProsodyMode: ${useProsodyConversion} | Projected Cost: ₹${projectedCostINR.toFixed(4)}`);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  const payload = {
    text: sanitizedText,
    model_id: modelId,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    }
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[API Call] Attempt ${attempt}/${MAX_RETRIES} sending ${charCount} chars to voice ${voiceId}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`ElevenLabs API HTTP ${response.status} (${response.statusText}): ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`[API Success] Received ${buffer.length} bytes of MP3 audio.`);
      return { buffer, charCount, actualCostINR: projectedCostINR, sanitizedText };
    } catch (err) {
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const errMsg = isTimeout ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s` : err.message;
      
      console.warn(`[API Attempt ${attempt}/${MAX_RETRIES} Failed]: ${errMsg}`);
      
      if (attempt === MAX_RETRIES) {
        throw new Error(`ElevenLabs generation failed after hard limit of ${MAX_RETRIES} attempts. Error: ${errMsg}`);
      }
      
      const delayMs = attempt * 5000;
      console.log(`Waiting ${delayMs / 1000}s before retry ${attempt + 1}...`);
      await sleep(delayMs);
    }
  }

  throw new Error(`Failed to generate audio after ${MAX_RETRIES} attempts.`);
}

/**
 * Measure actual MP3 audio duration using ffmpeg/ffprobe
 */
function getAudioDurationInSeconds(filePath) {
  let output = '';
  try {
    output = execSync(`"${ffmpeg}" -i "${filePath}" 2>&1`, { encoding: 'utf8' });
  } catch (err) {
    output = err.stdout || '';
  }
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseFloat(match[3]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Format seconds into MM:SS format
 */
function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Main execution function
 */
async function run() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ELEVENLABS_API_KEY is not defined in environment or .env file!');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const slug = args[0] || 'black-eyed-children-encounter';
  const chunkIndexArg = args.find(a => a.startsWith('--chunk='));
  const voiceIdArg = args.find(a => a.startsWith('--voice='));
  const useProsody = args.includes('--prosody');
  
  const targetChunkIndex = chunkIndexArg ? parseInt(chunkIndexArg.split('=')[1], 10) : null;
  const voiceId = voiceIdArg ? voiceIdArg.split('=')[1] : DEFAULT_VOICE_ID;

  const narrationPath = path.resolve(__dirname, '..', 'src', 'narration', `${slug}.txt`);
  if (!fs.existsSync(narrationPath)) {
    console.error(`Narration script file not found at: ${narrationPath}`);
    process.exit(1);
  }

  const rawText = fs.readFileSync(narrationPath, 'utf8').trim();
  const chunks = chunkScript(rawText);

  console.log(`========================================`);
  console.log(`ElevenLabs Narration Pipeline`);
  console.log(`Story Slug: ${slug}`);
  console.log(`Voice ID: ${voiceId}`);
  console.log(`Model ID: ${MODEL_ID}`);
  console.log(`Prosody Mode: ${useProsody ? 'ENABLED (Punctuation Conversion)' : 'DISABLED (Tag Strip)'}`);
  console.log(`Total script length: ${rawText.length} characters`);
  console.log(`Split into ${chunks.length} chunks`);
  console.log(`========================================`);

  const tempDir = path.resolve(__dirname, '..', 'temp_audio', slug);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Single chunk mode
  if (targetChunkIndex !== null) {
    const idx = targetChunkIndex - 1;
    if (idx < 0 || idx >= chunks.length) {
      console.error(`Invalid chunk index ${targetChunkIndex}. Available chunks: 1 to ${chunks.length}`);
      process.exit(1);
    }

    console.log(`\n--- GENERATING SINGLE CHUNK [Chunk ${targetChunkIndex}/${chunks.length}] ---`);
    const chunkText = chunks[idx];
    const { buffer, charCount, actualCostINR, sanitizedText } = await generateAudioChunk(chunkText, voiceId, apiKey, MODEL_ID, useProsody);
    
    const chunkFileName = useProsody ? `chunk_${targetChunkIndex}_prosody.mp3` : `chunk_${targetChunkIndex}.mp3`;
    const chunkFilePath = path.resolve(tempDir, chunkFileName);
    fs.writeFileSync(chunkFilePath, buffer);

    const durationSec = getAudioDurationInSeconds(chunkFilePath);
    
    console.log(`\n========================================`);
    console.log(`SINGLE CHUNK TEST RESULTS (${useProsody ? 'PROSODY MODE' : 'STRIP MODE'}):`);
    console.log(`Chunk File: ${chunkFilePath}`);
    console.log(`Raw Chunk Text (with tags): ${chunkText.length} chars`);
    console.log(`Exact Chars Sent to API: ${charCount} chars`);
    console.log(`Exact Cost Incurred: ₹${actualCostINR.toFixed(4)}`);
    console.log(`Generated Audio Duration: ${formatDuration(durationSec)} (${durationSec.toFixed(2)}s)`);
    console.log(`========================================`);
    return;
  }

  // Full story mode (all chunks)
  console.log(`\n--- GENERATING FULL STORY ALL ${chunks.length} CHUNKS ---`);
  const generatedChunkFiles = [];
  let totalCharsSent = 0;
  let totalCostINR = 0;

  for (let i = 0; i < chunks.length; i++) {
    console.log(`\n[Chunk ${i + 1}/${chunks.length}]`);
    const { buffer, charCount, actualCostINR } = await generateAudioChunk(chunks[i], voiceId, apiKey, MODEL_ID, useProsody);
    
    const chunkFilePath = path.resolve(tempDir, `chunk_${i + 1}.mp3`);
    fs.writeFileSync(chunkFilePath, buffer);
    generatedChunkFiles.push(chunkFilePath);
    
    totalCharsSent += charCount;
    totalCostINR += actualCostINR;

    if (i < chunks.length - 1) {
      console.log(`Waiting 2s between chunks...`);
      await sleep(2000);
    }
  }

  // Concatenate MP3 chunks using ffmpeg
  const listFilePath = path.resolve(tempDir, 'mp3_list.txt');
  const fileListContent = generatedChunkFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(listFilePath, fileListContent);

  const outputDir = path.resolve(__dirname, '..', 'public', 'audio');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const finalMp3Path = path.resolve(outputDir, `${slug}.mp3`);
  console.log(`\nConcatenating ${generatedChunkFiles.length} MP3 files to ${finalMp3Path}...`);

  const concatCmd = `"${ffmpeg}" -y -f concat -safe 0 -i "${listFilePath}" -c copy "${finalMp3Path}" 2>&1`;
  const ffmpegOut = execSync(concatCmd, { encoding: 'utf8' });
  
  const finalDurationSec = getAudioDurationInSeconds(finalMp3Path);

  console.log(`\n========================================`);
  console.log(`FULL STORY GENERATION COMPLETE:`);
  console.log(`Final File: ${finalMp3Path}`);
  console.log(`Total Chars Sent: ${totalCharsSent}`);
  console.log(`Total Actual Cost Incurred: ₹${totalCostINR.toFixed(4)}`);
  console.log(`Total Audio Duration: ${formatDuration(finalDurationSec)} (${finalDurationSec.toFixed(2)}s)`);
  console.log(`========================================`);
}

if (require.main === module) {
  run().catch(err => {
    console.error('\nFATAL ERROR in ElevenLabs script:', err.message);
    process.exit(1);
  });
}

module.exports = { generateAudioChunk, sanitizeTextForModel, convertTagsToProsody, chunkScript };
