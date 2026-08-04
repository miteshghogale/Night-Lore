require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

/**
 * CONFIGURATION & MODEL PARAMETERS
 * NOTE: gemini-3.1-flash-tts-preview is a Preview model.
 * Free tier limit for gemini-3.1-flash-tts: 3 Requests Per Minute (RPM).
 */
const MODEL_NAME = 'gemini-3.1-flash-tts-preview';
const SAFE_CHUNK_LIMIT = 1800; // Safe character limit per API call
const DELAY_BETWEEN_CHUNKS_MS = 22000; // 22s delay to comply with 3 RPM free tier rate limit

const SCENE_CONTEXT = `A true crime documentary narration. Serious, measured, and atmospheric — the tone of a respected investigative journalist telling a real, disturbing story, not a horror-movie voice. Restrained tension rather than melodrama.`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunk text into ~1800 character blocks without breaking paragraphs.
 */
function chunkScript(text) {
  const paragraphs = text.split('\n\n').map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length > SAFE_CHUNK_LIMIT && currentChunk.length > 0) {
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
 * Call Gemini 3.1 Flash TTS API via REST endpoint with robust 429 Rate Limit backoff
 */
async function generateAudioChunk(chunkText, apiKey, maxRetries = 8) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

  const promptText = `Read the following transcript based on the director's note.

# Director's note
Pace: Natural conversational pace. Accent: American (General).
Do not read bracketed tags aloud — interpret them as voice delivery direction only.

## Scene:
${SCENE_CONTEXT}

## Transcript:
${chunkText}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      temperature: 0.5, // Lowered from API default to reduce per-chunk delivery drift
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Fenrir" // Rich, serious male documentary tone
          }
        }
      }
    }
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(90000) // Prevent silent hangs on a stalled request; TTS generation can legitimately take a while
      });

      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        let retrySecs = 30;
        
        // Parse retryDelay if provided in API error details
        const retryInfo = errorData?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
        if (retryInfo?.retryDelay) {
          const matchedSecs = parseInt(retryInfo.retryDelay, 10);
          if (!isNaN(matchedSecs) && matchedSecs > 0) {
            retrySecs = matchedSecs + 5; // Add 5s safety margin
          }
        }
        
        console.warn(`[429 Rate Limit] Attempt ${attempt}/${maxRetries}. Waiting ${retrySecs}s before retry...`);
        await sleep(retrySecs * 1000);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API call failed (${response.status} ${response.statusText}): ${errorText}`);
      }

      const data = await response.json();
      const candidate = data.candidates && data.candidates[0];
      const part = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];
      
      if (!part || !part.inlineData || !part.inlineData.data) {
        throw new Error(`No inline audio data returned from Gemini API: ${JSON.stringify(data)}`);
      }

      return Buffer.from(part.inlineData.data, 'base64');
    } catch (err) {
      const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
      const label = isTimeout ? 'TIMEOUT (90s)' : 'Error';

      if (attempt === maxRetries) {
        throw new Error(`${isTimeout ? 'Request timed out' : err.message} after ${maxRetries} attempts`);
      }
      console.warn(`[API Attempt ${attempt}/${maxRetries} ${label}]: ${isTimeout ? 'No response within 90s' : err.message}. Waiting 15s before retry...`);
      await sleep(15000);
    }
  }

  throw new Error(`Failed to generate audio chunk after ${maxRetries} retries.`);
}

/**
 * Calculate exact MP3 duration using ffmpeg
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
 * Main Generation Pipeline for a single story slug
 */
