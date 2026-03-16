export function edgeLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: { requestId?: string; [key: string]: unknown }
): void {
  const payload = { level, message, timestamp: new Date().toISOString(), ...context };
  const out = JSON.stringify(payload);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
}
