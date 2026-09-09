// Preferências de notificação — só do dispositivo, sem sync (mesmo
// padrão de notificacoesVistas.ts). 'carga_rejeitada' e 'fila_erro' não
// são desligáveis (informação crítica que precisa de ação do próprio
// utilizador) — só existem chaves para os dois tipos que podem ser
// silenciados.
const CHAVE = 'kraga_mobile_notif_prefs';

export type TipoNotificacaoConfiguravel = 'carga_importada' | 'mensagem';

type Preferencias = Record<TipoNotificacaoConfiguravel, boolean>;

const OMISSAO: Preferencias = { carga_importada: true, mensagem: true };

function ler(): Preferencias {
  try {
    const raw = localStorage.getItem(CHAVE);
    return raw ? { ...OMISSAO, ...(JSON.parse(raw) as Partial<Preferencias>) } : { ...OMISSAO };
  } catch {
    return { ...OMISSAO };
  }
}

export function lerPreferenciasNotificacoes(): Preferencias {
  return ler();
}

export function definirPreferenciaNotificacao(tipo: TipoNotificacaoConfiguravel, ativo: boolean): void {
  const atual = ler();
  atual[tipo] = ativo;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {
    // silencioso — pior caso, a preferência não persiste entre sessões
  }
}
