import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import https from 'node:https';
import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { settingsRepository } from '../models/repositories/settingsRepository';

const SETTING_POSTO_ID = 'posto_id';
const SETTING_INSTALLATION_ID = 'installation_id';

// O processo principal do Electron corre num runtime Node mais antigo, sem
// WebSocket nativo — o @supabase/supabase-js precisa de um global WebSocket
// só para construir o cliente (mesmo que nunca se use o realtime), senão
// createClient() rebenta de forma síncrona. Polyfill mínimo via `ws`.
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;
}

let client: SupabaseClient | null | undefined;
let postoIdPromise: Promise<string | null> | null = null;

// O fetch global do runtime Electron pode falhar no processo principal
// quando o serviço de rede/GPU do Chromium reinicia. O cliente Supabase só
// precisa do contrato Fetch; usar HTTPS do Node torna o sync independente
// desse serviço.
//
// init.headers pode chegar como instância de Headers (é o que o
// supabase-js/postgrest-js envia) — https.request não sabe iterar isso
// (não é um objeto simples), por isso um cast direto para
// Record<string,string> descarta os headers em silêncio (fica só
// host/connection, que o próprio Node acrescenta). Sem isto, apikey e
// Authorization nunca chegavam a sair da máquina — qualquer pedido falharia
// silenciosamente ou seria rejeitado pelo Supabase.
function normalizarHeaders(headers: HeadersInit | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => { obj[key] = value; });
    return obj;
  }
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return headers;
}

function nodeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const request = https.request(
      target,
      {
        method: init?.method ?? 'GET',
        headers: normalizarHeaders(init?.headers),
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(response.headers as IncomingHttpHeaders)) {
            if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
          }
          resolve(new Response(Buffer.concat(chunks), { status: response.statusCode ?? 500, headers }));
        });
      },
    );
    request.on('error', reject);
    if (init?.signal) {
      init.signal.addEventListener('abort', () => request.destroy(new Error('Request aborted')), { once: true });
    }
    if (init?.body) request.write(typeof init.body === 'string' ? init.body : JSON.stringify(init.body));
    request.end();
  });
}

// Cliente com a Service Role Key — só usado no processo principal, para
// operações que precisam de ignorar RLS (ex: upsert de contentores_disponiveis
// a partir do Desktop). Nunca deve ser exposto ao renderer.
function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    client = null;
    return client;
  }

  try {
    client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: nodeFetch },
    });
  } catch (err) {
    console.warn('[sync] Falha ao criar cliente Supabase:', err instanceof Error ? err.message : err);
    client = null;
  }
  return client;
}

// Para operações explicitamente pedidas pelo Admin (ativar PWA, importar,
// rejeitar) — ao contrário do upsert de contentores, aqui uma falha TEM de
// ser visível (lança erro em vez de ignorar em silêncio).
export function requireSupabaseClient(): SupabaseClient {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Sincronização não configurada — verifica as variáveis SUPABASE_* no .env.');
  }
  return supabase;
}

interface ContentorDisponivel {
  id: string;
  nome: string;
  codigo: string;
  estado: string;
  bloqueado: boolean;
  padraoGlobal: boolean;
  oculto: boolean;
}

// Resolução do posto desta instalação, por ordem de prioridade:
// 1) KARGA_POSTO_ID (env, override avançado)
// 2) valor persistido localmente (Configurações → Sincronização, ou
//    auto-detetado numa execução anterior — ver nível 3)
// 3) auto-deteção: só decide sozinho se houver exatamente 1 posto `ativo`
//    no Supabase; nesse caso persiste o resultado para não repetir a
//    heurística. Com 0 ou 2+ postos ativos devolve null — não adivinha.
export async function resolverPostoId(): Promise<string | null> {
  const configurado = process.env.KARGA_POSTO_ID?.trim();
  if (configurado) return configurado;

  const local = settingsRepository.get(SETTING_POSTO_ID);
  if (local) return local;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  if (!postoIdPromise) {
    postoIdPromise = Promise.resolve(
      supabase.from('postos').select('id').eq('estado', 'ativo').limit(2),
    )
      .then(({ data, error }) => {
        if (error) {
          console.warn('[sync] Não foi possível resolver o Posto:', error.message);
          return null;
        }
        if (data?.length === 1) {
          settingsRepository.set(SETTING_POSTO_ID, data[0].id);
          return data[0].id;
        }
        // 0 ou 2+ postos ativos: não guarda o resultado em cache — se
        // ficasse memoizado como null, resolver a ambiguidade mais tarde
        // (ex: desativar o posto a mais) só teria efeito depois de
        // reiniciar a app. Sem valor persistido, a próxima chamada volta
        // a consultar o Supabase em vez de repetir o null antigo.
        postoIdPromise = null;
        return null;
      });
  }
  return postoIdPromise;
}

