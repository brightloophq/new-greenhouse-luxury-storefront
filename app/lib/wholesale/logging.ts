/**
 * Wholesale verification — structured logging + audit foundations (Sprint A1).
 *
 * Sensitive fields are redacted from every log context so PII (TRN, email,
 * phone, registration number) can never leak into logs (docs/ai/07, docs/ai/15).
 * The audit trail is append-only and lives in a repository (see ./repositories).
 */
import type {
  Actor,
  ApplicationEvent,
  ApplicationStatus,
  AuditEvent,
} from './types';
import {SENSITIVE_FIELDS} from './types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  at: string;
  context?: Record<string, unknown>;
}

export interface Logger {
  log(entry: LogEntry): void;
}

export const REDACTED = '[REDACTED]';

/**
 * Deep-clone `value`, replacing any property whose key is in `sensitiveKeys`
 * with `[REDACTED]`. Non-mutating; handles nested objects and arrays.
 */
export function redact(
  value: unknown,
  sensitiveKeys: readonly string[] = SENSITIVE_FIELDS,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, sensitiveKeys));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sensitiveKeys.includes(key)
        ? REDACTED
        : redact(val, sensitiveKeys);
    }
    return out;
  }
  return value;
}

/** A logger that redacts sensitive context before writing to a sink (console by default). */
export function createConsoleLogger(
  sink: Pick<Console, LogLevel> = console,
  sensitiveKeys: readonly string[] = SENSITIVE_FIELDS,
): Logger {
  return {
    log(entry) {
      const safeContext =
        entry.context === undefined
          ? undefined
          : (redact(entry.context, sensitiveKeys) as Record<string, unknown>);
      sink[entry.level](entry.message, {at: entry.at, context: safeContext});
    },
  };
}

/** A logger that discards everything — handy for tests and reduced noise. */
export function createNoopLogger(): Logger {
  return {log() {}};
}

/** Factory for an append-only audit event (timestamp + id injected). */
export function createAuditEvent(input: {
  id: string;
  applicationId: string;
  actor: Actor;
  action: string;
  at: string;
  fromStatus?: ApplicationStatus;
  toStatus?: ApplicationStatus;
  event?: ApplicationEvent;
  reason?: string;
}): AuditEvent {
  return {
    id: input.id,
    applicationId: input.applicationId,
    actor: input.actor,
    action: input.event ?? input.action,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    reason: input.reason,
    at: input.at,
  };
}
