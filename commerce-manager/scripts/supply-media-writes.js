// Attach validated product images to the 10 published-but-imageless Floral
// Supply products. IMAGE-ONLY writes (productCreateMedia). No price / inventory
// / description / dimension / collection changes. DRY-RUN by default; --commit
// to write. Rollback manifest captures prior media state.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {adminGraphQL} from '../src/shopify-admin.js';

const CM = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = join(CM, '..');
const UP = join(ROOT, 'source-images', 'supplies', '_upload');
const COMMIT = process.argv.includes('--commit');
const ts = process.env.NOW_TS || 'manual';

// handle -> {alt}. Upload file is source-images/supplies/_upload/<handle>.webp
const PRODUCTS = {
  'wet-floral-foam-bricks': 'Blocks of wet floral foam bricks',
  'glass-cylinder-vase': 'Clear glass cylinder florist vase',
  'bud-vase-set': 'A set of small clear glass bud vases',
  'satin-ribbon': 'Rolls of satin florist ribbon in ivory and blush',
  'organza-ribbon': 'Rolls of sheer organza florist ribbon',
  'kraft-cellophane-wrap': 'Rolls of kraft and cellophane floral wrapping material',
  'woven-arrangement-basket': 'A woven wicker arrangement basket with a handle',
  'floral-stem-tape': 'Rolls of green and brown floral stem tape',
  'florist-shears-snips': 'A pair of stainless-steel florist shears',
  'bouquet-presentation-boxes': 'Kraft and ivory bouquet presentation boxes',
};

const ue = (o) => (o?.userErrors || o?.mediaUserErrors || []).map((e) => e.message).join('; ');
const BY_HANDLE = `#graphql
  query($q:String!){ products(first:1, query:$q){ nodes{ id handle title status featuredImage{ url } mediaCount{ count } } } }`;
const STAGED = `#graphql
  mutation($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`;
const CREATE_MEDIA = `#graphql
  mutation($productId:ID!, $media:[CreateMediaInput!]!){ productCreateMedia(productId:$productId, media:$media){ media{ ...on MediaImage{ id } status } mediaUserErrors{ field message } } }`;

const byHandle = async (h) => (await adminGraphQL(BY_HANDLE, {q: `handle:${h}`})).products.nodes[0] || null;

async function stageImage(absPath, filename) {
  const st = await adminGraphQL(STAGED, {input: [{filename, mimeType: 'image/webp', resource: 'IMAGE', httpMethod: 'POST'}]});
  if (ue(st.stagedUploadsCreate)) throw new Error(ue(st.stagedUploadsCreate));
  const t = st.stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([readFileSync(absPath)], {type: 'image/webp'}), filename);
  const res = await fetch(t.url, {method: 'POST', body: form});
  if (res.status < 200 || res.status >= 300) throw new Error(`staged HTTP ${res.status}`);
  return t.resourceUrl;
}

async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  SUPPLY MEDIA WRITES — ${COMMIT ? 'LIVE COMMIT' : 'DRY-RUN'} (image-only)`);
  console.log('════════════════════════════════════════════════════════════');

  // Resolve products + build rollback manifest.
  const rollback = {};
  const plan = [];
  for (const [h, alt] of Object.entries(PRODUCTS)) {
    const p = await byHandle(h);
    if (!p) { console.log(`   ! ${h}: NOT FOUND — skip`); continue; }
    rollback[h] = {id: p.id, title: p.title, mediaCount: p.mediaCount.count, hadImage: !!p.featuredImage?.url};
    if (p.mediaCount.count > 0) { console.log(`   • ${h}: already has media (${p.mediaCount.count}) — skip`); continue; }
    plan.push({h, id: p.id, alt});
  }

  const rbDir = join(CM, 'rollback');
  mkdirSync(rbDir, {recursive: true});
  const rbPath = join(rbDir, `supply-media-${ts}.json`);
  writeFileSync(rbPath, JSON.stringify({when: ts, products: rollback}, null, 2));
  console.log(`\n  rollback manifest → ${rbPath}`);
  console.log(`  to attach: ${plan.length} · ${plan.map((x) => x.h).join(', ')}`);

  if (!COMMIT) { console.log('\n  DRY-RUN — no writes. Re-run with --commit.'); return; }

  console.log('\n── attaching media ──');
  let ok = 0, err = 0;
  for (const {h, id, alt} of plan) {
    try {
      const resourceUrl = await stageImage(join(UP, `${h}.webp`), `${h}.webp`);
      const m = await adminGraphQL(CREATE_MEDIA, {
        productId: id,
        media: [{originalSource: resourceUrl, alt, mediaContentType: 'IMAGE'}],
      });
      if (ue(m.productCreateMedia)) throw new Error(ue(m.productCreateMedia));
      ok++; console.log(`   ✓ ${h}`);
    } catch (e) { err++; console.error(`   ✗ ${h}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log(`\n  DONE — attached ${ok} · errors ${err}`);
}
main().catch((e) => { console.error('  ✗ ' + (e?.message || String(e))); process.exitCode = 1; });
