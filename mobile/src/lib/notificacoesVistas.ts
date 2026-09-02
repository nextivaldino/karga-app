// Guarda quais notificações de carga (importada/rejeitada) já foram vistas
// pelo utilizador — sem tabela nova (doc 20 §5), só localStorage local ao
// dispositivo. Cada carga resolvida entra na lista só uma vez; ao tocar na
// notificação ela é marcada como vista e desaparece do badge.
const CHAVE = 'kraga_mobile_cargas_notif_vistas';

function ler(): Set<string> {
  try {
    const raw = localStorage.getItem(CHAVE);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function cargaNotificacaoVista(id: string): boolean {
  return ler().has(id);
}

export function marcarCargaNotificacaoVista(id: string): void {
  const vistas = ler();
  vistas.add(id);
  localStorage.setItem(CHAVE, JSON.stringify([...vistas]));
}
