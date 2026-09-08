import { requireSupabaseClient } from './supabaseClient';
import { userRepository } from '../models/repositories/userRepository';
import type { ConversaResumo, Mensagem } from '../../src/types';

// Mesmo valor fixo usado no Mobile (mobile/src/lib/constants.ts) — não é
// um pwa_user real, é só o "remetente/destinatário" combinado para
// representar a Empresa/Desktop nas mensagens, sem depender de qual
// Admin específico está de serviço.
export const EMPRESA_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

interface MensagemRow {
  id: string;
  de_user_id: string;
  para_user_id: string;
  texto: string;
  lida: boolean;
  created_at: string;
}

function fromRow(row: MensagemRow): Mensagem {
  return { id: row.id, deUserId: row.de_user_id, paraUserId: row.para_user_id, texto: row.texto, lida: row.lida, createdAt: row.created_at };
}

// Desktop usa a Service Role Key (requireSupabaseClient) — ignora RLS, por
// isso consegue ler/escrever mensagens de qualquer utilizador PWA.
export async function listarConversa(pwaUserId: string): Promise<Mensagem[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from('mensagens')
    .select('*')
    .or(
      `and(de_user_id.eq.${EMPRESA_SENTINEL_ID},para_user_id.eq.${pwaUserId}),and(de_user_id.eq.${pwaUserId},para_user_id.eq.${EMPRESA_SENTINEL_ID})`,
    )
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function enviarComoEmpresa(paraUserId: string, texto: string): Promise<void> {
  const trimmed = texto.trim();
  if (!trimmed) throw new Error('A mensagem não pode estar vazia.');
  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from('mensagens')
    .insert({ de_user_id: EMPRESA_SENTINEL_ID, para_user_id: paraUserId, texto: trimmed });
  if (error) throw new Error(error.message);
}

// Total de mensagens por ler endereçadas à Empresa/Desktop, vindas de
// qualquer utilizador PWA — alimenta o envelope no cabeçalho.
export async function contarNaoLidas(): Promise<number> {
  const supabase = requireSupabaseClient();
  const { count, error } = await supabase
    .from('mensagens')
    .select('*', { count: 'exact', head: true })
    .eq('para_user_id', EMPRESA_SENTINEL_ID)
    .eq('lida', false);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// Chamado quando o Admin abre a conversa com um utilizador PWA — marca
// como lidas só as mensagens vindas dele, não a caixa toda.
export async function marcarLidas(pwaUserId: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase
    .from('mensagens')
    .update({ lida: true })
    .eq('de_user_id', pwaUserId)
    .eq('para_user_id', EMPRESA_SENTINEL_ID)
    .eq('lida', false);
  if (error) throw new Error(error.message);
}

// Lista "estilo WhatsApp": todos os utilizadores PWA-habilitados (com ou
// sem histórico), última mensagem trocada e contagem de não lidas — para
// o sino poder mostrar sempre quem existe, não só quem tem algo por ler.
export async function listarConversas(): Promise<ConversaResumo[]> {
  const supabase = requireSupabaseClient();
  const pwaUsers = userRepository.list().filter((u) => u.pwaHabilitado);

  const { data, error } = await supabase
    .from('mensagens')
    .select('*')
    .or(`de_user_id.eq.${EMPRESA_SENTINEL_ID},para_user_id.eq.${EMPRESA_SENTINEL_ID}`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  // Mais recente primeiro (query já vem ordenada DESC) — a primeira linha
  // encontrada por contraparte é sempre a última mensagem trocada com ela.
  const porContraparte = new Map<string, { ultima: MensagemRow; naoLidas: number }>();
  for (const row of data ?? []) {
    const contraparteId = row.de_user_id === EMPRESA_SENTINEL_ID ? row.para_user_id : row.de_user_id;
    const naoLida = row.para_user_id === EMPRESA_SENTINEL_ID && !row.lida;
    const atual = porContraparte.get(contraparteId);
    if (!atual) {
      porContraparte.set(contraparteId, { ultima: row, naoLidas: naoLida ? 1 : 0 });
    } else if (naoLida) {
      atual.naoLidas += 1;
    }
  }

  return pwaUsers
    .map((u): ConversaResumo => {
      const agregado = porContraparte.get(u.id);
      return {
        userId: u.id,
        nome: u.name,
        ultimaMensagemTexto: agregado?.ultima.texto ?? null,
        ultimaMensagemEm: agregado?.ultima.created_at ?? null,
        ultimaMensagemDeEmpresa: agregado ? agregado.ultima.de_user_id === EMPRESA_SENTINEL_ID : false,
        naoLidas: agregado?.naoLidas ?? 0,
      };
    })
    .sort((a, b) => {
      if (!a.ultimaMensagemEm && !b.ultimaMensagemEm) return a.nome.localeCompare(b.nome);
      if (!a.ultimaMensagemEm) return 1;
      if (!b.ultimaMensagemEm) return -1;
      return b.ultimaMensagemEm.localeCompare(a.ultimaMensagemEm);
    });
}
