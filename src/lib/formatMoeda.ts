export function formatMoeda(valor: number, moeda = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda }).format(valor);
}
