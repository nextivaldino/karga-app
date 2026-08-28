function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function computeNextCode(prefix: string, existingCodes: string[]): string {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}\\s*(\\d+)$`, 'i');
  let max = 0;

  for (const code of existingCodes) {
    const match = pattern.exec(code.trim());
    if (match?.[1]) {
      const num = Number(match[1]);
      if (num > max) max = num;
    }
  }

  return `${prefix} ${String(max + 1).padStart(3, '0')}`;
}
