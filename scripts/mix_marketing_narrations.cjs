const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const MAPPING = [
  { file: '01-amityville-horror-case.mp3', track: 'investigative-ambient.mp3', out: '01-amityville-horror-case-mixed.mp3' },
  { file: '02-dyatlov-pass-incident.mp3', track: 'investigative-ambient.mp3', out: '02-dyatlov-pass-incident-mixed.mp3' },
  { file: '03-hinterkaifeck-murders.mp3', track: 'investigative-ambient.mp3', out: '03-hinterkaifeck-murders-mixed.mp3' },
  { file: '04-aokigahara-sea-of-trees.mp3', track: 'unresolved-ambient.mp3', out: '04-aokigahara-sea-of-trees-mixed.mp3' },
  { file: '05-balete-drive-white-lady.mp3', track: 'suspense-ambient.mp3', out: '05-balete-drive-white-lady-mixed.mp3' },
  { file: '06-hoichi-the-earless.mp3', track: 'folklore-ambient.mp3', out: '06-hoichi-the-earless-mixed.mp3' },
  { file: '07-okiku-nine-plates.mp3', track: 'folklore-ambient.mp3', out: '07-okiku-nine-plates-mixed.mp3' },
  { file: '08-black-eyed-children-encounter.mp3', track: 'suspense-ambient.mp3', out: '08-black-eyed-children-encounter-mixed.mp3' },
  { file: '09-exorcist-roland-doe.mp3', track: 'folklore-ambient.mp3', out: '09-exorcist-roland-doe-mixed.mp3' },
  { file: '10-sleep-paralysis-demon.mp3', track: 'unresolved-ambient.mp3', out: '10-sleep-paralysis-demon-mixed.mp3' },
  { file: '11-enfield-poltergeist.mp3', track: 'investigative-ambient.mp3', out: '11-enfield-poltergeist-mixed.mp3' }
];

const AMBIENT_VOLUME = 0.15; // standard level matching site narrations

function getDuration(filePath) {
  let output = '';
  try {
    output = execSync(`"${ffmpegPath}" -i "${filePath}" 2>&1`, { encoding: 'utf8' });
  } catch (err) {
    output = err.stdout || err.output?.join('') || '';
  }
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const s = parseFloat(match[3]);
    return h * 3600 + m * 60 + s;
  }
  return 0;
}

const inputDir = path.resolve(__dirname, '..', 'Marketing', 'audio');
const outputDir = path.resolve(inputDir, 'mixed');
const bgMusicDir = path.resolve(__dirname, '..', 'src', 'assets', 'bg-music');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Starting mixing process for 11 marketing audio files...\n');

MAPPING.forEach((item, index) => {
  const narrationPath = path.join(inputDir, item.file);
  const ambientPath = path.join(bgMusicDir, item.track);
  const outputPath = path.join(outputDir, item.out);

  if (!fs.existsSync(narrationPath)) {
    console.error(`[SKIP] Missing narration file: ${narrationPath}`);
    return;
  }
  if (!fs.existsSync(ambientPath)) {
    console.error(`[SKIP] Missing ambient track: ${ambientPath}`);
    return;
  }

  const durationSec = getDuration(narrationPath);
  const fadeOutStart = Math.max(0, durationSec - 3).toFixed(2);
  const durationStr = durationSec.toFixed(2);

  const filterComplex = `"[0:a]aformat=sample_rates=44100:channel_layouts=stereo[vo];[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${AMBIENT_VOLUME},afade=t=in:st=0:d=2,afade=t=out:st=${fadeOutStart}:d=3[bg];[vo][bg]amix=inputs=2:duration=first:normalize=0[aout]"`;

  const cmd = `"${ffmpegPath}" -y -i "${narrationPath}" -stream_loop -1 -i "${ambientPath}" -filter_complex ${filterComplex} -map "[aout]" -c:a libmp3lame -q:a 2 -t ${durationStr} "${outputPath}"`;

  console.log(`[${index + 1}/11] Mixing ${item.file} + ${item.track} -> ${item.out} (${durationStr}s)...`);
  execSync(cmd, { stdio: 'inherit' });
  console.log(`  Saved: ${outputPath}`);
});

console.log('\nMixing complete for all 11 files.');
