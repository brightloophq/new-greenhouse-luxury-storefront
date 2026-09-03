// sprint-poll.selftest.js — offline async tests for the smart-collection convergence poller.
// No network, no real delay (waitFn is a no-op). Exit 0 = all pass, 1 = any fail.
//
import {pollForConvergence} from './sprint-io.js';

let passed = 0, failed = 0;
const fails = [];
function ok(name, cond) { if (cond) passed++; else { failed++; fails.push(name); console.error(`  ✗ ${name}`); } }

const instant = async () => {}; // no real waiting in tests

async function main() {
  // 1) immediate convergence — target on the first read, no waits
  {
    let calls = 0;
    const waits = [];
    const r = await pollForConvergence(async () => { calls++; return 16; }, 16, {attempts: 8, waitFn: async (ms) => { waits.push(ms); }});
    ok('immediate: converged', r.converged === true);
    ok('immediate: exactly 1 attempt', r.attempts === 1);
    ok('immediate: read once', calls === 1);
    ok('immediate: never waited', waits.length === 0);
    ok('immediate: lastValue is target', r.lastValue === 16);
  }

  // 2) delayed convergence — wrong twice, then correct on the 3rd poll
  {
    const seq = [27, 20, 16, 16];
    let i = 0;
    const waits = [];
    const r = await pollForConvergence(async () => seq[i++], 16, {attempts: 8, baseDelayMs: 1000, maxDelayMs: 8000, waitFn: async (ms) => { waits.push(ms); }});
    ok('delayed: converged', r.converged === true);
    ok('delayed: converged on 3rd attempt', r.attempts === 3);
    ok('delayed: waited exactly twice (between the 3 reads)', waits.length === 2);
    ok('delayed: exponential backoff 1000 then 2000', waits[0] === 1000 && waits[1] === 2000);
    ok('delayed: history records the climb', r.history.join(',') === '27,20,16');
  }

  // 3) timeout — never converges within the bounded window
  {
    let calls = 0;
    const waits = [];
    const r = await pollForConvergence(async () => { calls++; return 27; }, 16, {attempts: 4, baseDelayMs: 1000, maxDelayMs: 8000, waitFn: async (ms) => { waits.push(ms); }});
    ok('timeout: NOT converged', r.converged === false);
    ok('timeout: used all attempts', r.attempts === 4);
    ok('timeout: read once per attempt', calls === 4);
    ok('timeout: waited between attempts only (attempts-1)', waits.length === 3);
    ok('timeout: lastValue is the stuck value', r.lastValue === 27);
  }

  // 4) backoff cap — delay never exceeds maxDelayMs
  {
    const waits = [];
    await pollForConvergence(async () => 1, 999, {attempts: 6, baseDelayMs: 1000, maxDelayMs: 3000, waitFn: async (ms) => { waits.push(ms); }});
    ok('backoff cap: no wait exceeds maxDelayMs', waits.every((w) => w <= 3000));
    ok('backoff cap: later waits are capped at 3000', waits[waits.length - 1] === 3000);
  }

  console.log(`\nsprint-poll.selftest: ${passed} passed, ${failed} failed`);
  if (failed) { console.error('FAILURES:\n  - ' + fails.join('\n  - ')); process.exit(1); }
  console.log('✓ convergence poller: immediate / delayed / timeout / backoff-cap all pass (offline)');
}

main().catch((e) => { console.error('  ✗ ' + (e?.message || e)); process.exit(1); });
