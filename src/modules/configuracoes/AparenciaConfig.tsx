import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function AparenciaConfig(): React.JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex-1 overflow-y-auto p-xl">
      <div className="mx-auto max-w-[560px]">
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
      </div>
    </div>
  );
}
