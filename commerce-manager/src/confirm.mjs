// Interactive confirmation for state-changing operations.
import readline from 'node:readline';

export function ask(question) {
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  return new Promise((res) => rl.question(question, (a) => (rl.close(), res(a))));
}

/**
 * Gate a mutation. Returns true only when the caller passed --commit AND the user
 * types the exact confirmation phrase. In dry-run (default) it returns false.
 */
export async function confirmMutation(ctx, {action, phrase}) {
  if (!ctx.commit) return false; // dry-run default → never mutate
  if (ctx.yes) return true; // explicit non-interactive override
  const answer = await ask(`\nType "${phrase}" to ${action} (anything else cancels): `);
  return answer.trim() === phrase;
}
