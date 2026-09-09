import {
  requireSupabaseClient,
  resolverPostoId,
  listarPostosDisponiveis,
  ativarPostoComCodigo,
  diagnosticoPosto,
  type DiagnosticoPosto,
  type PostoDisponivelRow,
} from '../lib/supabaseClient';
import { sugerirContacto } from '../lib/textMatch';
import { contactoRepository } from '../models/repositories/contactoRepository';
import { cargaRepository } from '../models/repositories/cargaRepository';
import { contentorRepository } from '../models/repositories/contentorRepository';
import { notificacaoRepository } from '../models/repositories/notificacaoRepository';
import { criarNotificacao } from './notifications';
import type { Carga, CargaPendente, ImportarCargaInput, RevisaoCargaPendente, SugestaoContacto } from '../../src/types';

// Falhas de importação/rejeição só apareciam como toast (desaparece ao
// fechar) — passam também a ficar registadas no sino, sem categoria (não
// pode ser silenciado, é um erro que pode implicar carga duplicada/perdida).
// Janela de dedupe mais curta que os avisos de contentor (1h vs 24h): um
// erro de sync pode precisar de atenção mais rápida.
function notificarFalhaSync(titulo: string, mensagem: string, pendenteId: string): void {
  if (notificacaoRepository.existeSemelhanteRecente(titulo, pendenteId, 1)) return;
  criarNotificacao({
    tipo: 'erro',
    titulo,
    mensagem,
    linkModulo: 'sync',
    linkEntidadeId: pendenteId,
    nativa: true,
  });
}

