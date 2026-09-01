import { requireSupabaseClient } from '../lib/supabaseClient';
import { sugerirContacto } from '../lib/textMatch';
import { contactoRepository } from '../models/repositories/contactoRepository';
import { cargaRepository } from '../models/repositories/cargaRepository';
import { contentorRepository } from '../models/repositories/contentorRepository';
import { notificacaoRepository } from '../models/repositories/notificacaoRepository';
import { criarNotificacao } from './notifications';
import type { Carga, CargaPendente, ImportarCargaInput, RevisaoCargaPendente, SugestaoContacto } from '../../src/types';

interface CargaPendenteRow {
  id: string;
  contentor_id: string;
  inserido_por_user_id: string;
  pwa_users: { nome: string } | { nome: string }[] | null;
  emissor_nome: string;
  emissor_telefone: string | null;
  emissor_email: string | null;
  recetor_nome: string;
  recetor_telefone: string | null;
  nome_carga: string;
  comprimento_cm: number | null;
  largura_cm: number | null;
  altura_cm: number | null;
  peso_kg: number | null;
  valor: number | null;
  pago: boolean;
  notas: string | null;
  estado: CargaPendente['estado'];
  motivo_rejeicao: string | null;
  importado_em: string | null;
  carga_local_id: string | null;
  created_at: string;
}

function nomeInseridoPor(pwaUsers: CargaPendenteRow['pwa_users']): string {
  if (!pwaUsers) return 'Utilizador PWA';
  const registo = Array.isArray(pwaUsers) ? pwaUsers[0] : pwaUsers;
  return registo?.nome ?? 'Utilizador PWA';
}

function mapPendenteRow(row: CargaPendenteRow): CargaPendente {
  return {
    id: row.id,
    contentorId: row.contentor_id,
    inseridoPorUserId: row.inserido_por_user_id,
    inseridoPorNome: nomeInseridoPor(row.pwa_users),
    emissorNome: row.emissor_nome,
    emissorTelefone: row.emissor_telefone,
    emissorEmail: row.emissor_email,
    recetorNome: row.recetor_nome,
    recetorTelefone: row.recetor_telefone,
    nomeCarga: row.nome_carga,
    comprimentoCm: row.comprimento_cm,
    larguraCm: row.largura_cm,
    alturaCm: row.altura_cm,
    pesoKg: row.peso_kg,
    valor: row.valor,
    pago: row.pago,
    notas: row.notas,
    estado: row.estado,
    motivoRejeicao: row.motivo_rejeicao,
    importadoEm: row.importado_em,
    cargaLocalId: row.carga_local_id,
    createdAt: row.created_at,
  };
}

export async function listarPendentes(): Promise<CargaPendente[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from('cargas_pendentes')
    .select('*, pwa_users(nome)')
    .eq('estado', 'pendente')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CargaPendenteRow[]).map(mapPendenteRow);
}

async function obterPendente(id: string): Promise<CargaPendente> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.from('cargas_pendentes').select('*, pwa_users(nome)').eq('id', id).single();
  if (error || !data) throw new Error(error?.message ?? 'Carga pendente não encontrada.');
  return mapPendenteRow(data as CargaPendenteRow);
}

function calcularSugestoes(pendente: CargaPendente, contactos: { id: string; nome: string }[]): SugestaoContacto[] {
  function sugestaoPara(campo: 'emissor' | 'recetor', nome: string, telefone: string | null): SugestaoContacto {
    const resultado = sugerirContacto(nome, contactos);
    return {
      campo,
      nomeOriginal: nome,
      telefoneOriginal: telefone,
      sugestaoId: resultado.tipo === 'nenhum' ? null : resultado.contacto.id,
      sugestaoNome: resultado.tipo === 'nenhum' ? null : resultado.contacto.nome,
      automatico: resultado.tipo === 'exato',
    };
  }

  return [
    sugestaoPara('emissor', pendente.emissorNome, pendente.emissorTelefone),
    sugestaoPara('recetor', pendente.recetorNome, pendente.recetorTelefone),
  ];
}

export async function revisarCarga(id: string): Promise<RevisaoCargaPendente> {
  const pendente = await obterPendente(id);
  const contactos = contactoRepository.list();
  return { pendente, sugestoes: calcularSugestoes(pendente, contactos) };
}

