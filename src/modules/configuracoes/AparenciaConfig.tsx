import { Moon, Sun, SpeakerHigh, SpeakerSlash, Pulse } from '@phosphor-icons/react';
import { useTheme } from '@/hooks/useTheme';
import { usePreferenciasUI } from '@/hooks/usePreferenciasUI';

// ── Toggle switch reutilizável ────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        checked ? 'bg-primary' : 'bg-border'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ── Linha de opção com toggle ─────────────────────────────────────────────────
function OpcaoToggle({
  id,
  icon,
  label,
  descricao,
  checked,
  onChange,
}: {
  id: string;
  icon: React.ReactNode;
  label: string;
  descricao: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.JSX.Element {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-control border border-border bg-bg-app px-4 py-3 transition-colors hover:bg-bg-surface"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-bg-surface text-text-secondary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-text-primary">{label}</span>
        <span className="block text-[12px] text-text-tertiary">{descricao}</span>
      </span>
      <Toggle id={id} checked={checked} onChange={onChange} />
    </label>
  );
}

export function AparenciaConfig(): React.JSX.Element {
  const { theme, setTheme } = useTheme();
  const { badgePulse, setBadgePulse, notifSound, setNotifSound } = usePreferenciasUI();

  return (
    <div className="flex-1 overflow-y-auto p-xl">
      <div className="mx-auto max-w-[560px] flex flex-col gap-xl">

        {/* ── Tema ── */}
        <section>
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Tema</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex flex-1 flex-col items-center gap-2 rounded-surface border px-6 py-5 transition-colors ${
                theme === 'light' ? 'border-primary bg-primary/10' : 'border-border hover:bg-bg-app'
              }`}
            >
              <Sun size={24} className={theme === 'light' ? 'text-primary' : 'text-text-secondary'} />
              <span className={`text-[13px] font-medium ${theme === 'light' ? 'text-primary' : 'text-text-primary'}`}>
                Claro
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex flex-1 flex-col items-center gap-2 rounded-surface border px-6 py-5 transition-colors ${
                theme === 'dark' ? 'border-primary bg-primary/10' : 'border-border hover:bg-bg-app'
              }`}
            >
              <Moon size={24} className={theme === 'dark' ? 'text-primary' : 'text-text-secondary'} />
              <span className={`text-[13px] font-medium ${theme === 'dark' ? 'text-primary' : 'text-text-primary'}`}>
                Escuro
              </span>
            </button>
          </div>
        </section>

        {/* ── Alertas e Animações ── */}
        <section>
          <h2 className="mb-md text-[15px] font-semibold text-text-primary">Alertas e Animações</h2>
          <p className="mb-sm text-[13px] text-text-tertiary">
            Personaliza os sinais visuais e sonoros quando chegam novas cargas da PWA.
          </p>
          <div className="flex flex-col gap-2">
            <OpcaoToggle
              id="pref-badge-pulse"
              icon={<Pulse size={18} weight="duotone" />}
              label="Animação pulsante no badge"
              descricao="O contador de sincronização pisca suavemente para chamar atenção."
              checked={badgePulse}
              onChange={setBadgePulse}
            />
            <OpcaoToggle
              id="pref-notif-sound"
              icon={
                notifSound
                  ? <SpeakerHigh size={18} weight="duotone" />
                  : <SpeakerSlash size={18} weight="duotone" />
              }
              label="Som ao receber nova carga"
              descricao='Um "ding" suave quando a PWA envia novas cargas para o sistema.'
              checked={notifSound}
              onChange={setNotifSound}
            />
          </div>
        </section>

      </div>
    </div>
  );
}
