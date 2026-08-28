export function cleanIpcError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/^.*Error invoking remote method '[^']*':\s*/, '').replace(/^Error:\s*/, '');
}
