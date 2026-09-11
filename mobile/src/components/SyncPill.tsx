interface SyncPillProps {
  open: boolean;
  pendentes: number;
  ultimaLabel: string;
  erros: number;
  onSincronizar: () => void;
}

// Painel pequeno que "nasce" do FAB (docs/26 §6) — centro de
// notificações dedicado a cargas (pendentes/última sync/erros),
// separado das notificações gerais (essas vivem na ilha dinâmica).
export function SyncPill({ open, pendentes, ultimaLabel, erros, onSincronizar }: SyncPillProps): React.JSX.Element {
  return (
    <div
      className="fixed bottom-[104px] right-5 z-[55]"
      style={{
        transformOrigin: 'bottom right',
        transform: open ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.9)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'transform .3s cubic-bezier(.3,.9,.35,1.05), opacity .25s ease',
      }}
    >
      <div
        className="w-[250px] rounded-[18px] border border-border-strong p-3.5"
        style={{ background: 'rgba(22,29,38,0.97)', boxShadow: '0 18px 40px -12px rgba(0,0,0,0.6)' }}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-warning" />
          <span className="text-[12.5px] font-semibold text-text-primary">Sincronização de cargas</span>
        </div>
        <div className="flex items-center justify-between py-1 text-[12px] text-text-secondary">
          <span>Pendentes</span>
          <b className="font-semibold text-text-primary">
            {pendentes} carga{pendentes === 1 ? '' : 's'}
          </b>
        </div>
        <div className="flex items-center justify-between py-1 text-[12px] text-text-secondary">
          <span>Última sincronização</span>
          <b className="font-semibold text-text-primary">{ultimaLabel}</b>
        </div>
        {erros > 0 ? (
          <div className="flex items-center justify-between py-1 text-[12px] text-text-secondary">
            <span>Erros</span>
            <b className="font-semibold text-error">
              {erros} carga{erros === 1 ? '' : 's'}
            </b>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onSincronizar}
          className="mt-2 w-full rounded-[11px] border border-border-strong bg-glass-strong py-2.5 text-[12.5px] font-semibold text-text-primary"
        >
          Sincronizar agora
        </button>
      </div>
    </div>
  );
}
