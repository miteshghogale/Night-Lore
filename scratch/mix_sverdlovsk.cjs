const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const slug = 'sverdlovsk-anthrax-leak';
const ambientTrackName = 'unresolved-ambient.mp3';
const narrationPath = path.resolve(__dirname, '..', 'public', 'audio', 'voice-only', `${slug}.mp3`);
const ambientPath = path.resolve(__dirname, '..', 'src', 'assets', 'bg-music', ambientTrackName);
const outputPath = path.resolve(__dirname, '..', 'public', 'audio', `${slug}.mp3`);

let output = '';
try {
  output = execSync(`"${ffmpeg}" -i "${narrationPath}" 2>&1`, { encoding: 'utf8' });
} catch (err) {
  output = err.stdout || err.output?.join('') || '';
}

const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
const hours = parseInt(match[1], 10);
const minutes = parseInt(match[2], 10);
const seconds = parseFloat(match[3]);
const durationSec = hours * 3600 + minutes * 60 + seconds;

const fadeOutStart = Math.max(0, durationSec - 3).toFixed(2);
const durationStr = durationSec.toFixed(2);
const ambientVolume = 0.15;

const filterComplex = `"[0:a]aformat=sample_rates=44100:channel_layouts=stereo[vo];[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${ambientVolume},afade=t=in:st=0:d=2,afade=t=out:st=${fadeOutStart}:d=3[bg];[vo][bg]amix=inputs=2:duration=first:normalize=0[aout]"`;

const command = `"${ffmpeg}" -y -i "${narrationPath}" -stream_loop -1 -i "${ambientPath}" -filter_complex ${filterComplex} -map "[aout]" -c:a libmp3lame -q:a 2 -t ${durationStr} "${outputPath}"`;

console.log('Running mix command for Sverdlovsk...');
execSync(command, { stdio: 'inherit' });

const stat = fs.statSync(outputPath);
console.log('SUCCESS! Mixed MP3 created at:', outputPath);
console.log('Size:', stat.size, 'bytes (', (stat.size / 1024 / 1024).toFixed(2), 'MB )');
