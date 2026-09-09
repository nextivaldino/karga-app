import { supabase } from './supabase';
import { guardarCache, lerCacheCargas, lerCacheContentores } from './offlineQueue';
import type { CargaPendente, ContentorDisponivel, EstadoPosto, MeuPostoInfo, Mensagem, NovaCargaPendenteInput, Posto } from '@/types';

interface PostoRow {
  id: string;
  nome: string;
  pais: string;
  estado: EstadoPosto;
  codigo_ativacao: string | null;
  codigo_usado: boolean;
  ativado_em: string | null;
  installation_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapPosto(row: PostoRow): Posto {
  return {
    id: row.id,
    nome: row.nome,
    pais: row.pais,
    estado: row.estado,
    codigoAtivacao: row.codigo_ativacao,
    codigoUsado: row.codigo_usado,
    ativadoEm: row.ativado_em,
    installationId: row.installation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listarPostosRoot(): Promise<Posto[]> {
  const { data, error } = await supabase.from('postos').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapPosto(row as PostoRow));
}

export async function criarPostoRoot(nome: string, pais: string): Promise<Posto> {
  const codigoAtivacao = `KG-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const { data, error } = await supabase
    .from('postos')
    .insert({ nome: nome.trim(), pais: pais.trim(), codigo_ativacao: codigoAtivacao })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Não foi possível criar o Posto.');
  return mapPosto(data as PostoRow);
}

export async function alterarEstadoPostoRoot(id: string, estado: Extract<EstadoPosto, 'ativo' | 'suspenso' | 'bloqueado'>): Promise<void> {
  const { error } = await supabase.from('postos').update({ estado, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

interface ContentorRow {
  id: string;
  nome: string;
  codigo: string;
  estado: string;
  bloqueado: boolean;
  padrao_global: boolean;
  updated_at: string;
}

function mapContentor(row: ContentorRow): ContentorDisponivel {
  return {
    id: row.id,
    nome: row.nome,
    codigo: row.codigo,
    estado: row.estado,
    bloqueado: row.bloqueado,
    padraoGlobal: row.padrao_global,
    updatedAt: row.updated_at,
  };
}

async function buscarContentoresDoServidor(): Promise<ContentorDisponivel[]> {
  const { data, error } = await supabase
    .from('contentores_disponiveis')
    .select('*')
    .eq('estado', 'aberto')
    .eq('bloqueado', false)
    .order('codigo', { ascending: true });
  if (error) throw new Error(error.message);
  const contentores = (data ?? []).map(mapContentor);
  void guardarCache('contentores', contentores);
  return contentores;
}

// Cai para a cache local (última leitura com sucesso) quando offline ou a
// ligação falha — a app não fica em branco, mesmo sem net (doc 19 §6).
export async function listContentoresDisponiveis(): Promise<ContentorDisponivel[]> {
  try {
    return await buscarContentoresDoServidor();
  } catch (err) {
    const cache = await lerCacheContentores();
    if (cache.length > 0) return cache;
    throw err;
  }
}

// Variante que também diz se a lista é mesmo do servidor ou uma cópia
// antiga em cache — só quem precisa de mostrar "sem ligação" (Home) usa
// isto; o resto da app trata os dois casos da mesma forma.
export async function listContentoresDisponiveisComEstado(): Promise<{ contentores: ContentorDisponivel[]; ligado: boolean }> {
  try {
    return { contentores: await buscarContentoresDoServidor(), ligado: true };
  } catch (err) {
    const cache = await lerCacheContentores();
    if (cache.length > 0) return { contentores: cache, ligado: false };
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
  emissor_morada: string | null;
  recetor_nome: string;
  recetor_telefone: string | null;
  recetor_email: string | null;
  recetor_morada: string | null;
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
    emissorMorada: row.emissor_morada,
    recetorNome: row.recetor_nome,
    recetorTelefone: row.recetor_telefone,
    recetorEmail: row.recetor_email,
    recetorMorada: row.recetor_morada,
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

export async function enviarCargasPendentes(userId: string, postoId: string | null, items: NovaCargaPendenteInput[]): Promise<void> {
  if (!postoId) throw new Error('Este utilizador ainda não está associado a um Posto. Contacta o administrador.');
  const rows = items.map((item) => ({
    posto_id: postoId,
    contentor_id: item.contentorId,
    inserido_por_user_id: userId,
    emissor_nome: item.emissorNome.trim(),
    emissor_telefone: vazioParaNull(item.emissorTelefone),
    emissor_email: vazioParaNull(item.emissorEmail),
    emissor_nif: vazioParaNull(item.emissorNif),
    emissor_morada: vazioParaNull(item.emissorMorada),
    recetor_nome: item.recetorNome.trim(),
    recetor_telefone: vazioParaNull(item.recetorTelefone),
    recetor_email: vazioParaNull(item.recetorEmail),
    recetor_morada: vazioParaNull(item.recetorMorada),
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

// Card "Posto" em Definições, só leitura. Função RPC dedicada em vez de
// SELECT direto à tabela postos — essa nunca é legível por um utilizador
// normal (tem colunas sensíveis como código de ativação).
export async function obterMeuPosto(): Promise<MeuPostoInfo | null> {
  const { data, error } = await supabase.rpc('meu_posto_info');
  if (error) throw new Error(error.message);
  const linha = data?.[0];
  return linha ? { nome: linha.nome, pais: linha.pais ?? null } : null;
}