interface CargaPendenteRow {
  id: string;
  contentor_id: string;
  inserido_por_user_id: string;
  pwa_users: { nome: string } | { nome: string }[] | null;
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

// Como o Desktop usa a Service Role Key (ignora RLS), tem de aplicar
// explicitamente o filtro por posto que a RLS já impõe a um cliente normal
// — senão, com 2+ postos ativos, cada instalação passaria a ver/importar
// cargas de outros postos. Falha de forma visível (não devolve tudo sem
// filtro, nem uma lista vazia que pareceria "tudo sincronizado").
async function exigirPostoId(): Promise<string> {
  const postoId = await resolverPostoId();
  if (!postoId) {
    throw new Error(
      'Posto desta instalação não está configurado — define-o em Configurações → Sincronização.',
    );
  }
  return postoId;
}

export async function listarPendentes(): Promise<CargaPendente[]> {
  const supabase = requireSupabaseClient();
  const postoId = await exigirPostoId();
  const { data, error } = await supabase
    .from('cargas_pendentes')
    .select('*, pwa_users(nome)')
    .eq('estado', 'pendente')
    .eq('posto_id', postoId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CargaPendenteRow[]).map(mapPendenteRow);
}

// Histórico — já revistas (importadas ou rejeitadas), mais recentes
// primeiro. Não é uma tabela nova, só um filtro diferente sobre
// cargas_pendentes (doc 19 §7).
export async function listarHistorico(limit = 100): Promise<CargaPendente[]> {
  const supabase = requireSupabaseClient();
  const postoId = await exigirPostoId();
  const { data, error } = await supabase
    .from('cargas_pendentes')
    .select('*, pwa_users(nome)')
    .in('estado', ['importada', 'rejeitada'])
    .eq('posto_id', postoId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as CargaPendenteRow[]).map(mapPendenteRow);
}

export async function listarPostos(): Promise<PostoDisponivelRow[]> {
  return listarPostosDisponiveis();
}

export async function ativarPosto(codigo: string): Promise<PostoDisponivelRow> {
  return ativarPostoComCodigo(codigo);
}

export async function obterDiagnosticoPosto(): Promise<DiagnosticoPosto> {
  return diagnosticoPosto();
}

// Mesmo motivo do exigirPostoId() acima: Service Role Key ignora RLS, por
// isso o filtro por posto tem de ser explícito também aqui — senão uma
// instalação consegue rever/importar/rejeitar uma carga pendente de outro
// posto só por saber o UUID (id não é segredo, aparece em notificações).
async function obterPendente(id: string): Promise<CargaPendente> {
  const supabase = requireSupabaseClient();
  const postoId = await exigirPostoId();
  const { data, error } = await supabase
    .from('cargas_pendentes')
    .select('*, pwa_users(nome)')
    .eq('id', id)
    .eq('posto_id', postoId)
    .single();
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
  if (contentor.bloqueado) {
    throw new Error(`O contentor ${contentor.codigo} está bloqueado — desbloqueie-o antes de sincronizar cargas para lá.`);
  }

  let emissorId = input.emissorId ?? null;
  if (!emissorId) {
    const novo = contactoRepository.create({
      nome: pendente.emissorNome,
      telefone: pendente.emissorTelefone,
      email: pendente.emissorEmail,
      nif: pendente.emissorNif,
      morada: pendente.emissorMorada,
    });
    emissorId = novo.id;
  }

  let recetorId = input.recetorId ?? null;
  if (!recetorId) {
    const novo = contactoRepository.create({
      nome: pendente.recetorNome,
      telefone: pendente.recetorTelefone,
      email: pendente.recetorEmail,
      morada: pendente.recetorMorada,
    });
    recetorId = novo.id;
  }

  // Código: automático (padrão) ou o que o Admin definiu na revisão
  // (sequência a partir de um código-base, ou um por carga à mão) —
  // validado aqui na mesma, para nunca deixar passar um duplicado.
  const codigoManual = input.codigo?.trim();
  if (codigoManual && cargaRepository.codigoExiste(codigoManual)) {
    throw new Error(`Já existe uma carga com o código "${codigoManual}".`);
  }
  const codigo = codigoManual || cargaRepository.nextCodigo();

  // create + addDestinatario numa única transação local (nunca fica uma
  // carga sem o seu destinatário); a confirmação remota vem depois, fora
  // da transação (não dá para awaitar rede dentro de uma transação
  // síncrona do better-sqlite3) — se falhar, desfazemos a escrita local
  // em vez de deixar a carga órfã e a pendente reimportável em duplicado.
  const carga = cargaRepository.criarComDestinatario(
    {
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
    },
    null,
    recetorId,
  );

  try {
    const supabase = requireSupabaseClient();
    const postoId = await exigirPostoId();
    // .select().single() é essencial aqui, não só estilo: um UPDATE sem
    // .select() volta sempre 204/sem erro mesmo quando 0 linhas
    // correspondem ao filtro (comportamento normal do PostgREST) — sem
    // isto, o filtro .eq('posto_id', postoId) não protegia nada de facto,
    // só "funcionava" porque o obterPendente() anterior já validou o
    // posto (esta chamada é defesa em profundidade, tem de poder falhar).
    const { data, error } = await supabase
      .from('cargas_pendentes')
      .update({ estado: 'importada', carga_local_id: carga.id, importado_em: new Date().toISOString() })
      .eq('id', input.pendenteId)
      .eq('posto_id', postoId)
      .select('id')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Carga pendente não encontrada ou já não pertence a este posto.');
  } catch (err) {
    cargaRepository.reverterImportacaoFalhada(carga.id);
    const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
    notificarFalhaSync('Falha ao importar carga', `"${pendente.nomeCarga}": ${mensagem}`, input.pendenteId);
    throw err instanceof Error ? err : new Error(mensagem);
  }

  return carga;
}

export async function rejeitarCarga(pendenteId: string, motivo: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const postoId = await exigirPostoId();
  // Ver comentário equivalente em importarCarga: sem .select().single(),
  // um UPDATE que não encontra nenhuma linha (ex: pendente de outro
  // posto) devolve sucesso na mesma — esta é a única validação de posto
  // que rejeitarCarga tem (não passa por obterPendente antes).
  const { data, error: erroUpdate } = await supabase
    .from('cargas_pendentes')
    .update({ estado: 'rejeitada', motivo_rejeicao: motivo })
    .eq('id', pendenteId)
    .eq('posto_id', postoId)
    .select('id')
    .single();
  const error = erroUpdate || (!data ? { message: 'Carga pendente não encontrada ou já não pertence a este posto.' } : null);
  if (error) {
    notificarFalhaSync('Falha ao rejeitar carga', error.message, pendenteId);
    throw new Error(error.message);
  }
}

// O aviso de "cargas novas da PWA" já não passa pelo sino genérico de
// notificações — vive nas superfícies dedicadas de sincronização
// (SincronizacaoCargaCard, SincronizacaoHomeCard, SincronizacaoLoginModal,
// SincronizacaoBell), que já fazem o seu próprio polling via
// `listPendentesComSugestoes`. Um 5º aviso genérico aqui era ruído
// duplicado, não informação nova.
