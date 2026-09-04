// Formatador de valores monetários único para toda a app — havia 7
// cópias quase idênticas espalhadas (Cargas, Faturação, Contentores),
// algumas tratando `null` como "—" e outras como "0,00 €" de forma
// inconsistente. Esta é a versão canónica: `null`/`undefined` mostram
// sempre "—", `moeda` assume EUR só quando o chamador não a tiver à mão.
export function formatValor(valor: number | null | undefined, moeda = 'EUR'): string {
  if (valor == null) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda }).format(valor);
}
