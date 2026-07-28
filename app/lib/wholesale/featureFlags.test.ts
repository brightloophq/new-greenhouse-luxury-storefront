import {describe, expect, it} from 'vitest';
import {
  FLAG_KEYS,
  readFeatureFlags,
  assertShopifyWriteAllowed,
} from './featureFlags';
import {ProductionWriteBlockedError} from './errors';

describe('feature flags — defaults', () => {
  it('applies the safe defaults when env is empty', () => {
    const flags = readFeatureFlags({});
    expect(flags.sandboxEnabled).toBe(false);
    expect(flags.shopifyWriteEnabled).toBe(false); // never write by default
    expect(flags.payloadRecorderEnabled).toBe(true); // record instead
  });

  it('applies defaults when env is omitted entirely', () => {
    expect(readFeatureFlags()).toEqual({
      sandboxEnabled: false,
      shopifyWriteEnabled: false,
      payloadRecorderEnabled: true,
    });
  });
});

describe('feature flags — parsing', () => {
  it('parses truthy values', () => {
    for (const v of ['true', '1', 'yes', 'on', 'TRUE', ' On ']) {
      expect(readFeatureFlags({[FLAG_KEYS.sandboxEnabled]: v}).sandboxEnabled).toBe(
        true,
      );
    }
  });

  it('parses falsy values', () => {
    for (const v of ['false', '0', 'no', 'off', 'FALSE']) {
      expect(
        readFeatureFlags({[FLAG_KEYS.payloadRecorderEnabled]: v})
          .payloadRecorderEnabled,
      ).toBe(false);
    }
  });

  it('falls back to the default on empty or unrecognised values', () => {
    expect(
      readFeatureFlags({[FLAG_KEYS.payloadRecorderEnabled]: ''})
        .payloadRecorderEnabled,
    ).toBe(true);
    expect(
      readFeatureFlags({[FLAG_KEYS.shopifyWriteEnabled]: 'maybe'})
        .shopifyWriteEnabled,
    ).toBe(false);
  });

  it('reads each flag from its documented key independently', () => {
    const flags = readFeatureFlags({
      [FLAG_KEYS.sandboxEnabled]: 'true',
      [FLAG_KEYS.shopifyWriteEnabled]: 'true',
      [FLAG_KEYS.payloadRecorderEnabled]: 'false',
    });
    expect(flags).toEqual({
      sandboxEnabled: true,
      shopifyWriteEnabled: true,
      payloadRecorderEnabled: false,
    });
  });
});

describe('assertShopifyWriteAllowed', () => {
  it('throws when writes are disabled (the default)', () => {
    expect(() => assertShopifyWriteAllowed(readFeatureFlags({}))).toThrow(
      ProductionWriteBlockedError,
    );
  });

  it('passes only when explicitly enabled', () => {
    const flags = readFeatureFlags({[FLAG_KEYS.shopifyWriteEnabled]: 'true'});
    expect(() => assertShopifyWriteAllowed(flags)).not.toThrow();
  });
});
