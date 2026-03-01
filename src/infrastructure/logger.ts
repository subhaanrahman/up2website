// Structured JSON logging utility

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: { message: string; stack?: string };
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: string,
  data?: Record<string, unknown>,
  error?: Error,
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  if (context) entry.context = context;
  if (data) entry.data = data;
  if (error) entry.error = { message: error.message, stack: error.stack };
  return entry;
}

const emit = (entry: LogEntry) => {
  const method = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
  // In production, emit as JSON; in dev, keep readable
  if (import.meta.env.PROD) {
    console[method](JSON.stringify(entry));
  } else {
    console[method](`[${entry.level.toUpperCase()}] ${entry.context ? `[${entry.context}] ` : ''}${entry.message}`, entry.data ?? '');
  }
};

export function createLogger(context: string) {
  return {
    debug: (msg: string, data?: Record<string, unknown>) => emit(createEntry('debug', msg, context, data)),
    info: (msg: string, data?: Record<string, unknown>) => emit(createEntry('info', msg, context, data)),
    warn: (msg: string, data?: Record<string, unknown>) => emit(createEntry('warn', msg, context, data)),
    error: (msg: string, error?: Error, data?: Record<string, unknown>) => emit(createEntry('error', msg, context, data, error)),
  };
}