export interface PostoDisponivelRow {
  id: string;
  nome: string;
  pais: string | null;
  estado: string;
}

// Usado pela UI de Configurações → Sincronização para o Admin escolher
// manualmente o posto desta instalação (necessário quando há 2+ postos
// ativos e a auto-deteção não consegue decidir sozinha).
export async function listarPostosDisponiveis(): Promise<PostoDisponivelRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('postos')
    .select('id,nome,pais,estado')
    .order('nome');
  if (error) {
    console.warn('[sync] Não foi possível listar Postos:', error.message);
    return [];
  }
  return (data ?? []) as PostoDisponivelRow[];
}

function obterOuCriarInstallationId(): string {
  const existente = settingsRepository.get(SETTING_INSTALLATION_ID);
  if (existente) return existente;
  const novo = randomUUID();
  settingsRepository.set(SETTING_INSTALLATION_ID, novo);
  return novo;
}

// Doc 23 §2 — em vez de o Admin escolher o posto à mão num dropdown (erro
// humano fácil: bastaria escolher o posto errado para misturar dados
// entre postos), o Root gera um código de utilização única em
// criarPostoRoot() (Mobile) e o Admin resgata-o aqui, uma vez, na
// instalação certa. Fica registado o installation_id desta máquina, para
// auditoria de qual instalação ativou qual posto.
export async function ativarPostoComCodigo(codigo: string): Promise<PostoDisponivelRow> {
  const supabase = requireSupabaseClient();
  const installationId = obterOuCriarInstallationId();
  const codigoNormalizado = codigo.trim().toUpperCase();

  const { data, error } = await supabase
    .from('postos')
    .update({
      codigo_usado: true,
      installation_id: installationId,
      ativado_em: new Date().toISOString(),
      estado: 'ativo',
      updated_at: new Date().toISOString(),
    })
    .eq('codigo_ativacao', codigoNormalizado)
    .eq('codigo_usado', false)
    .select('id,nome,pais,estado')
    .single();

  if (error || !data) {
    throw new Error('Código de ativação inválido ou já utilizado.');
  }

  settingsRepository.set(SETTING_POSTO_ID, data.id);
  postoIdPromise = null;
  return data as PostoDisponivelRow;
}

export interface DiagnosticoPosto {
  estado: 'ok' | 'ambiguo' | 'indisponivel';
  postosAtivos: number;
}

// Reporta o estado da resolução de posto sem depender de já haver um valor
// persistido — usado pela verificação periódica de notificações e pela UI.
export async function diagnosticoPosto(): Promise<DiagnosticoPosto> {
  const resolvido = await resolverPostoId();
  if (resolvido) return { estado: 'ok', postosAtivos: 1 };

  const supabase = getSupabaseClient();
  if (!supabase) return { estado: 'indisponivel', postosAtivos: 0 };

  const { data, error } = await supabase.from('postos').select('id').eq('estado', 'ativo');
  if (error) return { estado: 'indisponivel', postosAtivos: 0 };

  const count = data?.length ?? 0;
  return { estado: count > 1 ? 'ambiguo' : 'indisponivel', postosAtivos: count };
}

