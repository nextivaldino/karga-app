import { requireSupabaseClient } from './supabaseClient';
import { userRepository } from '../models/repositories/userRepository';
import type { Mensagem, ThreadMensagemNaoLida } from '../../src/types';

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

// Quem tem mensagens por ler — o `de_user_id` é sempre um `users.id`
// local (o mesmo utilizador PWA-habilitado gerido em "Utilizadores"),
// por isso o nome vem do SQLite local, não do Supabase.
export async function listarThreadsComNaoLidas(): Promise<ThreadMensagemNaoLida[]> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from('mensagens')
    .select('de_user_id')
    .eq('para_user_id', EMPRESA_SENTINEL_ID)
    .eq('lida', false);
  if (error) throw new Error(error.message);

  const contagem = new Map<string, number>();
  for (const row of data ?? []) {
    contagem.set(row.de_user_id, (contagem.get(row.de_user_id) ?? 0) + 1);
  }

  const threads: ThreadMensagemNaoLida[] = [];
  for (const [userId, total] of contagem) {
    const user = userRepository.findById(userId);
    threads.push({ userId, nome: user?.name ?? 'Utilizador removido', total });
  }
  return threads.sort((a, b) => b.total - a.total);
}