async function processStory(slug, apiKey) {
  const narrationPath = path.resolve(__dirname, '..', 'src', 'narration', `${slug}.txt`);
  const storyPath = path.resolve(__dirname, '..', 'src', 'content', 'stories', `${slug}.md`);
  const outputDir = path.resolve(__dirname, '..', 'public', 'audio');
  const tempDir = path.resolve(__dirname, '..', 'temp_audio', slug);

  if (!fs.existsSync(narrationPath)) {
    throw new Error(`Narration script not found: ${narrationPath}`);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const rawText = fs.readFileSync(narrationPath, 'utf8').trim();
  const chunks = chunkScript(rawText);

  console.log(`\n========================================`);
  console.log(`Processing story: ${slug}`);
  console.log(`Total script length: ${rawText.length} characters`);
  console.log(`Split into ${chunks.length} chunks`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`========================================`);

  const pcmBuffers = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      console.log(`Pacing rate limit: waiting 22s before chunk ${i + 1}/${chunks.length}...`);
      await sleep(DELAY_BETWEEN_CHUNKS_MS);
    }

    console.log(`[Chunk ${i + 1}/${chunks.length}] Generating audio (${chunks[i].length} chars)...`);
    const pcmBuffer = await generateAudioChunk(chunks[i], apiKey);
    pcmBuffers.push(pcmBuffer);

    // PCM is s16le mono @ 24000 Hz = 48000 bytes/sec; track cumulative offset for boundary reporting
    const priorBytes = pcmBuffers.slice(0, -1).reduce((sum, b) => sum + b.length, 0);
    const boundaryStart = priorBytes / 48000;
    const boundaryEnd = (priorBytes + pcmBuffer.length) / 48000;
    console.log(`  -> chunk ${i + 1} spans ${formatDuration(boundaryStart)}-${formatDuration(boundaryEnd)} (transition into chunk ${i + 2} at ${formatDuration(boundaryEnd)})`);
  }

  // Concatenate all raw PCM buffers directly in memory into one seamless PCM file
  const fullPcmBuffer = Buffer.concat(pcmBuffers);
  const combinedRawPath = path.resolve(tempDir, 'combined.raw');
  fs.writeFileSync(combinedRawPath, fullPcmBuffer);

  // Perform ONE SINGLE WAV/PCM to MP3 conversion pass into temp_audio first
  const tempMp3Path = path.resolve(tempDir, 'output.mp3');
  const finalMp3Path = path.resolve(outputDir, `${slug}.mp3`);
  
  console.log(`Performing single PCM-to-MP3 encoding pass (${fullPcmBuffer.length} bytes PCM)...`);
  
  const ffmpegCmd = `"${ffmpeg}" -y -f s16le -ar 24000 -ac 1 -i "${combinedRawPath}" -acodec libmp3lame -b:a 192k "${tempMp3Path}" 2>&1`;
  const ffmpegOut = execSync(ffmpegCmd, { encoding: 'utf8' });
  console.log(`FFMPEG encoding log:\n${ffmpegOut.trim()}`);

  if (!fs.existsSync(tempMp3Path)) {
    throw new Error(`Failed to generate temp MP3 file at: ${tempMp3Path}`);
  }

  const tempSize = fs.statSync(tempMp3Path).size;
  console.log(`Verified temp MP3 created! Size: ${tempSize} bytes (${(tempSize / 1024 / 1024).toFixed(2)} MB)`);

  // Save persistent backup copy in temp_audio
  const backupMp3Path = path.resolve(__dirname, '..', 'temp_audio', `${slug}.mp3`);
  fs.copyFileSync(tempMp3Path, backupMp3Path);
  console.log(`Saved persistent backup to: ${backupMp3Path}`);

  // Copy to public/audio/[slug].mp3
  fs.copyFileSync(tempMp3Path, finalMp3Path);

  // Stage with git immediately to lock file in working tree
  try {
    execSync(`git add "${finalMp3Path}"`, { stdio: 'ignore' });
  } catch (e) {}

  const finalSize = fs.statSync(finalMp3Path).size;
  console.log(`Copied MP3 to public target! Verified Size: ${finalSize} bytes (${(finalSize / 1024 / 1024).toFixed(2)} MB)`);

  // Calculate actual generated audio duration
  const totalSeconds = getAudioDurationInSeconds(finalMp3Path);
  const formattedDuration = formatDuration(totalSeconds);

  console.log(`\nSUCCESS! Audio generated at: public/audio/${slug}.mp3`);
  console.log(`Actual Audio Duration: ${formattedDuration} (${totalSeconds.toFixed(2)}s)`);

  // Update frontmatter in story markdown file
  if (fs.existsSync(storyPath)) {
    let storyContent = fs.readFileSync(storyPath, 'utf8');
    storyContent = storyContent.replace(/audioUrl:\s*".*?"/, `audioUrl: "/audio/${slug}.mp3"`);
    storyContent = storyContent.replace(/audioDuration:\s*".*?"/, `audioDuration: "${formattedDuration}"`);
    fs.writeFileSync(storyPath, storyContent);
    console.log(`Updated frontmatter in: src/content/stories/${slug}.md`);
  }

  // Clean up temporary files (disabled for inspection)
  // fs.rmSync(tempDir, { recursive: true, force: true });

  return { slug, duration: formattedDuration, seconds: totalSeconds, size: finalSize };
}

// Command Line Execution
const slugArg = process.argv[2] || 'amityville-horror-case';
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('\nERROR: GEMINI_API_KEY environment variable is not set!');
  console.error('Usage: GEMINI_API_KEY="your-api-key" node scripts/generate_narration.cjs [slug]');
  process.exit(1);
}

processStory(slugArg, apiKey)
  .then(res => {
    console.log(`\nPipeline completed for ${res.slug}! Duration: ${res.duration} | Size: ${(res.size / 1024 / 1024).toFixed(2)} MB`);
  })
  .catch(err => {
    console.error('\nPipeline Error:', err);
    process.exit(1);
  });
