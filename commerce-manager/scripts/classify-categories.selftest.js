// classify-categories.selftest.js — OFFLINE self-test. No network, no Shopify, no writes.
import assert from 'node:assert';
import {
  productMatchesRule, productMatchesRuleSet, classifyConfidence, failureReason,
  CATEGORY_SIGNALS, hasTag, hasAnyTag,
} from './classify-categories.js';

let pass = 0;
const ok = (name, fn) => {
  try { fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}: ${e.message}`); process.exitCode = 1; }
};

console.log('── classify-categories self-test (offline) ──');

// Rule matcher.
ok('TAG rule = equals', () => {
  const p = {tags: ['occasion:birthday', 'flower:rose']};
  assert.strictEqual(productMatchesRule(p, {column: 'TAG', relation: 'EQUALS', condition: 'occasion:birthday'}).match, true);
  assert.strictEqual(productMatchesRule(p, {column: 'TAG', relation: 'EQUALS', condition: 'occasion:anniversary'}).match, false);
});
ok('TYPE equals / not_equals', () => {
  const p = {productType: 'Gift Basket'};
  assert.strictEqual(productMatchesRule(p, {column: 'TYPE', relation: 'EQUALS', condition: 'Gift Basket'}).match, true);
  assert.strictEqual(productMatchesRule(p, {column: 'TYPE', relation: 'NOT_EQUALS', condition: 'Plant'}).match, true);
});
ok('TITLE contains', () =>
  assert.strictEqual(productMatchesRule({title: 'Tropical Paradise Bouquet'}, {column: 'TITLE', relation: 'CONTAINS', condition: 'tropical'}).match, true));
ok('unsupported column reported', () =>
  assert.strictEqual(productMatchesRule({}, {column: 'PRODUCT_TAXONOMY_NODE_ID', relation: 'EQUALS', condition: 'x'}).supported, false));

// RuleSet AND/OR.
ok('AND ruleSet requires all', () => {
  const rs = {appliedDisjunctively: false, rules: [{column: 'TYPE', relation: 'EQUALS', condition: 'Plant'}, {column: 'TAG', relation: 'EQUALS', condition: 'occasion:corporate'}]};
  assert.strictEqual(productMatchesRuleSet({productType: 'Plant', tags: ['occasion:corporate']}, rs).match, true);
  assert.strictEqual(productMatchesRuleSet({productType: 'Plant', tags: []}, rs).match, false);
});
ok('OR ruleSet requires any', () => {
  const rs = {appliedDisjunctively: true, rules: [{column: 'TAG', relation: 'EQUALS', condition: 'flower:anthurium'}, {column: 'TAG', relation: 'EQUALS', condition: 'flower:heliconia'}]};
  assert.strictEqual(productMatchesRuleSet({tags: ['flower:heliconia']}, rs).match, true);
  assert.strictEqual(productMatchesRuleSet({tags: ['flower:rose']}, rs).match, false);
});
ok('empty/manual ruleSet → no match, manual flag', () => {
  const r = productMatchesRuleSet({tags: ['x']}, null);
  assert.strictEqual(r.match, false);
  assert.strictEqual(r.manual, true);
});

// The core real-world scenario: tropical products exist but rule uses a tag they lack.
ok('[scenario] tropical product FAILS a mismatched rule, with evidence reason', () => {
  const anthurium = {handle: 'anthurium-stems', title: 'Anthurium Stems', productType: 'Fresh Cut Flowers', tags: ['flower:anthurium-pink']};
  const rule = {appliedDisjunctively: true, rules: [{column: 'TAG', relation: 'EQUALS', condition: 'flower:anthurium'}]};
  assert.strictEqual(productMatchesRuleSet(anthurium, rule).match, false); // taxonomy value differs
  const reason = failureReason(anthurium, rule);
  assert.match(reason, /missing required tag "flower:anthurium"/);
  assert.match(reason, /flower:anthurium-pink/); // shows the actual tags as evidence
});

// Confidence classification.
ok('HIGH from explicit occasion tag', () =>
  assert.strictEqual(classifyConfidence({tags: ['occasion:birthday']}, 'birthday-flowers', new Set()), 'HIGH'));
ok('HIGH from related-collection membership', () =>
  assert.strictEqual(classifyConfidence({tags: [], collections: [{handle: 'birthday'}]}, 'birthday-flowers', new Set(['birthday'])), 'HIGH'));
ok('HIGH gift-baskets from productType', () =>
  assert.strictEqual(classifyConfidence({productType: 'Gift Basket', tags: []}, 'gift-baskets', new Set()), 'HIGH'));
ok('HIGH tropical from canonical flower:tropical-mixed tag', () =>
  assert.strictEqual(classifyConfidence({tags: ['flower:tropical-mixed']}, 'tropical-flowers', new Set()), 'HIGH'));
ok('MEDIUM tropical: title-flagged candidate with a non-tropical flower: tag', () =>
  assert.strictEqual(classifyConfidence({tags: ['flower:orchid'], handle: 'island-modern-tropical-vase', title: 'Island Modern Tropical Vase'}, 'tropical-flowers', new Set()), 'MEDIUM'));
ok('AMBIGUOUS from title keyword only', () =>
  assert.strictEqual(classifyConfidence({handle: 'sunshine-birthday-bouquet', title: 'Sunshine Birthday Bouquet', tags: []}, 'birthday-flowers', new Set()), 'AMBIGUOUS'));

// Signal detection.
ok('CATEGORY_SIGNALS detects tropical by tag and by name', () => {
  assert.strictEqual(CATEGORY_SIGNALS['tropical-flowers']({tags: ['flower:heliconia'], handle: 'x', title: 'X'}), true);
  assert.strictEqual(CATEGORY_SIGNALS['tropical-flowers']({tags: [], handle: 'torch-ginger', title: 'Torch Ginger'}), true);
  assert.strictEqual(CATEGORY_SIGNALS['tropical-flowers']({tags: [], handle: 'red-roses', title: 'Red Roses'}), false);
});
ok('hasTag / hasAnyTag helpers', () => {
  assert.strictEqual(hasTag({tags: ['A:b']}, 'a:b'), true);
  assert.strictEqual(hasAnyTag({tags: ['x']}, ['y', 'x']), true);
});

console.log(`\n${process.exitCode ? '✗ SELF-TEST FAILED' : `✓ SELF-TEST PASSED (${pass} checks)`} — no network, no Shopify, no writes.`);