// Fire-and-forget: falha em silêncio (sem internet, sem credenciais
// configuradas, etc.) — não é crítico manter isto 100% atualizado ao segundo
// (doc 16 §2). Nunca deve bloquear nem rebentar o fluxo local do Desktop.
export function upsertContentorDisponivel(contentor: ContentorDisponivel): void {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    resolverPostoId()
      .then((postoId) => supabase.from('contentores_disponiveis').upsert(
        {
          id: contentor.id,
          nome: contentor.nome,
          codigo: contentor.codigo,
          estado: contentor.estado,
          bloqueado: contentor.bloqueado,
          oculto: contentor.oculto,
          padrao_global: contentor.padraoGlobal,
          ...(postoId ? { posto_id: postoId } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      ))
      .then(({ error }) => {
        if (error) console.warn('[sync] Falha ao atualizar contentores_disponiveis:', error.message);
      })
      .catch((err: unknown) => {
        console.warn('[sync] Falha ao atualizar contentores_disponiveis:', err instanceof Error ? err.message : err);
      });
  } catch (err) {
    console.warn('[sync] Falha ao atualizar contentores_disponiveis:', err instanceof Error ? err.message : err);
  }
}

// contentorRepository.eliminar() só existe para contentores abertos e sem
// cargas — nunca houve dados de negócio reais a perder aqui. Sem isto, a
// linha em contentores_disponiveis (espelho para o PWA) ficava órfã para
// sempre: o contentor deixava de existir no Desktop mas continuava a
// aparecer na lista do Mobile indefinidamente.
export function removerContentorDisponivel(id: string): void {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    Promise.resolve(supabase.from('contentores_disponiveis').delete().eq('id', id))
      .then(({ error }) => {
        if (error) console.warn('[sync] Falha ao remover de contentores_disponiveis:', error.message);
      })
      .catch((err: unknown) => {
        console.warn('[sync] Falha ao remover de contentores_disponiveis:', err instanceof Error ? err.message : err);
      });
  } catch (err) {
    console.warn('[sync] Falha ao remover de contentores_disponiveis:', err instanceof Error ? err.message : err);
  }
}

export async function obterEmailUtilizadorPwaAuth(authUid: string): Promise<string> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.admin.getUserById(authUid);
  if (error || !data.user?.email) throw new Error(error?.message ?? 'Não foi possível obter o email desta conta.');
  return data.user.email;
}

// Doc 16 §1 — cria a conta do funcionário no Supabase Auth com uma password
// temporária. Devolve o auth_uid para guardar localmente em users.pwa_auth_uid.
export async function criarUtilizadorPwaAuth(email: string, passwordTemporaria: string): Promise<string> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: passwordTemporaria,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  });
  if (error || !data.user) throw new Error(error?.message ?? 'Falha ao criar conta no Supabase Auth.');
  return data.user.id;
}

export async function desativarUtilizadorPwaAuth(authUid: string): Promise<void> {
  const supabase = requireSupabaseClient();
  // ban_duration muito longo em vez de eliminar — mantém o histórico de
  // mensagens/cargas associadas ao auth_uid intacto caso seja reativado.
  const { error } = await supabase.auth.admin.updateUserById(authUid, { ban_duration: '876000h' });
  if (error) throw new Error(error.message);
}

// Reativa uma conta banida por desativarUtilizadorPwaAuth, com uma nova
// password temporária — usado quando o Admin volta a ligar o toggle PWA de
// um utilizador que já teve conta antes (evita duplicar a conta no Auth,
// que falharia por email já existir). Sincroniza também o email: o Admin
// pode ter editado o perfil enquanto o PWA estava desativado.
export async function reativarUtilizadorPwaAuth(authUid: string, passwordTemporaria: string, email: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.admin.updateUserById(authUid, {
    ban_duration: 'none',
    password: passwordTemporaria,
    email,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  });
  if (error) throw new Error(error.message);
}

// O login do PWA é o email real do perfil (Configurações → Utilizadores),
// não um email sintético — se o Admin editar esse email, a conta no
// Supabase Auth tem de acompanhar, senão o funcionário fica trancado de
// fora com a password certa mas o email errado.
export async function atualizarEmailUtilizadorPwaAuth(authUid: string, email: string): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.admin.updateUserById(authUid, { email, email_confirm: true });
  if (error) throw new Error(error.message);
}

interface PwaUserInput {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  authUid: string | null;
  contentorPadraoId: string | null;
  postoId: string | null;
}

export async function upsertPwaUser(input: PwaUserInput): Promise<void> {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from('pwa_users').upsert(
    {
      id: input.id,
      nome: input.nome,
      email: input.email,
      ativo: input.ativo,
      auth_uid: input.authUid,
      contentor_padrao_id: input.contentorPadraoId,
      posto_id: input.postoId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(error.message);
}
