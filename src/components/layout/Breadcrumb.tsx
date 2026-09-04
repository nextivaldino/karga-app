import { CaretRight } from '@phosphor-icons/react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// Trilha clicável estilo path bar do Finder — cada segmento antes do
// último volta a esse nível; o último é sempre o "onde estás agora",
// sem clique. Substitui os links de texto soltos tipo "‹ Voltar".
export function Breadcrumb({ items }: BreadcrumbProps): React.JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-1 text-[13px]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 ? <CaretRight size={12} className="shrink-0 text-text-tertiary" /> : null}
            {isLast || !item.onClick ? (
              <span className={`truncate ${isLast ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                {item.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="truncate text-text-secondary transition-colors hover:text-primary"
              >
                {item.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
