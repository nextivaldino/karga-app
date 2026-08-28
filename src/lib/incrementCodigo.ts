export function incrementCodigo(codigo: string): string {
  const match = codigo.match(/^(\D*)(\d+)$/);
  if (!match?.[1] || !match[2]) return codigo;
  const [, prefix, digits] = match;
  return `${prefix}${String(Number(digits) + 1).padStart(digits.length, '0')}`;
}
