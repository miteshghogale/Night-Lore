const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// Track mapping per story slug
const TRACK_MAPPING = {
  'amityville-horror-case': 'investigative-ambient.mp3',
  'exorcist-roland-doe': 'folklore-ambient.mp3',
  'the-bell-witch-haunting': 'folklore-ambient.mp3',
  'skinwalker-ranch-anomalies': 'unresolved-ambient.mp3',
  'point-pleasant-mothman': 'investigative-ambient.mp3',
  'enfield-poltergeist': 'investigative-ambient.mp3',
  'sleep-paralysis-demon': 'unresolved-ambient.mp3',
  'black-eyed-children-encounter': 'suspense-ambient.mp3'
};

/**
 * Extract exact duration in seconds from an audio file using ffmpeg
 */
function getExactAudioDuration(filePath) {
  let output = '';
  try {
    output = execSync(`"${ffmpegPath}" -i "${filePath}" 2>&1`, { encoding: 'utf8' });
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
  throw new Error(`Could not determine duration for audio file: ${filePath}`);
}

/**
 * Extract ambientTrack field from markdown frontmatter if present
 */
function getAmbientTrackFromMarkdown(slug) {
  const mdPath = path.resolve(__dirname, '..', 'src', 'content', 'stories', `${slug}.md`);
  if (fs.existsSync(mdPath)) {
    const content = fs.readFileSync(mdPath, 'utf8');
    const match = content.match(/^ambientTrack:\s*"([^"]+)"/m) || content.match(/^ambientTrack:\s*(\S+)/m);
    if (match) {
      return match[1];
    }
  }
  return TRACK_MAPPING[slug];
}

/**
 * Mix background ambient audio into a narration MP3 file
 */
function mixStoryAudio(slug, isTestMode = false) {
  const ambientTrackName = getAmbientTrackFromMarkdown(slug);
  if (!ambientTrackName) {
    throw new Error(`No ambient track assigned for story slug: ${slug}`);
  }

  // Read voice-only narration from public/audio/voice-only/[slug].mp3
  const narrationPath = path.resolve(__dirname, '..', 'public', 'audio', 'voice-only', `${slug}.mp3`);
  const ambientPath = path.resolve(__dirname, '..', 'src', 'assets', 'bg-music', ambientTrackName);
  
  const outputFileName = isTestMode ? `${slug}-mixed.mp3` : `${slug}.mp3`;
  const outputPath = path.resolve(__dirname, '..', 'public', 'audio', outputFileName);

  if (!fs.existsSync(narrationPath)) {
    throw new Error(`Voice-only narration audio file not found: ${narrationPath}`);
  }
  if (!fs.existsSync(ambientPath)) {
    throw new Error(`Ambient track file not found: ${ambientPath}`);
  }

  // Get exact narration duration via ffprobe/ffmpeg
  const durationSec = getExactAudioDuration(narrationPath);
  const fadeOutStart = Math.max(0, durationSec - 3).toFixed(2);
  const durationStr = durationSec.toFixed(2);

  // Volume: 0.15 default (per user specification)
  let ambientVolume = 0.15;
  const volArgIndex = process.argv.indexOf('--volume');
  if (volArgIndex !== -1 && process.argv[volArgIndex + 1]) {
    ambientVolume = parseFloat(process.argv[volArgIndex + 1]);
  }

  // Filter complex:
  // 1. Format narration stream to 44100Hz stereo
  // 2. Resample/format ambient stream to 44100Hz stereo, apply volume scaling (0.15), fade-in 2s, fade-out 3s
  // 3. Mix narration [vo] with ambient [bg] via amix filter (normalize=0)
  const filterComplex = `"[0:a]aformat=sample_rates=44100:channel_layouts=stereo[vo];[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${ambientVolume},afade=t=in:st=0:d=2,afade=t=out:st=${fadeOutStart}:d=3[bg];[vo][bg]amix=inputs=2:duration=first:normalize=0[aout]"`;

  const command = `"${ffmpegPath}" -y -i "${narrationPath}" -stream_loop -1 -i "${ambientPath}" -filter_complex ${filterComplex} -map "[aout]" -c:a libmp3lame -q:a 2 -t ${durationStr} "${outputPath}"`;

  console.log(`\n========================================`);
  console.log(`Processing audio mix for: ${slug}`);
  console.log(`Narration Source: ${narrationPath}`);
  console.log(`Ambient Track: ${ambientTrackName}`);
  console.log(`Exact Duration: ${durationStr}s (${Math.floor(durationSec / 60)}m ${Math.floor(durationSec % 60)}s)`);
  console.log(`Volume Level: ${ambientVolume}`);
  console.log(`Fade In: 2s | Fade Out: 3s starting at ${fadeOutStart}s`);
  console.log(`Output: ${outputPath}`);
  console.log(`========================================\n`);

  execSync(command, { stdio: 'inherit' });

  const fileSize = fs.statSync(outputPath).size;
  console.log(`SUCCESS: Mixed audio created at ${outputPath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
  return { outputPath, durationSec, fileSize };
}

// Command-line handling
const args = process.argv.slice(2);
let targetSlug = 'amityville-horror-case';
let isTestMode = true;

const storyArgIndex = args.indexOf('--story');
if (storyArgIndex !== -1 && args[storyArgIndex + 1]) {
  targetSlug = args[storyArgIndex + 1];
  if (args.includes('--overwrite')) {
    isTestMode = false;
  }
} else if (args.includes('--all')) {
  targetSlug = 'all';
  isTestMode = false;
}

if (targetSlug === 'all') {
  const slugs = Object.keys(TRACK_MAPPING);
  for (const slug of slugs) {
    mixStoryAudio(slug, false);
  }
} else {
  mixStoryAudio(targetSlug, isTestMode);
}

module.exports = { mixStoryAudio };
