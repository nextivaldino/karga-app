import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Stack as Container, Package, MagnifyingGlass as Search, User } from '@phosphor-icons/react';
import { useNavigation } from '@/hooks/useNavigation';
import { ipcService } from '@/services/ipcService';
import type { MainPage, SearchResultItem, SearchResultType } from '@/types';

const TYPE_META: Record<
  SearchResultType,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; colorClass: string; page: MainPage }
> = {
  carga: { label: 'Cargas', icon: Package, colorClass: 'text-warning', page: 'cargas' },
  contentor: { label: 'Contentores', icon: Container, colorClass: 'text-success', page: 'contentores' },
  contacto: { label: 'Contactos', icon: User, colorClass: 'text-purple', page: 'configuracoes' },
};

const FIELD_WIDTH = 200;
const COLUMN_WIDTH = 190;
const COLUMN_ORDER: SearchResultType[] = ['contacto', 'carga', 'contentor'];

// Substitui o antigo popup "Spotlight" centrado no ecrã por um campo que
// vive mesmo no cabeçalho, sempre visível (não é preciso clicar numa
// lupa para o revelar) — encostado ao lado do menu de hambúrguer, longe
// das abas, com o dropdown de resultados a sair logo por baixo dele.
export function HeaderSearch(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate } = useNavigation();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isCmdK) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!focused) return;
    function onClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    }
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, [focused]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => {
      void ipcService.search.global(query).then((items) => {
        setResults(items);
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  function handleSelect(item: SearchResultItem): void {
    navigate(TYPE_META[item.type].page, { entidadeId: item.id });
    setQuery('');
    setFocused(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key !== 'Escape') return;
    if (query) {
      setQuery('');
    } else {
      inputRef.current?.blur();
      setFocused(false);
    }
  }

  const grouped = COLUMN_ORDER.map((type) => ({ type, items: results.filter((r) => r.type === type) })).filter(
    (group) => group.items.length > 0,
  );

  const showDropdown = focused && query.trim() !== '';

  // O dropdown é portado para `document.body` (posição calculada a partir
  // do próprio campo) em vez de `absolute` dentro do cabeçalho — o
  // cabeçalho tem `relative z-10` (stacking context próprio, por causa do
  // `backdrop-blur-md`), o que prendia o dropdown lá dentro mesmo com
  // z-50: qualquer elemento flutuante da página com z-index maior que 10
  // (ex: o cartão amarelo de sincronização, z-40) pintava-se por cima do
  // cabeçalho inteiro, dropdown incluído. Portar para o body evita isto.
  useEffect(() => {
    if (!showDropdown) return;
    function updatePos(): void {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    updatePos();
    window.addEventListener('resize', updatePos);
    return () => window.removeEventListener('resize', updatePos);
  }, [showDropdown]);

  return (
    <div ref={ref} className="relative shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <div
        className={`flex items-center gap-1.5 rounded-control border bg-bg-app px-2 transition-colors ${
          focused ? 'border-primary' : 'border-transparent'
        }`}
        style={{ height: 'var(--chrome-icon-btn)', width: FIELD_WIDTH }}
      >
        <Search size={15} className="shrink-0 text-text-tertiary" />
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setFocused(true)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar em Cargas, Contentores, Contactos..."
          title="Pesquisar (Cmd+K)"
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-text-primary outline-none placeholder:text-text-tertiary"
        />
      </div>

      {showDropdown && dropdownPos
        ? createPortal(
            // Mesmo estilo do menu do seletor de contentor
            // (`ContainerPickerButton`): tema invertido (`.theme-invert`,
            // contraste tipo menu do Windows), painel opaco (sem
            // translucidez/blur), `hover:brightness-95` nas linhas.
            <div
              className="theme-invert fixed z-50 flex overflow-hidden rounded-surface border border-border bg-bg-surface shadow-lg"
              style={{
                top: dropdownPos.top,
                right: dropdownPos.right,
                width: loading || grouped.length === 0 ? COLUMN_WIDTH * 1.6 : COLUMN_WIDTH * grouped.length,
              }}
            >
              {loading ? (
                <div className="w-full p-lg text-center text-[13px] text-text-tertiary">A pesquisar...</div>
              ) : grouped.length === 0 ? (
                <div className="w-full p-lg text-center text-[13px] text-text-tertiary">Sem resultados para "{query}".</div>
              ) : (
                // Colunas lado a lado (não empilhadas) — cada tipo com
                // resultados ganha a sua própria coluna, para procurar um
                // nome mostrar de imediato, em colunas separadas, o
                // contacto, as cargas dele e o contentor onde estão, sem
                // precisar de scroll entre secções. Tipos sem resultados
                // não aparecem — evita colunas vazias a ocupar espaço.
                grouped.map((group) => {
                  const meta = TYPE_META[group.type];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={group.type}
                      className="flex shrink-0 flex-col border-r border-border last:border-r-0"
                      style={{ width: COLUMN_WIDTH }}
                    >
                      <div className="flex items-center gap-1.5 px-3.5 pb-2 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                        <Icon size={13} className={`shrink-0 ${meta.colorClass}`} />
                        <span className="truncate">{meta.label}</span>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto pb-1.5">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(item)}
                            className="block w-full px-3.5 py-2 text-left transition-colors hover:brightness-95"
                          >
                            <span className="block truncate text-[14px] text-text-primary">{item.title}</span>
                            {item.subtitle ? (
                              <span className="block truncate text-[12px] text-text-secondary">{item.subtitle}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
