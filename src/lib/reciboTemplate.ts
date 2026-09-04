import { formatValor } from '@/lib/formatValor';
import type { CargaComEmissor } from '@/types';

export interface DadosEmpresaRecibo {
  nome: string;
  morada: string | null;
  telefone: string | null;
  email: string | null;
  nif: string | null;
  iban: string | null;
  banco: string | null;
}

export interface OpcoesRecibo {
  incluirMorada: boolean;
  incluirContacto: boolean;
  incluirNif: boolean;
  incluirIban: boolean;
}

// Colunas da lista de cargas dentro do texto — Código e Nome identificam
// a carga e ficam sempre visíveis; Valor e Pagamento são opcionais
// (ex: um resumo sem expor valores a terceiros).
export interface ColunasRecibo {
  valor: boolean;
  pagamento: boolean;
}

const COLUNAS_PADRAO: ColunasRecibo = { valor: true, pagamento: true };

// Único gerador de texto para mensagens de recibo (WhatsApp/e-mail) —
// qualquer novo canal de envio deve passar por aqui, para as mensagens
// se manterem uniformes em toda a app em vez de cada sítio inventar o
// seu próprio texto.
export function buildReciboTexto(input: {
  nomeContacto: string;
  cargas: CargaComEmissor[];
  empresa: DadosEmpresaRecibo;
  opcoes: OpcoesRecibo;
  colunas?: ColunasRecibo;
}): string {
  const { nomeContacto, cargas, empresa, opcoes } = input;
  const colunas = input.colunas ?? COLUNAS_PADRAO;
  const moeda = cargas[0]?.moeda ?? 'EUR';
  const totalValor = cargas.reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const totalDevido = cargas.reduce((sum, c) => sum + (c.estadoPagamento === 'devido' ? (c.valor ?? 0) : 0), 0);
  const linhas = cargas.map((c) => {
    let linha = `📦 ${c.codigo} — ${c.nome}`;
    if (colunas.valor) linha += ` — ${formatValor(c.valor, c.moeda)}`;
    if (colunas.pagamento) linha += ` (${c.estadoPagamento === 'pago' ? 'Pago' : 'Devido'})`;
    return linha;
  });

  const partes: string[] = [`Olá ${nomeContacto},`, '', `Segue o resumo das suas cargas junto a ${empresa.nome}:`, '', ...linhas];

  if (colunas.valor) {
    partes.push('', `Total: ${formatValor(totalValor, moeda)}`, `Valor devido: ${formatValor(totalDevido, moeda)}`);
  }

  if (colunas.valor && totalDevido > 0 && opcoes.incluirIban && empresa.iban) {
    partes.push(
      '',
      'Para regularizar o valor em dívida, pode transferir para:',
      `IBAN: ${empresa.iban}`,
      ...(empresa.banco ? [`Banco: ${empresa.banco}`] : []),
    );
  }

  partes.push('', 'Para qualquer questão, estamos ao dispor.', '', 'Com os melhores cumprimentos,', empresa.nome);

  if (opcoes.incluirMorada && empresa.morada) {
    partes.push(empresa.morada);
  }
  if (opcoes.incluirContacto && (empresa.telefone || empresa.email)) {
    partes.push([empresa.telefone, empresa.email].filter(Boolean).join(' · '));
  }
  if (opcoes.incluirNif && empresa.nif) {
    partes.push(`NIF: ${empresa.nif}`);
  }

  return partes.join('\n');
}

export function buildReciboAssunto(empresaNome: string): string {
  return `Resumo das suas cargas — ${empresaNome}`;
}
