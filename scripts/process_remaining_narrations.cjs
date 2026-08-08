require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

// CONFIGURATION & CONSTANTS
const VOICE_ID = 'EkK5I93UQWFDigLMpZcX';
const MODEL_ID = 'eleven_multilingual_v2';
const MAX_RETRIES_PER_REQUEST = 1; // 1 retry = 2 attempts total max per chunk
const REQUEST_TIMEOUT_MS = 60000; // 60s timeout per call
const SPENDING_CAP_USD = 10.00;
const SPENDING_CAP_INR = 300.00;
const COST_PER_1K_USD = 0.30;
const COST_PER_1K_INR = 8.80;
const AMBIENT_VOLUME = 0.15;

// ARTICLES TO PROCESS IN SEQUENTIAL ORDER
const ARTICLES = [
  { slug: 'aokigahara-sea-of-trees', ambientTrack: 'unresolved-ambient.mp3' },
  { slug: 'balete-drive-white-lady', ambientTrack: 'suspense-ambient.mp3' },
  { slug: 'hoichi-the-earless', ambientTrack: 'folklore-ambient.mp3' },
  { slug: 'okiku-nine-plates', ambientTrack: 'folklore-ambient.mp3' }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeTextForModel(text) {
  return text.replace(/\[[a-zA-Z0-9_\-\s]+\]/g, '').replace(/\s+/g, ' ').trim();
}

function chunkScript(text, limit = 1800) {
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

function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function callElevenLabsApi(text, apiKey, chunkLabel) {
  const sanitizedText = sanitizeTextForModel(text);
  const charCount = sanitizedText.length;
  const costUSD = (charCount / 1000) * COST_PER_1K_USD;
  const costINR = (charCount / 1000) * COST_PER_1K_INR;

  console.log(`\n  [API CALL START - ${chunkLabel}]`);
  console.log(`  - Text Character Count: ${charCount} chars`);
  console.log(`  - Projected Cost: $${costUSD.toFixed(4)} USD (₹${costINR.toFixed(2)} INR)`);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const payload = {
    text: sanitizedText,
    model_id: MODEL_ID,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    }
  };

  const totalAttempts = 1 + MAX_RETRIES_PER_REQUEST; // 2 attempts total max

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      console.log(`  - Attempt ${attempt}/${totalAttempts} sending request to ElevenLabs...`);
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
        throw new Error(`HTTP ${response.status} (${response.statusText}): ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`  - [API SUCCESS] Received ${buffer.length} bytes audio buffer.`);
      return { buffer, charCount, costUSD, costINR };
    } catch (err) {
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const errMsg = isTimeout ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s` : err.message;
      console.warn(`  - [API ATTEMPT ${attempt}/${totalAttempts} FAILED]: ${errMsg}`);

      if (attempt === totalAttempts) {
        throw new Error(`CRITICAL: Request failed after ${totalAttempts} attempt limit. Stopping pipeline. Reason: ${errMsg}`);
      }

      console.log(`  - Waiting 5s before retry (1 retry permitted)...`);
      await sleep(5000);
    }
  }
}

