require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { prepareNarrativeScript } = require('./prepare_script.cjs');

const SLUG = 'sverdlovsk-anthrax-leak';
const VOICE_ID = 'EkK5I93UQWFDigLMpZcX';
const MODEL_ID = 'eleven_multilingual_v2';
const SAFE_CHUNK_LIMIT = 1800;
const COST_PER_1K_USD = 0.30;

const VOICE_SETTINGS = {
  stability: 0.55,
  similarity_boost: 0.80,
  style: 0.00,
  use_speaker_boost: true
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

async function generateAudioChunk(text, apiKey) {
  const charCount = text.length;
  const projectedCostUSD = (charCount / 1000) * COST_PER_1K_USD;

  console.log(`[COST ESTIMATE] ElevenLabs API Call | Chars: ${charCount} | Projected Cost: $${projectedCostUSD.toFixed(4)} USD`);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  
  const payload = {
    text: text,
    model_id: MODEL_ID,
    voice_settings: VOICE_SETTINGS
  };

  const totalAttempts = 2; // 1 initial + 1 retry max
  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      console.log(`[API Call] Attempt ${attempt}/${totalAttempts} sending ${charCount} chars to voice ${VOICE_ID}...`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`ElevenLabs API HTTP ${response.status} (${response.statusText}): ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`[API Success] Received ${buffer.length} bytes of MP3 audio.`);
      return { buffer, charCount, actualCostUSD: projectedCostUSD };
    } catch (err) {
      console.warn(`[API Attempt ${attempt}/${totalAttempts} Failed]: ${err.message}`);
      
      if (err.message.includes('quota') || err.message.includes('credit') || err.message.includes('payment') || err.message.includes('402')) {
        throw new Error(`INSUFFICIENT_CREDITS: ${err.message}`);
      }

      if (attempt === totalAttempts) {
        throw err;
      }
      
      console.log(`Waiting 3s before retry...`);
      await sleep(3000);
    }
  }

  throw new Error(`Failed to generate audio.`);
}

function getAudioDurationInSeconds(filePath) {
  let output = '';
  try {
    output = execSync(`"${ffmpeg}" -i "${filePath}" 2>&1`, { encoding: 'utf8' });
  } catch (err) {
    output = err.stdout || err.output?.join('') || '';
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

function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function run() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ELEVENLABS_API_KEY is not defined in environment!');
    process.exit(1);
  }

  const narrationPath = path.resolve(__dirname, '..', 'src', 'narration', `${SLUG}.txt`);
  if (!fs.existsSync(narrationPath)) {
    console.error(`Narration script file not found: ${narrationPath}`);
    process.exit(1);
  }

  const speechScript = fs.readFileSync(narrationPath, 'utf8').trim();
  const chunks = chunkScript(speechScript);
  const totalChars = speechScript.length;
  const projectedTotalCostUSD = (totalChars / 1000) * COST_PER_1K_USD;

  console.log(`========================================`);
  console.log(`ElevenLabs Narration Execution: ${SLUG}`);
  console.log(`Voice ID: ${VOICE_ID} | Model: ${MODEL_ID}`);
  console.log(`Voice Settings: Stability ${VOICE_SETTINGS.stability}, Similarity ${VOICE_SETTINGS.similarity_boost}, Style ${VOICE_SETTINGS.style}, Speaker Boost ${VOICE_SETTINGS.use_speaker_boost}`);
  console.log(`Billed Script Length: ${totalChars} characters | Chunks: ${chunks.length}`);
  console.log(`Projected Total Cost: $${projectedTotalCostUSD.toFixed(4)} USD`);
  console.log(`========================================`);

  const tempDir = path.resolve(__dirname, '..', 'temp_audio', SLUG);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const generatedChunkFiles = [];
  let totalCharsSent = 0;
  let totalCostUSD = 0;

  try {
    for (let i = 0; i < chunks.length; i++) {
      console.log(`\n[Chunk ${i + 1}/${chunks.length}]`);
      const { buffer, charCount, actualCostUSD } = await generateAudioChunk(chunks[i], apiKey);

      const chunkFilePath = path.resolve(tempDir, `chunk_${i + 1}.mp3`);
      fs.writeFileSync(chunkFilePath, buffer);
      generatedChunkFiles.push(chunkFilePath);
      
      totalCharsSent += charCount;
      totalCostUSD += actualCostUSD;

      if (i < chunks.length - 1) {
        await sleep(1500);
      }
    }
  } catch (err) {
    console.error(`\n[GENERATION HALTED]: ${err.message}`);
    process.exit(2);
  }

  // Concatenate MP3 chunks using ffmpeg
  const listFilePath = path.resolve(tempDir, 'mp3_list.txt');
  const fileListContent = generatedChunkFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(listFilePath, fileListContent);

  const voiceOnlyDir = path.resolve(__dirname, '..', 'public', 'audio', 'voice-only');
  if (!fs.existsSync(voiceOnlyDir)) {
    fs.mkdirSync(voiceOnlyDir, { recursive: true });
  }

  const voiceOnlyPath = path.resolve(voiceOnlyDir, `${SLUG}.mp3`);
  console.log(`\nConcatenating ${generatedChunkFiles.length} MP3 files to ${voiceOnlyPath}...`);
  const concatCmd = `"${ffmpeg}" -y -f concat -safe 0 -i "${listFilePath}" -c copy "${voiceOnlyPath}" 2>&1`;
  execSync(concatCmd, { encoding: 'utf8' });

  const finalDurationSec = getAudioDurationInSeconds(voiceOnlyPath);
  const formattedDuration = formatDuration(finalDurationSec);

  console.log(`\n========================================`);
  console.log(`GENERATION SUCCESSFUL!`);
  console.log(`Raw Voice File: ${voiceOnlyPath}`);
  console.log(`Total Character Count Used: ${totalCharsSent}`);
  console.log(`Total Cost: $${totalCostUSD.toFixed(4)} USD`);
  console.log(`Audio Duration: ${formattedDuration} (${finalDurationSec.toFixed(2)} seconds)`);
  console.log(`========================================`);
}

run().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
