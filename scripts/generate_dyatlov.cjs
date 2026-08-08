require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const SLUG = 'dyatlov-pass-incident';
const VOICE_ID = 'EkK5I93UQWFDigLMpZcX';
const MODEL_ID = 'eleven_multilingual_v2';
const MAX_RETRIES = 1; // 1 initial attempt + 1 retry max = 2 attempts
const SAFE_CHUNK_LIMIT = 1800;
const COST_PER_1K_USD = 0.30;
const SPENDING_CAP_USD = 8.00;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function prepareNarrativeScript(mdContent) {
  const parts = mdContent.split('---');
  if (parts.length < 3) {
    throw new Error('Invalid frontmatter structure in markdown file.');
  }
  const bodyAndTable = parts.slice(2).join('---').trim();
  const narrativeOnly = bodyAndTable.split('## Fact-Checking & Citation Table')[0].trim();

  // Format headers and inline markdown for natural speech synthesis
  let speechText = narrativeOnly
    .replace(/^##\s+(.*)$/gm, '$1.') // Convert section headers to spoken titles with trailing period
    .replace(/\*([^*]+)\*/g, '$1')   // Remove single asterisks (italics)
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove double asterisks (bold)
    .replace(/^>\s*\*"?(.*?)"?\*?$/gm, '$1') // Clean blockquotes
    .replace(/^>\s*/gm, '')           // Clean blockquote symbols
    .replace(/^-\s+\*\*([^*]+)\*\*:\s*/gm, '$1: ') // Format bullet lists naturally
    .replace(/^\d+\.\s+\*\*([^*]+)\*\*:\s*/gm, '$1: ') // Format numbered lists naturally
    .replace(/\s+/g, ' ')
    .trim();

  // Re-insert paragraph breaks
  const rawParagraphs = narrativeOnly.split(/\n\n+/);
  const cleanedParagraphs = rawParagraphs.map(p => {
    return p
      .replace(/^##\s+(.*)$/gm, '$1.')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/^>\s*/gm, '')
      .replace(/^-\s+\*\*([^*]+)\*\*:\s*/gm, '$1: ')
      .replace(/^\d+\.\s+\*\*([^*]+)\*\*:\s*/gm, '$1: ')
      .trim();
  }).filter(Boolean);

  return cleanedParagraphs.join('\n\n');
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
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    }
  };

  const totalAttempts = MAX_RETRIES + 1;
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
      
      if (attempt === totalAttempts) {
        throw new Error(`ElevenLabs generation failed after max limit of ${totalAttempts} attempts. Error: ${err.message}`);
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

  const mdPath = path.resolve(__dirname, '..', 'src', 'content', 'stories', `${SLUG}.md`);
  if (!fs.existsSync(mdPath)) {
    console.error(`Markdown story file not found: ${mdPath}`);
    process.exit(1);
  }

  const rawMd = fs.readFileSync(mdPath, 'utf8');
  const speechScript = prepareNarrativeScript(rawMd);
  const chunks = chunkScript(speechScript);

  console.log(`========================================`);
  console.log(`ElevenLabs Narration Execution: ${SLUG}`);
  console.log(`Voice ID: ${VOICE_ID} | Model: ${MODEL_ID}`);
  console.log(`Billed Script Length: ${speechScript.length} characters | Chunks: ${chunks.length}`);
  console.log(`========================================`);

  const tempDir = path.resolve(__dirname, '..', 'temp_audio', SLUG);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const generatedChunkFiles = [];
  let totalCharsSent = 0;
  let totalCostUSD = 0;

  for (let i = 0; i < chunks.length; i++) {
    console.log(`\n[Chunk ${i + 1}/${chunks.length}]`);
    const { buffer, charCount, actualCostUSD } = await generateAudioChunk(chunks[i], apiKey);
    
    if (totalCostUSD + actualCostUSD > SPENDING_CAP_USD) {
      throw new Error(`SPENDING CAP EXCEEDED ($${(totalCostUSD + actualCostUSD).toFixed(2)} > $${SPENDING_CAP_USD}). Aborting.`);
    }

    const chunkFilePath = path.resolve(tempDir, `chunk_${i + 1}.mp3`);
    fs.writeFileSync(chunkFilePath, buffer);
    generatedChunkFiles.push(chunkFilePath);
    
    totalCharsSent += charCount;
    totalCostUSD += actualCostUSD;

    if (i < chunks.length - 1) {
      await sleep(1500);
    }
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

  const voiceDurationSec = getAudioDurationInSeconds(voiceOnlyPath);
  console.log(`Voice-only audio generated: ${voiceOnlyPath} | Duration: ${formatDuration(voiceDurationSec)} (${voiceDurationSec.toFixed(2)}s)`);

  // Ambient mixing step
  console.log(`\n--- MIXING AMBIENT TRACK ---`);
  const ambientTrackName = 'investigative-ambient.mp3';
  const ambientPath = path.resolve(__dirname, '..', 'src', 'assets', 'bg-music', ambientTrackName);
  const finalOutputPath = path.resolve(__dirname, '..', 'public', 'audio', `${SLUG}.mp3`);

  if (!fs.existsSync(ambientPath)) {
    throw new Error(`Ambient track file not found: ${ambientPath}`);
  }

  const fadeOutStart = Math.max(0, voiceDurationSec - 3).toFixed(2);
  const durationStr = voiceDurationSec.toFixed(2);
  const ambientVolume = 0.15;

  const filterComplex = `"[0:a]aformat=sample_rates=44100:channel_layouts=stereo[vo];[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${ambientVolume},afade=t=in:st=0:d=2,afade=t=out:st=${fadeOutStart}:d=3[bg];[vo][bg]amix=inputs=2:duration=first:normalize=0[aout]"`;
  const mixCmd = `"${ffmpeg}" -y -i "${voiceOnlyPath}" -stream_loop -1 -i "${ambientPath}" -filter_complex ${filterComplex} -map "[aout]" -c:a libmp3lame -q:a 2 -t ${durationStr} "${finalOutputPath}" 2>&1`;

  execSync(mixCmd, { encoding: 'utf8' });

  const finalDurationSec = getAudioDurationInSeconds(finalOutputPath);
  const finalFileSize = fs.statSync(finalOutputPath).size;
  const formattedDuration = formatDuration(finalDurationSec);

  console.log(`\n========================================`);
  console.log(`NARRATION & AMBIENT MIXING COMPLETE:`);
  console.log(`Final Audio File: ${finalOutputPath}`);
  console.log(`File Size: ${(finalFileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${formattedDuration} (${finalDurationSec.toFixed(2)}s)`);
  console.log(`Total Billed Chars: ${totalCharsSent}`);
  console.log(`Total Actual Spend: $${totalCostUSD.toFixed(4)} USD`);
  console.log(`========================================`);

  // Update markdown frontmatter audioUrl & audioDuration
  let updatedMd = fs.readFileSync(mdPath, 'utf8');
  updatedMd = updatedMd.replace(/^audioUrl:\s*".*?"/m, `audioUrl: "/audio/${SLUG}.mp3"`);
  updatedMd = updatedMd.replace(/^audioDuration:\s*".*?"/m, `audioDuration: "${formattedDuration}"`);
  fs.writeFileSync(mdPath, updatedMd);
  console.log(`Updated frontmatter audioUrl and audioDuration (${formattedDuration}) in ${mdPath}`);
}

run().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
