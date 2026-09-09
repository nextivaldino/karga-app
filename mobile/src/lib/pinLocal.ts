// PIN de desbloqueio rápido — guardado só no dispositivo (nunca enviado
// ao servidor), como hash SHA-256 via Web Crypto (sem dependência nova).
// Não substitui o login real: só evita repetir username+password sempre
// que a app reabre com uma sessão Supabase já válida.
const CHAVE = 'kraga_mobile_pin_hash';

async function hash(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function pinConfigurado(): boolean {
  try {
    return localStorage.getItem(CHAVE) != null;
  } catch {
    return false;
  }
}

export async function definirPin(pin: string): Promise<void> {
  localStorage.setItem(CHAVE, await hash(pin));
}

export async function verificarPin(pin: string): Promise<boolean> {
  try {
    const guardado = localStorage.getItem(CHAVE);
    if (!guardado) return false;
    return (await hash(pin)) === guardado;
  } catch {
    return false;
  }
}

// Chamado sempre que há um logout explícito (ver useAuth.tsx) — nunca
// deve ficar um PIN órfão à espera de que outra pessoa desbloqueie o
// dispositivo com a sessão de outro utilizador.
export function removerPin(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // silencioso
  }
}
