import { Container, Package, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ipcService } from '@/services/ipcService';
import { useNavigation } from '@/hooks/useNavigation';
import type { MainPage, SearchResultItem, SearchResultType } from '@/types';

const TYPE_META: Record<
  SearchResultType,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; colorClass: string; page: MainPage }
> = {
  carga: { label: 'Cargas', icon: Package, colorClass: 'text-warning', page: 'cargas' },
  contentor: { label: 'Contentores', icon: Container, colorClass: 'text-success', page: 'contentores' },
  contacto: { label: 'Contactos', icon: User, colorClass: 'text-purple', page: 'configuracoes' },
};

export function GlobalSearch(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { navigate } = useNavigation();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isCmdK) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [open]);

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

  if (!open) return <></>;

  function handleSelect(item: SearchResultItem): void {
    navigate(TYPE_META[item.type].page, { entidadeId: item.id });
    setOpen(false);
  }

  const grouped = (['carga', 'contentor', 'contacto'] as const)
    .map((type) => ({ type, items: results.filter((r) => r.type === type) }))
    .filter((group) => group.items.length > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[60vh] w-full max-w-[560px] flex-col overflow-hidden rounded-surface border border-border bg-bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <Search size={18} className="text-text-tertiary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar em Cargas, Contentores e Contactos..."
            className="flex-1 bg-transparent text-[14px] text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <kbd className="rounded-control bg-bg-input px-1.5 py-0.5 text-[11px] text-text-tertiary">Esc</kbd>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!query.trim() ? (
            <div className="p-lg text-center text-[13px] text-text-tertiary">
              Escreva para pesquisar em Cargas, Contentores e Contactos.
            </div>
          ) : loading ? (
            <div className="p-lg text-center text-[13px] text-text-tertiary">A pesquisar...</div>
          ) : grouped.length === 0 ? (
            <div className="p-lg text-center text-[13px] text-text-tertiary">Sem resultados para "{query}".</div>
          ) : (
            grouped.map((group) => {
              const meta = TYPE_META[group.type];
              const Icon = meta.icon;
              return (
                <div key={group.type} className="border-b border-border last:border-b-0">
                  <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                    {meta.label}
                  </div>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-bg-app"
                    >
                      <Icon size={16} className={`shrink-0 ${meta.colorClass}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-text-primary">{item.title}</span>
                        {item.subtitle ? (
                          <span className="block truncate text-[12px] text-text-tertiary">{item.subtitle}</span>
                        ) : null}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
