/**
 * Wholesale verification — feature flags (Sprint A1).
 *
 * Framework-agnostic: flags are read from a plain env record (Oxygen passes
 * `context.env`; tests pass a literal), never from `process.env` (absent in the
 * Workers runtime). Defaults enforce the sandbox safety posture (docs/ai/15):
 *   - WHOLESALE_SANDBOX_ENABLED  default false
 *   - SHOPIFY_WRITE_ENABLED      default false  (never write to Shopify by default)
 *   - PAYLOAD_RECORDER_ENABLED   default true   (record intended writes instead)
 */
import {ProductionWriteBlockedError} from './errors';

export const FLAG_KEYS = {
  sandboxEnabled: 'WHOLESALE_SANDBOX_ENABLED',
  shopifyWriteEnabled: 'SHOPIFY_WRITE_ENABLED',
  payloadRecorderEnabled: 'PAYLOAD_RECORDER_ENABLED',
} as const;

export interface FeatureFlags {
  sandboxEnabled: boolean;
  shopifyWriteEnabled: boolean;
  payloadRecorderEnabled: boolean;
}

export type FlagEnv = Record<string, string | undefined>;

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const v = value.trim();
  if (v === '') return fallback;
  if (/^(1|true|yes|on)$/i.test(v)) return true;
  if (/^(0|false|no|off)$/i.test(v)) return false;
  return fallback;
}

export function readFeatureFlags(env: FlagEnv = {}): FeatureFlags {
  return {
    sandboxEnabled: parseBool(env[FLAG_KEYS.sandboxEnabled], false),
    shopifyWriteEnabled: parseBool(env[FLAG_KEYS.shopifyWriteEnabled], false),
    payloadRecorderEnabled: parseBool(env[FLAG_KEYS.payloadRecorderEnabled], true),
  };
}

/**
 * Guard every would-be Shopify write. Throws unless SHOPIFY_WRITE_ENABLED is
 * explicitly on. In Sprint A1 there is no Shopify integration at all — this
 * guard exists so that no future code path can write without the flag.
 */
export function assertShopifyWriteAllowed(flags: FeatureFlags): void {
  if (!flags.shopifyWriteEnabled) throw new ProductionWriteBlockedError();
}
