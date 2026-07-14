// scripts/experience-audit.js — STEP 1: READ-ONLY inventory audit.
//
// Queries every product via the Admin GraphQL API and writes:
//   • reports/private/experience-classification-audit.json  (full data)
//   • reports/EXPERIENCE_CLASSIFICATION_AUDIT.md             (human summary)
//
// Provisionally classifies each product (classic | deluxe | both |
// needs-review). Performs NO mutations — no metafields are written, nothing is
// published/unpublished, no product field is touched.
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {adminGraphQL} from '../src/shopify-admin.js';
import {redact, safeSummary} from '../src/config.js';
import {fetchAllProducts, classifyAll, summarize} from '../src/experience.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CM_ROOT = join(HERE, '..');
const PRIVATE = join(CM_ROOT, 'reports', 'private');
const REPORTS = join(CM_ROOT, 'reports');

function pct(n, total) {
  return total ? `${((n / total) * 100).toFixed(1)}%` : '0%';
}

async function main() {
  const store = safeSummary();
  console.log('════════════════════════════════════════════════════════════');
  console.log('  EXPERIENCE — STEP 1 · READ-ONLY INVENTORY AUDIT');
  console.log(`  store: ${store.store} · api: ${store.apiVersion}`);
  console.log('  No mutations. No metafields written. Nothing published.');
  console.log('════════════════════════════════════════════════════════════\n');

  console.log('▸ Querying all products (read-only)…');
  const products = await fetchAllProducts(adminGraphQL);
  const rows = classifyAll(products);
  const s = summarize(rows);
  console.log(`  fetched ${rows.length} products\n`);

  // ---- JSON (full machine-readable audit) ----
  mkdirSync(PRIVATE, {recursive: true});
  const generatedAt = new Date().toISOString();
  const jsonPath = join(PRIVATE, 'experience-classification-audit.json');
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt,
        store: store.store,
        apiVersion: store.apiVersion,
        readOnly: true,
        metafield: {namespace: 'custom', key: 'experience'},
        summary: s,
        products: rows,
      },
      null,
      2,
    ),
    'utf8',
  );

  // ---- Markdown (human summary) ----
  const md = [];
  md.push('# Experience Classification Audit (read-only)');
  md.push('');
  md.push(`- Generated: ${generatedAt}`);
  md.push(`- Store: ${store.store} · API ${store.apiVersion}`);
  md.push(`- Products audited: **${s.total}**`);
  md.push('- **No Shopify data was modified** (read-only query only).');
  md.push('');
  md.push('## Provisional classification');
  md.push('');
  md.push('| Experience | Count | Share |');
  md.push('|---|---|---|');
  for (const k of ['classic', 'deluxe', 'both', 'needs-review']) {
    md.push(`| ${k} | ${s.counts[k] || 0} | ${pct(s.counts[k] || 0, s.total)} |`);
  }
  md.push('');
  md.push('## Cross-cuts');
  md.push('');
  md.push(`- Products with an existing \`custom.experience\` value: **${s.withExisting}**`);
  md.push(`- Products associated with **Wedding** collections/type: **${s.weddingAssociated.length}**`);
  md.push(`- Products associated with **Corporate** collections: **${s.corporateAssociated.length}**`);
  md.push(`- Products with incomplete data (no image / placeholder price): **${s.incompleteData.length}**`);
  md.push(`- Duplicate handles: **${s.duplicateHandles.length}**${s.duplicateHandles.length ? ` (${s.duplicateHandles.join(', ')})` : ''}`);
  md.push('');
  md.push('## needs-review products');
  md.push('');
  const nr = rows.filter((r) => r.proposedExperience === 'needs-review');
  if (nr.length) {
    md.push('| Handle | Title | Reason | Flags |');
    md.push('|---|---|---|---|');
    for (const r of nr) md.push(`| ${r.handle} | ${r.title} | ${r.reason} | ${r.flags.join(', ')} |`);
  } else {
    md.push('_None._');
  }
  md.push('');
  md.push('## Full proposed classification');
  md.push('');
  md.push('| Handle | Title | Type | channel | Proposed | Conf. | Reason |');
  md.push('|---|---|---|---|---|---|---|');
  for (const r of rows) {
    md.push(
      `| ${r.handle} | ${r.title} | ${r.productType} | ${r.channel || '—'} | **${r.proposedExperience}** | ${r.confidence} | ${r.reason} |`,
    );
  }
  md.push('');
  md.push('> Classification rules: the imported flower catalogue defaults to **classic**; only finished premium arrangements / luxury gifts become **deluxe**; **both** is used sparingly (finished product also tagged channel:both); Weddings are out of active scope → **needs-review**. Price is never used as a signal.');
  md.push('');
  const mdPath = join(REPORTS, 'EXPERIENCE_CLASSIFICATION_AUDIT.md');
  writeFileSync(mdPath, md.join('\n'), 'utf8');

  console.log('▸ Provisional classification');
  for (const k of ['classic', 'deluxe', 'both', 'needs-review']) {
    console.log(`   ${k.padEnd(14)} ${String(s.counts[k] || 0).padStart(3)}  (${pct(s.counts[k] || 0, s.total)})`);
  }
  console.log(`\n   existing custom.experience values: ${s.withExisting}`);
  console.log(`   wedding-associated: ${s.weddingAssociated.length} · corporate-associated: ${s.corporateAssociated.length}`);
  console.log(`   incomplete data (no image / placeholder price): ${s.incompleteData.length}`);
  console.log('\n✓ Wrote:');
  console.log(`   commerce-manager/reports/private/experience-classification-audit.json`);
  console.log(`   commerce-manager/reports/EXPERIENCE_CLASSIFICATION_AUDIT.md`);
  console.log('\n✓ Read-only. No Shopify data changed.');
}

main().catch((e) => {
  console.error('  ✗ ' + redact(e?.message || String(e)));
  process.exitCode = 1;
});
