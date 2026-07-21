// scripts/images/hero-video.mjs — generate the homepage hero loop with Veo.
//
// Deliberately generates ONE clip per run. Veo bills per second of output, so
// this is not a batch tool and has no "generate N variations" mode.
//
// The prompt is tuned for a HERO BACKGROUND, not a showreel:
//   · locked-off camera — a moving camera makes the loop seam obvious and
//     fights the type sitting on top of it
//   · minimal subject motion — atmosphere, not action
//   · no people — hands and faces are where generated video fails most visibly
//   · muted sage/cream palette — must sit under deep-green type at AA contrast
//
//   npm run video:hero            (dry run — prints the request, spends nothing)
//   npm run video:hero -- --apply (generates; costs real money)
import {writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {loadImageEnv, redact} from './env.mjs';
import {ROOT} from './lib.mjs';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'veo-3.1-fast-generate-preview';
const OUT_DIR = join(ROOT, 'public', 'video');

const PROMPT = [
  'Locked-off static camera, no camera movement.',
  'Soft early-morning sunlight drifting slowly through the glass of a plant-filled greenhouse.',
  'Pale cream and blush peonies with green foliage in the foreground, gently stirring in still air.',
  'Shallow depth of field, creamy bokeh, fine dust motes catching the light.',
  'Muted sage green and warm cream palette, low contrast, calm and unhurried.',
  'Cinematic, editorial, natural light only.',
  'No people, no hands, no text, no captions, no camera motion, no fast movement.',
].join(' ');

const isApply = process.argv.includes('--apply');

async function poll(operationName, key) {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    await new Promise((r) => setTimeout(r, 10_000));
    const res = await fetch(`${API}/${operationName}?key=${key}`);
    const body = await res.json();
    if (body.error) throw new Error(redact(JSON.stringify(body.error)));
    if (body.done) return body;
    process.stdout.write(`  …still rendering (${attempt * 10}s)\r`);
  }
  throw new Error('Timed out after 10 minutes.');
}

async function main() {
  const {apiKey} = loadImageEnv();
  if (!apiKey) {
    console.error('\n  Missing GEMINI_API_KEY in .env.images\n');
    process.exit(1);
  }

  console.log('\nHero video — Veo');
  console.log(
    isApply
      ? '  MODE: APPLY — this generates video and costs money.\n'
      : '  MODE: dry run — nothing is generated. Re-run with --apply.\n',
  );
  console.log(`  model:  ${MODEL}`);
  console.log(`  aspect: 16:9`);
  console.log(`  prompt: ${PROMPT}\n`);

  if (!isApply) {
    console.log('  Dry run complete. No request was sent.\n');
    return;
  }

  console.log('  Submitting…');
  const submit = await fetch(
    `${API}/models/${MODEL}:predictLongRunning?key=${apiKey}`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        instances: [{prompt: PROMPT}],
        parameters: {aspectRatio: '16:9'},
      }),
    },
  );

  if (!submit.ok) {
    throw new Error(redact(`${submit.status}: ${await submit.text()}`));
  }
  const op = await submit.json();
  if (!op.name) throw new Error(redact(`No operation returned: ${JSON.stringify(op)}`));
  console.log(`  operation: ${op.name}`);

  const done = await poll(op.name, apiKey);
  const sample =
    done.response?.generateVideoResponse?.generatedSamples?.[0] ??
    done.response?.generatedSamples?.[0];
  const uri = sample?.video?.uri;
  if (!uri) {
    throw new Error(redact(`No video in response: ${JSON.stringify(done.response)}`));
  }

  console.log('\n  Downloading…');
  const file = await fetch(`${uri}&key=${apiKey}`);
  if (!file.ok) throw new Error(redact(`Download failed: ${file.status}`));
  const bytes = Buffer.from(await file.arrayBuffer());

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, {recursive: true});
  const out = join(OUT_DIR, 'hero-raw.mp4');
  writeFileSync(out, bytes);

  console.log(`  Saved ${out} (${(bytes.length / 1_048_576).toFixed(1)} MB)`);
  console.log('  Next: npm run video:optimize — compress + extract the poster.\n');
}

main().catch((error) => {
  console.error(`\n  Failed: ${error.message}\n`);
  process.exit(1);
});
