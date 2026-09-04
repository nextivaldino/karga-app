import { useEffect, useState } from 'react';
import { CheckCircle, Info, Warning, XCircle } from '@phosphor-icons/react';
import { Switch } from '@/components/ui/Switch';
import { ipcService } from '@/services/ipcService';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import type { Notificacao } from '@/types';

const TIPO_VISUAL: Record<Notificacao['tipo'], { Icon: typeof Info; bg: string; fg: string }> = {
  info: { Icon: Info, bg: 'bg-primary/15', fg: 'text-primary' },
  sucesso: { Icon: CheckCircle, bg: 'bg-success/15', fg: 'text-success' },
  aviso: { Icon: Warning, bg: 'bg-warning/15', fg: 'text-warning' },
  erro: { Icon: XCircle, bg: 'bg-error/15', fg: 'text-error' },
};

const CHAVES = {
  contentoresParados: 'notif_contentores_parados',
  contentoresPartida: 'notif_contentores_partida',
  manutencao: 'notif_manutencao',
} as const;

type ChavePref = keyof typeof CHAVES;

export function NotificacoesConfig(): React.JSX.Element {
  const [prefs, setPrefs] = useState<Record<ChavePref, boolean> | null>(null);
  const [historico, setHistorico] = useState<Notificacao[] | null>(null);

  useEffect(() => {
    void Promise.all(Object.values(CHAVES).map((chave) => ipcService.settings.get(chave))).then((valores) => {
      const chaves = Object.keys(CHAVES) as ChavePref[];
      const entries = chaves.map((key, i) => [key, valores[i] !== '0'] as const);
      setPrefs(Object.fromEntries(entries) as Record<ChavePref, boolean>);
    });
    void ipcService.notificacoes.list(50).then(setHistorico);
  }, []);

  async function handleToggle(chave: ChavePref, valor: boolean): Promise<void> {
    setPrefs((prev) => (prev ? { ...prev, [chave]: valor } : prev));
    await ipcService.settings.set(CHAVES[chave], valor ? '1' : '0');
  }

  if (!prefs) {
    return <div className="p-xl text-[13px] text-text-tertiary">A carregar...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-xl">
      <div className="mx-auto flex max-w-[560px] flex-col gap-lg">
        <div>
          <h2 className="mb-1 text-[15px] font-semibold text-text-primary">Avisos de Sistema</h2>
          <p className="mb-md text-[12px] text-text-tertiary">
            Cargas novas da PWA já não passam por aqui — têm o seu próprio card e ícone dedicados na página Cargas,
            na Home, e logo após o login.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium text-text-primary">Contentor parado há vários dias</p>
                <p className="text-[11px] text-text-tertiary">Avisa quando um contentor aberto fica sem novas cargas.</p>
              </div>
              <Switch checked={prefs.contentoresParados} onChange={(v) => void handleToggle('contentoresParados', v)} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium text-text-primary">Contentor a partir em breve</p>
                <p className="text-[11px] text-text-tertiary">Avisa 2 dias antes da data de partida prevista.</p>
              </div>
              <Switch checked={prefs.contentoresPartida} onChange={(v) => void handleToggle('contentoresPartida', v)} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg-app px-3 py-2.5">
              <div>
                <p className="text-[13px] font-medium text-text-primary">Backup e manutenção</p>
                <p className="text-[11px] text-text-tertiary">
                  Resultado de backups, restauros e importações de Excel — além do aviso imediato no ecrã.
                </p>
              </div>
              <Switch checked={prefs.manutencao} onChange={(v) => void handleToggle('manutencao', v)} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Histórico</h2>
          {historico == null ? (
            <p className="text-[13px] text-text-tertiary">A carregar...</p>
          ) : historico.length === 0 ? (
            <p className="text-[13px] text-text-tertiary">Ainda não há notificações.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-surface border border-border bg-bg-surface">
              {historico.map((n) => {
                const visual = TIPO_VISUAL[n.tipo];
                return (
                  <div key={n.id} className={`flex items-start gap-2.5 px-3 py-2.5 ${n.lida ? 'opacity-60' : ''}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${visual.bg}`}>
                      <visual.Icon size={15} weight="fill" className={visual.fg} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-text-primary">{n.titulo}</span>
                      {n.mensagem ? <span className="block truncate text-[11px] text-text-tertiary">{n.mensagem}</span> : null}
                      <span className="block text-[10px] text-text-tertiary">{formatRelativeTime(n.createdAt)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
