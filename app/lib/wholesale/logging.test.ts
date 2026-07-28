import {describe, expect, it, vi} from 'vitest';
import {
  REDACTED,
  redact,
  createConsoleLogger,
  createNoopLogger,
  createAuditEvent,
} from './logging';

describe('redact', () => {
  it('replaces sensitive keys and preserves the rest', () => {
    const input = {
      tradingName: 'The New Greenhouse',
      trn: '123-456-789',
      email: 'owner@example.com',
      phone: '876-000-0000',
      businessType: 'florist',
    };
    expect(redact(input)).toEqual({
      tradingName: 'The New Greenhouse',
      trn: REDACTED,
      email: REDACTED,
      phone: REDACTED,
      businessType: 'florist',
    });
  });

  it('redacts nested objects and arrays without mutating the input', () => {
    const input = {
      application: {id: 'a1', business: {trn: 'secret', tradingName: 'X'}},
      contacts: [{email: 'a@b.com', contactName: 'Ana'}],
    };
    const out = redact(input) as typeof input;
    expect(out.application.business.trn).toBe(REDACTED);
    expect(out.application.business.tradingName).toBe('X');
    expect(out.contacts[0].email).toBe(REDACTED);
    expect(out.contacts[0].contactName).toBe('Ana');
    // input untouched
    expect(input.application.business.trn).toBe('secret');
  });

  it('honours a custom sensitive-key list', () => {
    expect(redact({secretCode: 'x', name: 'y'}, ['secretCode'])).toEqual({
      secretCode: REDACTED,
      name: 'y',
    });
  });

  it('passes primitives through unchanged', () => {
    expect(redact('hello')).toBe('hello');
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
  });
});

describe('createConsoleLogger', () => {
  it('redacts sensitive context before writing to the sink', () => {
    const info = vi.fn();
    const sink = {debug: vi.fn(), info, warn: vi.fn(), error: vi.fn()};
    const logger = createConsoleLogger(sink);
    logger.log({
      level: 'info',
      message: 'application received',
      at: '2026-07-28T10:00:00.000Z',
      context: {trn: '123', tradingName: 'TNG'},
    });
    expect(info).toHaveBeenCalledTimes(1);
    const [, payload] = info.mock.calls[0];
    expect(payload.context).toEqual({trn: REDACTED, tradingName: 'TNG'});
  });
});

describe('createNoopLogger', () => {
  it('never throws', () => {
    const logger = createNoopLogger();
    expect(() =>
      logger.log({level: 'error', message: 'x', at: 'now'}),
    ).not.toThrow();
  });
});

describe('createAuditEvent', () => {
  it('builds an append-only audit record', () => {
    const event = createAuditEvent({
      id: 'audit-1',
      applicationId: 'app-1',
      actor: 'SYSTEM',
      action: 'BEGIN_CHECKS',
      at: '2026-07-28T10:00:00.000Z',
      fromStatus: 'SUBMITTED',
      toStatus: 'PENDING',
    });
    expect(event).toMatchObject({
      id: 'audit-1',
      applicationId: 'app-1',
      actor: 'SYSTEM',
      action: 'BEGIN_CHECKS',
      fromStatus: 'SUBMITTED',
      toStatus: 'PENDING',
    });
  });
});