async function processSingleArticle(item, apiKey, runningStats) {
  const { slug, ambientTrack } = item;
  console.log(`\n================================================================`);
  console.log(`PROCESSING ARTICLE: ${slug}`);
  console.log(`Ambient Track: ${ambientTrack}`);
  console.log(`================================================================`);

  const projectRoot = path.resolve(__dirname, '..');
  const narrationPath = path.resolve(projectRoot, 'src', 'narration', `${slug}.txt`);
  const storyMdPath = path.resolve(projectRoot, 'src', 'content', 'stories', `${slug}.md`);
  const voiceOnlyDir = path.resolve(projectRoot, 'public', 'audio', 'voice-only');
  const publicAudioDir = path.resolve(projectRoot, 'public', 'audio');
  const tempDir = path.resolve(projectRoot, 'temp_audio', slug);

  if (!fs.existsSync(narrationPath)) throw new Error(`Narration script missing: ${narrationPath}`);
  if (!fs.existsSync(storyMdPath)) throw new Error(`Story markdown missing: ${storyMdPath}`);
  if (!fs.existsSync(voiceOnlyDir)) fs.mkdirSync(voiceOnlyDir, { recursive: true });
  if (!fs.existsSync(publicAudioDir)) fs.mkdirSync(publicAudioDir, { recursive: true });
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const rawText = fs.readFileSync(narrationPath, 'utf8').trim();
  const chunks = chunkScript(rawText);
  console.log(`Script loaded: ${rawText.length} raw chars | ${chunks.length} chunk(s)`);

  const generatedChunkFiles = [];
  let storyCharsSent = 0;
  let storySpendUSD = 0;
  let storySpendINR = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunkLabel = `Article: ${slug} | Chunk ${i + 1}/${chunks.length}`;
    const result = await callElevenLabsApi(chunks[i], apiKey, chunkLabel);

    runningStats.apiCalls += 1;
    runningStats.totalChars += result.charCount;
    runningStats.totalSpendUSD += result.costUSD;
    runningStats.totalSpendINR += result.costINR;

    storyCharsSent += result.charCount;
    storySpendUSD += result.costUSD;
    storySpendINR += result.costINR;

    const chunkPath = path.resolve(tempDir, `chunk_${i + 1}.mp3`);
    fs.writeFileSync(chunkPath, result.buffer);
    generatedChunkFiles.push(chunkPath);

    // CHECK SPENDING CAP IMMEDIATELY AFTER EVERY API CALL
    if (runningStats.totalSpendUSD >= SPENDING_CAP_USD || runningStats.totalSpendINR >= SPENDING_CAP_INR) {
      throw new Error(`SPENDING CAP REACHED ($${runningStats.totalSpendUSD.toFixed(2)} USD / ₹${runningStats.totalSpendINR.toFixed(2)} INR). HALTING EXECUTION IMMEDIATELY.`);
    }

    if (i < chunks.length - 1) {
      console.log(`  - Delaying 2s between chunks...`);
      await sleep(2000);
    }
  }

  // 1. Concatenate voice chunks into clean voice-only file
  const voiceOnlyMp3Path = path.resolve(voiceOnlyDir, `${slug}.mp3`);
  if (generatedChunkFiles.length === 1) {
    fs.copyFileSync(generatedChunkFiles[0], voiceOnlyMp3Path);
  } else {
    const listFilePath = path.resolve(tempDir, 'mp3_list.txt');
    const listContent = generatedChunkFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(listFilePath, listContent);
    const concatCmd = `"${ffmpeg}" -y -f concat -safe 0 -i "${listFilePath}" -c copy "${voiceOnlyMp3Path}" 2>&1`;
    execSync(concatCmd, { stdio: 'pipe' });
  }

  // Verify voice-only MP3
  const voiceOnlySize = fs.statSync(voiceOnlyMp3Path).size;
  const voiceOnlyDur = getAudioDurationInSeconds(voiceOnlyMp3Path);
  console.log(`\n[VOICE ONLY SAVED]: ${voiceOnlyMp3Path}`);
  console.log(`  - File Size: ${(voiceOnlySize / 1024 / 1024).toFixed(2)} MB (${voiceOnlySize} bytes)`);
  console.log(`  - Audio Duration: ${formatDuration(voiceOnlyDur)} (${voiceOnlyDur.toFixed(2)}s)`);

  if (voiceOnlySize < 100000 || voiceOnlyDur < 10) {
    throw new Error(`Generated voice audio for ${slug} is invalid or incomplete (Size: ${voiceOnlySize}, Dur: ${voiceOnlyDur})`);
  }

  // 2. Mix ambient track
  const ambientPath = path.resolve(projectRoot, 'src', 'assets', 'bg-music', ambientTrack);
  if (!fs.existsSync(ambientPath)) throw new Error(`Ambient track file missing: ${ambientPath}`);

  const liveMp3Path = path.resolve(publicAudioDir, `${slug}.mp3`);
  const fadeOutStart = Math.max(0, voiceOnlyDur - 3).toFixed(2);
  const durationStr = voiceOnlyDur.toFixed(2);

  const filterComplex = `"[0:a]aformat=sample_rates=24000:channel_layouts=mono[vo];[1:a]aformat=sample_rates=24000:channel_layouts=mono,volume=${AMBIENT_VOLUME},afade=t=in:st=0:d=2,afade=t=out:st=${fadeOutStart}:d=3[bg];[vo][bg]amix=inputs=2:duration=first:normalize=0[aout]"`;
  const ffmpegCmd = `"${ffmpeg}" -y -i "${voiceOnlyMp3Path}" -stream_loop -1 -i "${ambientPath}" -filter_complex ${filterComplex} -map "[aout]" -c:a libmp3lame -q:a 2 -t ${durationStr} "${liveMp3Path}"`;

  console.log(`\n[AMBIENT MIXING]: Mixing voice with ${ambientTrack}...`);
  execSync(ffmpegCmd, { stdio: 'pipe' });

  // 3. Confirm output file exists and is valid
  if (!fs.existsSync(liveMp3Path)) {
    throw new Error(`Output mixed audio file does not exist at ${liveMp3Path}`);
  }

  const liveSize = fs.statSync(liveMp3Path).size;
  const liveDur = getAudioDurationInSeconds(liveMp3Path);
  const formattedDur = formatDuration(liveDur);

  console.log(`[VERIFICATION CONFIRMED]: ${liveMp3Path}`);
  console.log(`  - Size: ${(liveSize / 1024 / 1024).toFixed(2)} MB (${liveSize} bytes)`);
  console.log(`  - Duration: ${formattedDur} (${liveDur.toFixed(2)}s)`);

  if (liveSize < 500000 || liveDur < 10) {
    throw new Error(`Output mixed MP3 failed validation for ${slug} (Size: ${liveSize}, Dur: ${liveDur})`);
  }

  // 4. Update story frontmatter
  let mdContent = fs.readFileSync(storyMdPath, 'utf8');
  if (!mdContent.includes('audioUrl:')) {
    mdContent = mdContent.replace(/^updatedDate:\s*".*?"/m, match => `${match}\naudioUrl: "/audio/${slug}.mp3"\naudioDuration: "${formattedDur}"`);
    if (!mdContent.includes('audioUrl:')) {
      mdContent = mdContent.replace(/^pubDate:\s*".*?"/m, match => `${match}\naudioUrl: "/audio/${slug}.mp3"\naudioDuration: "${formattedDur}"`);
    }
  } else {
    mdContent = mdContent.replace(/audioUrl:\s*".*?"/, `audioUrl: "/audio/${slug}.mp3"`);
    mdContent = mdContent.replace(/audioDuration:\s*".*?"/, `audioDuration: "${formattedDur}"`);
  }

  if (!mdContent.includes('ambientTrack:')) {
    mdContent = mdContent.replace(/audioDuration:\s*".*?"/, match => `${match}\nambientTrack: "${ambientTrack}"`);
  } else {
    mdContent = mdContent.replace(/ambientTrack:\s*".*?"/, `ambientTrack: "${ambientTrack}"`);
  }

  fs.writeFileSync(storyMdPath, mdContent);
  console.log(`[FRONTMATTER UPDATED]: ${storyMdPath}`);

  return {
    slug,
    charsSent: storyCharsSent,
    spendUSD: storySpendUSD,
    spendINR: storySpendINR,
    duration: formattedDur,
    sizeMB: (liveSize / 1024 / 1024).toFixed(2)
  };
}

