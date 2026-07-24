// scripts/images/optimize-video.mjs — turn the raw Veo render into web assets.
//
// Produces, from public/video/hero-raw.mp4:
//   hero-1280.mp4   desktop loop, no audio
//   hero-720.mp4    mobile / narrow loop, no audio
//   hero-poster.webp  first-frame still — the LCP element and the fallback for
//                     reduced-motion, save-data, and any browser that declines
//                     to autoplay
//
// Audio is stripped, not muted: the clip is decorative, and shipping an unused
// audio track is pure weight.
import {execFileSync} from 'node:child_process';
import {existsSync, statSync, unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './lib.mjs';

const DIR = join(ROOT, 'public', 'video');
const RAW = join(DIR, 'hero-raw.mp4');

// Resolved at RUNTIME so a missing binary produces guidance, not a stack trace.
// ffmpeg-static is deliberately NOT a dependency: its Windows postinstall failed
// here (truncated binary, then an EBUSY lock). Prefer an ffmpeg on PATH.
function resolveFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], {stdio: 'pipe'});
    return 'ffmpeg';
  } catch {
    return null;
  }
}
const FFMPEG = resolveFfmpeg();

function run(args) {
  execFileSync(FFMPEG, ['-y', ...args], {stdio: 'pipe'});
}

const mb = (p) => (statSync(p).size / 1_048_576).toFixed(2);

function main() {
  if (!FFMPEG) {
    console.error(
      [
        '',
        '  ffmpeg not found on PATH. Install it, then re-run:',
        '',
        '    winget install Gyan.FFmpeg    (Windows)',
        '    brew install ffmpeg           (macOS)',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  if (!existsSync(RAW)) {
    console.error(`\n  Missing ${RAW}. Run: npm run video:hero -- --apply\n`);
    process.exit(1);
  }

  console.log(`\nHero video — optimize`);
  console.log(`  source: hero-raw.mp4 (${mb(RAW)} MB)\n`);

  for (const [label, width, crf] of [
    ['hero-1280.mp4', 1280, 30],
    ['hero-720.mp4', 720, 32],
  ]) {
    const out = join(DIR, label);
    run([
      '-i', RAW,
      '-an',                       // strip audio entirely
      '-vf', `scale=${width}:-2`,
      '-c:v', 'libx264',
      '-crf', String(crf),
      '-preset', 'slow',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',   // metadata first, so it streams
      out,
    ]);
    console.log(`  ${label.padEnd(16)} ${mb(out)} MB`);
  }

  const poster = join(DIR, 'hero-poster.webp');
  run(['-i', RAW, '-frames:v', '1', '-vf', 'scale=1280:-2', '-quality', '82', poster]);
  console.log(`  ${'hero-poster.webp'.padEnd(16)} ${mb(poster)} MB`);

  // The raw render is large and is never served.
  unlinkSync(RAW);
  console.log(`\n  Removed hero-raw.mp4 (not served).\n`);
}

main();
