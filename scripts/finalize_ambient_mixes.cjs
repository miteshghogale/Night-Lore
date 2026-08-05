const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

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

const AMBIENT_VOLUME = 0.15;

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
  return 0;
}

function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function processAllStories() {
  const publicAudioDir = path.resolve(__dirname, '..', 'public', 'audio');
  const voiceOnlyDir = path.resolve(publicAudioDir, 'voice-only');

  if (!fs.existsSync(voiceOnlyDir)) {
    fs.mkdirSync(voiceOnlyDir, { recursive: true });
  }

  const slugs = Object.keys(TRACK_MAPPING);

  console.log(`================================================================`);
  console.log(`FINALIZING AMBIENT MIXING FOR STORIES (Volume = ${AMBIENT_VOLUME})`);
  console.log(`================================================================\n`);

  for (const slug of slugs) {
    const liveMp3Path = path.resolve(publicAudioDir, `${slug}.mp3`);
    const backupVoicePath = path.resolve(voiceOnlyDir, `${slug}.mp3`);
    const storyMdPath = path.resolve(__dirname, '..', 'src', 'content', 'stories', `${slug}.md`);
    const ambientTrackName = TRACK_MAPPING[slug];
    const ambientPath = path.resolve(__dirname, '..', 'src', 'assets', 'bg-music', ambientTrackName);

    if (!fs.existsSync(liveMp3Path)) {
      console.warn(`[SKIP] No clean narration file found for ${slug}. Removing audioUrl from frontmatter.`);
      if (fs.existsSync(storyMdPath)) {
        let md = fs.readFileSync(storyMdPath, 'utf8');
        md = md.replace(/^audioUrl:\s*".*?"\r?\n/m, '');
        md = md.replace(/^audioDuration:\s*".*?"\r?\n/m, '');
        fs.writeFileSync(storyMdPath, md);
      }
      continue;
    }

    // 1. Back up clean voice-only file if not already backed up
    if (!fs.existsSync(backupVoicePath)) {
      fs.copyFileSync(liveMp3Path, backupVoicePath);
      console.log(`[BACKUP] Clean voice file backed up to: public/audio/voice-only/${slug}.mp3`);
    } else {
      console.log(`[BACKUP EXISTS] Clean voice already present in public/audio/voice-only/${slug}.mp3`);
    }

    // Use clean voice backup as the voice input source for mixing to avoid re-mixing an already mixed file
    const voiceInputPath = backupVoicePath;
    const durationSec = getExactAudioDuration(voiceInputPath);
    if (durationSec === 0) {
      console.error(`[ERROR] Unable to get duration for ${voiceInputPath}`);
      continue;
    }

    const fadeOutStart = Math.max(0, durationSec - 3).toFixed(2);
    const durationStr = durationSec.toFixed(2);
    const formattedDur = formatDuration(durationSec);

    const tempMixedPath = path.resolve(publicAudioDir, `${slug}-temp-mix.mp3`);

    // Filter complex with sample-rate (24kHz) and channel (mono) normalization
    const filterComplex = `"[0:a]aformat=sample_rates=24000:channel_layouts=mono[vo];[1:a]aformat=sample_rates=24000:channel_layouts=mono,volume=${AMBIENT_VOLUME},afade=t=in:st=0:d=2,afade=t=out:st=${fadeOutStart}:d=3[bg];[vo][bg]amix=inputs=2:duration=first:normalize=0[aout]"`;

    const ffmpegCmd = `"${ffmpegPath}" -y -i "${voiceInputPath}" -stream_loop -1 -i "${ambientPath}" -filter_complex ${filterComplex} -map "[aout]" -c:a libmp3lame -q:a 2 -t ${durationStr} "${tempMixedPath}"`;

    console.log(`[MIXING] Processing ${slug}...`);
    console.log(`  Ambient: ${ambientTrackName} | Duration: ${formattedDur} (${durationStr}s)`);
    execSync(ffmpegCmd, { stdio: 'inherit' });

    // Overwrite public live file with mixed version
    fs.copyFileSync(tempMixedPath, liveMp3Path);
    fs.unlinkSync(tempMixedPath);

    const finalSize = fs.statSync(liveMp3Path).size;
    console.log(`[LIVE UPDATED] public/audio/${slug}.mp3 replaced with mixed version (${(finalSize / 1024 / 1024).toFixed(2)} MB)\n`);

    // Update story markdown frontmatter
    if (fs.existsSync(storyMdPath)) {
      let md = fs.readFileSync(storyMdPath, 'utf8');
      if (!md.includes('audioUrl:')) {
        md = md.replace(/^updatedDate:\s*".*?"/m, (match) => `${match}\naudioUrl: "/audio/${slug}.mp3"\naudioDuration: "${formattedDur}"`);
      } else {
        md = md.replace(/audioUrl:\s*".*?"/, `audioUrl: "/audio/${slug}.mp3"`);
        md = md.replace(/audioDuration:\s*".*?"/, `audioDuration: "${formattedDur}"`);
      }
      if (!md.includes('ambientTrack:')) {
        md = md.replace(/audioDuration:\s*".*?"/, (match) => `${match}\nambientTrack: "${ambientTrackName}"`);
      }
      fs.writeFileSync(storyMdPath, md);
    }
  }

  // Cleanup temporary test files
  const testFilesToClean = [
    path.resolve(publicAudioDir, 'amityville-horror-case-mixed.mp3'),
    path.resolve(publicAudioDir, 'test_ambient_only.mp3')
  ];
  for (const tf of testFilesToClean) {
    if (fs.existsSync(tf)) {
      fs.unlinkSync(tf);
    }
  }

  console.log(`================================================================`);
  console.log(`SUCCESS: ALL STORY AUDIO MIXES FINALIZED & DEPLOYABLE`);
  console.log(`================================================================`);
}

processAllStories();