async function runPipeline() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ELEVENLABS_API_KEY not found!');
    process.exit(1);
  }

  console.log(`================================================================`);
  console.log(`STARTING ELEVENLABS TTS & AMBIENT MIX PIPELINE (STEP 2)`);
  console.log(`- Voice ID: ${VOICE_ID}`);
  console.log(`- Model: ${MODEL_ID}`);
  console.log(`- Max Retries Per Call: ${MAX_RETRIES_PER_REQUEST} (2 attempts total)`);
  console.log(`- Spending Cap: $${SPENDING_CAP_USD.toFixed(2)} USD / ₹${SPENDING_CAP_INR.toFixed(2)} INR`);
  console.log(`- Total Articles to process: ${ARTICLES.length}`);
  console.log(`================================================================`);

  const runningStats = {
    apiCalls: 0,
    totalChars: 0,
    totalSpendUSD: 0,
    totalSpendINR: 0
  };

  const results = [];

  for (let idx = 0; idx < ARTICLES.length; idx++) {
    const article = ARTICLES[idx];
    console.log(`\n>>> STARTING ARTICLE ${idx + 1} OF ${ARTICLES.length}: ${article.slug}`);

    try {
      const res = await processSingleArticle(article, apiKey, runningStats);
      results.push(res);

      console.log(`\n================================================================`);
      console.log(`RUNNING TOTAL AFTER ARTICLE ${idx + 1} (${article.slug}):`);
      console.log(`- Total API Calls Made: ${runningStats.apiCalls}`);
      console.log(`- Total Characters Processed: ${runningStats.totalChars}`);
      console.log(`- Running Spend Total: $${runningStats.totalSpendUSD.toFixed(4)} USD | ₹${runningStats.totalSpendINR.toFixed(2)} INR`);
      console.log(`- Spending Cap Remaining: $${(SPENDING_CAP_USD - runningStats.totalSpendUSD).toFixed(4)} USD`);
      console.log(`================================================================`);
    } catch (err) {
      console.error(`\n[FATAL ERROR] Processing failed for ${article.slug}:`, err.message);
      console.error(`Stopping execution. Processed ${results.length} of ${ARTICLES.length} articles.`);
      process.exit(1);
    }
  }

  console.log(`\n================================================================`);
  console.log(`ALL ${ARTICLES.length} ARTICLES NARRATED AND MIXED SUCCESSFULLY!`);
  console.log(`================================================================`);
  console.table(results);
}

runPipeline().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
