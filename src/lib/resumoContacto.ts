import type { CargaComEmissor } from '@/types';

export function formatValorMoeda(valor: number | null, moeda: string): string {
  if (valor == null) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: moeda }).format(valor);
}

export function buildResumoMensagem(
  nomeContacto: string,
  cargas: CargaComEmissor[],
  empresaNome: string,
  empresaContacto: string,
): string {
  const moeda = cargas[0]?.moeda ?? 'EUR';
  const totalValor = cargas.reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const totalDevido = cargas.reduce((sum, c) => sum + (c.estadoPagamento === 'devido' ? (c.valor ?? 0) : 0), 0);
  const linhas = cargas.map(
    (c) =>
      `📦 ${c.codigo} — ${c.nome} — ${formatValorMoeda(c.valor, c.moeda)} (${c.estadoPagamento === 'pago' ? 'Pago' : 'Devido'})`,
  );

  return [
    `Olá ${nomeContacto},`,
    '',
    'Informamos que temos registadas as seguintes cargas em seu nome:',
    '',
    ...linhas,
    '',
    `Total: ${formatValorMoeda(totalValor, moeda)}`,
    `Valor devido: ${formatValorMoeda(totalDevido, moeda)}`,
    '',
    'Para qualquer questão, estamos ao dispor.',
    '',
    'Com os melhores cumprimentos,',
    empresaNome,
    empresaContacto,
  ].join('\n');
}

export function buildResumoAssunto(empresaNome: string): string {
  return `Resumo das suas cargas — ${empresaNome}`;
}
