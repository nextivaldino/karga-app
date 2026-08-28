export function buildWhatsAppUrl(telefone: string, message?: string): string {
  const digits = telefone.replace(/\D/g, '');
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${query}`;
}
