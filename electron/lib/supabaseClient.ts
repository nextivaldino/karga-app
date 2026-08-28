import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// O processo principal do Electron corre num runtime Node mais antigo, sem
// WebSocket nativo — o @supabase/supabase-js precisa de um global WebSocket
// só para construir o cliente (mesmo que nunca se use o realtime), senão
// createClient() rebenta de forma síncrona. Polyfill mínimo via `ws`.
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;
}

let client: SupabaseClient | null | undefined;

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
}

// Fire-and-forget: falha em silêncio (sem internet, sem credenciais
// configuradas, etc.) — não é crítico manter isto 100% atualizado ao segundo
// (doc 16 §2). Nunca deve bloquear nem rebentar o fluxo local do Desktop.
export function upsertContentorDisponivel(contentor: ContentorDisponivel): void {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    Promise.resolve(
      supabase.from('contentores_disponiveis').upsert(
        {
          id: contentor.id,
          nome: contentor.nome,
          codigo: contentor.codigo,
          estado: contentor.estado,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      ),
    )
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

// Doc 16 §1 — cria a conta do funcionário no Supabase Auth com uma password
// temporária. Devolve o auth_uid para guardar localmente em users.pwa_auth_uid.
export async function criarUtilizadorPwaAuth(email: string, passwordTemporaria: string): Promise<string> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: passwordTemporaria,
    email_confirm: true,
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

interface PwaUserInput {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  authUid: string | null;
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
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(error.message);
}