// Mesmo cálculo de conflito do revisarCarga, mas para a lista toda de uma
// só vez — usado pela vista de revisão em massa, para mostrar o sinal de
// conflito em cada linha sem precisar de 1 pedido por carga.
export async function listarPendentesComSugestoes(): Promise<RevisaoCargaPendente[]> {
  const pendentes = await listarPendentes();
  const contactos = contactoRepository.list();
  return pendentes.map((pendente) => ({ pendente, sugestoes: calcularSugestoes(pendente, contactos) }));
}

export async function importarCarga(input: ImportarCargaInput): Promise<Carga> {
  const pendente = await obterPendente(input.pendenteId);
  if (pendente.estado !== 'pendente') {
    throw new Error('Esta carga pendente já foi revista (importada ou rejeitada).');
  }

  const contentor = contentorRepository.findById(input.contentorId);
  if (!contentor) throw new Error('Contentor de destino não encontrado.');

  let emissorId = input.emissorId ?? null;
  if (!emissorId) {
    const novo = contactoRepository.create({
      nome: pendente.emissorNome,
      telefone: pendente.emissorTelefone,
      email: pendente.emissorEmail,
    });
    emissorId = novo.id;
  }

  let recetorId = input.recetorId ?? null;
  if (!recetorId) {
    const novo = contactoRepository.create({
      nome: pendente.recetorNome,
      telefone: pendente.recetorTelefone,
    });
    recetorId = novo.id;
  }

  const codigo = cargaRepository.nextCodigo();
  const carga = cargaRepository.create({
    codigo,
    nome: input.nome,
    comprimentoCm: input.comprimentoCm,
    larguraCm: input.larguraCm,
    alturaCm: input.alturaCm,
    pesoKg: input.pesoKg,
    valor: input.valor,
    estadoPagamento: input.pago ? 'pago' : 'devido',
    contentorId: input.contentorId,
    emissorId,
    origemPwaUserId: pendente.inseridoPorUserId,
  });
  cargaRepository.addDestinatario(carga.id, recetorId);

  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from('cargas_pendentes')
    .update({ estado: 'importada', carga_local_id: carga.id, importado_em: new Date().toISOString() })
    .eq('id', input.pendenteId);
  if (error) throw new Error(error.message);

  return carga;
}

export async function rejeitarCarga(pendenteId: string, motivo: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from('cargas_pendentes')
    .update({ estado: 'rejeitada', motivo_rejeicao: motivo })
    .eq('id', pendenteId);
  if (error) throw new Error(error.message);
}

const JANELA_DEDUPE_HORAS = 24;

// Doc 16 §5 — falha em silêncio (sem net/credenciais): não é crítico, tenta
// de novo no próximo ciclo.
export async function verificarPendentes(): Promise<void> {
  try {
    const pendentes = await listarPendentes();
    if (pendentes.length === 0) return;

    const porUtilizador = new Map<string, { nome: string; total: number }>();
    for (const p of pendentes) {
      const atual = porUtilizador.get(p.inseridoPorUserId) ?? { nome: p.inseridoPorNome, total: 0 };
      atual.total += 1;
      porUtilizador.set(p.inseridoPorUserId, atual);
    }

    for (const [userId, info] of porUtilizador) {
      const titulo = `${info.total} carga${info.total === 1 ? '' : 's'} nova${info.total === 1 ? '' : 's'} de ${info.nome} (via PWA)`;
      if (!notificacaoRepository.existeSemelhanteRecente(titulo, userId, JANELA_DEDUPE_HORAS)) {
        criarNotificacao({
          tipo: 'info',
          titulo,
          mensagem: 'Clica para rever e importar.',
          linkModulo: 'configuracoes',
          linkEntidadeId: userId,
          nativa: true,
        });
      }
    }
  } catch (err) {
    console.warn('[sync] Falha ao verificar cargas pendentes:', err instanceof Error ? err.message : err);
  }
}

let intervaloSync: ReturnType<typeof setInterval> | null = null;

// Doc 16 §5 — intervalo próprio de 5 min, independente dos 30 min da
// verificação de contentores em ./notifications.
export function iniciarVerificacaoPeriodicaSync(intervaloMs = 5 * 60 * 1000): void {
  void verificarPendentes();
  if (intervaloSync) clearInterval(intervaloSync);
  intervaloSync = setInterval(() => {
    void verificarPendentes();
  }, intervaloMs);
}
