import { supabase } from './supabase';
import { guardarCache, lerCacheCargas, lerCacheContentores } from './offlineQueue';
import type { CargaPendente, ContentorDisponivel, Mensagem, NovaCargaPendenteInput } from '@/types';

interface ContentorRow {
  id: string;
  nome: string;
  codigo: string;
  estado: string;
  updated_at: string;
}

function mapContentor(row: ContentorRow): ContentorDisponivel {
  return { id: row.id, nome: row.nome, codigo: row.codigo, estado: row.estado, updatedAt: row.updated_at };
}

// Cai para a cache local (última leitura com sucesso) quando offline ou a
// ligação falha — a app não fica em branco, mesmo sem net (doc 19 §6).
export async function listContentoresDisponiveis(): Promise<ContentorDisponivel[]> {
  try {
    const { data, error } = await supabase
      .from('contentores_disponiveis')
      .select('*')
      .eq('estado', 'aberto')
      .order('codigo', { ascending: true });
    if (error) throw new Error(error.message);
    const contentores = (data ?? []).map(mapContentor);
    void guardarCache('contentores', contentores);
    return contentores;
  } catch (err) {
    const cache = await lerCacheContentores();
    if (cache.length > 0) return cache;
    throw err;
  }
}

interface CargaPendenteRow {
  id: string;
  contentor_id: string;
  inserido_por_user_id: string;
  emissor_nome: string;
  emissor_telefone: string | null;
  emissor_email: string | null;
  emissor_nif: string | null;
  recetor_nome: string;
  recetor_telefone: string | null;
  recetor_email: string | null;
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

function mapCargaPendente(row: CargaPendenteRow): CargaPendente {
  return {
    id: row.id,
    contentorId: row.contentor_id,
    inseridoPorUserId: row.inserido_por_user_id,
    emissorNome: row.emissor_nome,
    emissorTelefone: row.emissor_telefone,
    emissorEmail: row.emissor_email,
    emissorNif: row.emissor_nif,
    recetorNome: row.recetor_nome,
    recetorTelefone: row.recetor_telefone,
    recetorEmail: row.recetor_email,
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

// RLS já restringe a leitura às próprias cargas pendentes do utilizador
// autenticado — não é preciso filtrar por inserido_por_user_id aqui.
export async function listMinhasCargasPendentes(contentorId?: string): Promise<CargaPendente[]> {
  try {
    let query = supabase.from('cargas_pendentes').select('*').order('created_at', { ascending: false });
    if (contentorId) query = query.eq('contentor_id', contentorId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const cargas = (data ?? []).map(mapCargaPendente);
    if (!contentorId) void guardarCache('cargas', cargas);
    return cargas;
  } catch (err) {
    if (contentorId) throw err;
    const cache = await lerCacheCargas();
    if (cache.length > 0) return cache;
    throw err;
  }
}

function vazioParaNull(v: string | null): string | null {
  return v && v.trim() ? v.trim() : null;
}

export async function enviarCargasPendentes(userId: string, items: NovaCargaPendenteInput[]): Promise<void> {
  const rows = items.map((item) => ({
    contentor_id: item.contentorId,
    inserido_por_user_id: userId,
    emissor_nome: item.emissorNome.trim(),
    emissor_telefone: vazioParaNull(item.emissorTelefone),
    emissor_email: vazioParaNull(item.emissorEmail),
    emissor_nif: vazioParaNull(item.emissorNif),
    recetor_nome: item.recetorNome.trim(),
    recetor_telefone: vazioParaNull(item.recetorTelefone),
    recetor_email: vazioParaNull(item.recetorEmail),
    nome_carga: item.nomeCarga.trim(),
    comprimento_cm: item.comprimentoCm,
    largura_cm: item.larguraCm,
    altura_cm: item.alturaCm,
    peso_kg: item.pesoKg,
    valor: item.valor,
    pago: item.pago,
    notas: vazioParaNull(item.notas),
  }));
  const { error } = await supabase.from('cargas_pendentes').insert(rows);
  if (error) throw new Error(error.message);
}

interface MensagemRow {
  id: string;
  de_user_id: string;
  para_user_id: string;
  texto: string;
  lida: boolean;
  created_at: string;
}

function mapMensagem(row: MensagemRow): Mensagem {
  return { id: row.id, deUserId: row.de_user_id, paraUserId: row.para_user_id, texto: row.texto, lida: row.lida, createdAt: row.created_at };
}

// RLS restringe às mensagens enviadas ou recebidas pelo utilizador autenticado.
export async function listMensagens(): Promise<Mensagem[]> {
  const { data, error } = await supabase.from('mensagens').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMensagem);
}

export async function enviarMensagem(deUserId: string, paraUserId: string, texto: string): Promise<void> {
  const { error } = await supabase.from('mensagens').insert({ de_user_id: deUserId, para_user_id: paraUserId, texto: texto.trim() });
  if (error) throw new Error(error.message);
}

export async function marcarMensagemLida(id: string): Promise<void> {
  const { error } = await supabase.from('mensagens').update({ lida: true }).eq('id', id);
  if (error) throw new Error(error.message);
}
