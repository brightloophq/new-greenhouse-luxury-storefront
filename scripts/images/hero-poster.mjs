// scripts/images/hero-poster.mjs — the hero video's poster still.
//
// WHY THIS IS GENERATED RATHER THAN EXTRACTED
// The poster is normally frame 0 of the video, pulled with ffmpeg. ffmpeg could
// not be installed in this environment (truncated binary, then an EBUSY lock),
// so the poster is generated from a prompt that mirrors the video's, giving a
// still with the same scene, palette and light.
//
// It is not a pixel-exact first frame, so the poster→video handoff is a soft
// cross-fade rather than a seamless swap. Once ffmpeg is available, replace
// this with a real frame extraction (see optimize-video.mjs) and the handoff
// becomes invisible.
//
//   npm run video:poster            (dry run)
//   npm run video:poster -- --apply (generates)
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import sharp from 'sharp';
import {generateImage} from './gemini-client.mjs';
import {ROOT} from './lib.mjs';

const OUT = join(ROOT, 'public', 'video');

const PROMPT = [
  'Still photograph, locked-off camera at eye level.',
  'Soft early-morning sunlight through the glass of a plant-filled greenhouse.',
  'Pale cream and blush peonies with green foliage in the foreground.',
  'Shallow depth of field, creamy bokeh, fine dust motes in the light.',
  'Muted sage green and warm cream palette, low contrast, calm and unhurried.',
  'Cinematic, editorial, natural light only.',
  'No people, no hands, no text.',
].join(' ');

const isApply = process.argv.includes('--apply');

async function main() {
  console.log('\nHero poster');
  console.log(isApply ? '  MODE: APPLY\n' : '  MODE: dry run — re-run with --apply\n');
  console.log(`  prompt: ${PROMPT}\n`);
  if (!isApply) return;

  const result = await generateImage({
    prompt: PROMPT,
    negativePrompt: 'people, hands, text, watermark, harsh light, saturated colours',
    aspectRatio: '16:9',
  });

  if (result.dryRun) {
    console.error(
      '  Client is in dry-run mode. Set IMAGE_GENERATION_DRY_RUN=false in\n' +
        '  .env.images, or run with IMAGE_GENERATION_DRY_RUN=false prefixed.\n',
    );
    process.exit(1);
  }
  if (!result.ok) {
    console.error(`  ${result.error}\n`);
    process.exit(1);
  }

  // WebP at the video's own dimensions so the poster and video occupy exactly
  // the same box — no layout shift on handoff.
  const out = join(OUT, 'hero-poster.webp');
  await sharp(Buffer.from(result.bytesBase64, 'base64'))
    .resize(1280, 720, {fit: 'cover'})
    .webp({quality: 82})
    .toFile(out);

  const {statSync} = await import('node:fs');
  console.log(`  wrote hero-poster.webp (${(statSync(out).size / 1024).toFixed(0)} KB)\n`);
}

main().catch((error) => {
  console.error(`\n  Failed: ${error.message}\n`);
  process.exit(1);
});
