import { House, Gear } from '@phosphor-icons/react';
import { useNavigation } from '@/hooks/useNavigation';

// Cabeçalho de navegação numa só linha: Início (casa) à esquerda,
// Cargas/Contactos centrados como pills, Definições (engrenagem) à
// direita. Sem título de app nem abas a deslizar — os 4 destinos cabem
// todos, sempre visíveis, sem nada fixo no fundo do ecrã.
export function Header(): React.JSX.Element {
  const { page, navigate } = useNavigation();

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-bg-app px-4 py-2.5"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}
    >
      <button
        type="button"
        onClick={() => navigate('home')}
        title="Início"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          page === 'home' ? 'bg-primary text-white' : 'text-text-tertiary active:bg-bg-input'
        }`}
      >
        <House size={19} weight={page === 'home' ? 'fill' : 'regular'} />
      </button>

      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={() => navigate('cargas')}
          className={`flex h-8 items-center rounded-pill px-4 text-[13px] font-semibold transition-colors ${
            page === 'cargas' ? 'bg-primary text-white' : 'bg-bg-input text-text-secondary active:bg-border'
          }`}
        >
          Cargas
        </button>
        <button
          type="button"
          onClick={() => navigate('contactos')}
          className={`flex h-8 items-center rounded-pill px-4 text-[13px] font-semibold transition-colors ${
            page === 'contactos' ? 'bg-primary text-white' : 'bg-bg-input text-text-secondary active:bg-border'
          }`}
        >
          Contactos
        </button>
      </div>

      <button
        type="button"
        onClick={() => navigate('definicoes')}
        title="Definições"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          page === 'definicoes' ? 'bg-primary text-white' : 'text-text-tertiary active:bg-bg-input'
        }`}
      >
        <Gear size={19} weight={page === 'definicoes' ? 'fill' : 'regular'} />
      </button>
    </div>
  );
}
