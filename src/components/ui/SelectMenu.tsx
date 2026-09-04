import { useState } from 'react';
import { Check, CaretDown as ChevronDown } from '@phosphor-icons/react';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';

export interface SelectMenuOption<T extends string> {
  value: T;
  label: string;
}

interface SelectMenuProps<T extends string> {
  value: T;
  options: SelectMenuOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
}

// Substitui o `<select>` nativo — o menu nativo do SO abre para cima
// perto do fundo da janela e usa cores/tema fora do nosso controlo
// (aparece escuro mesmo em tema claro). Reaproveita o `ContextMenu` já
// existente: abre sempre por baixo do gatilho, com o mesmo visual do
// resto do design system.
export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  className,
}: SelectMenuProps<T>): React.JSX.Element {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const selected = options.find((o) => o.value === value);

  const items: ContextMenuItem[] = options.map((option) => ({
    key: option.value,
    label: option.label,
    icon: option.value === value ? <Check size={14} className="text-primary" /> : <span className="inline-block w-[14px]" />,
    onClick: () => onChange(option.value),
  }));

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setPos({ x: rect.left, y: rect.bottom + 4 });
        }}
        className={
          className ??
          'flex h-9 items-center gap-2 rounded-control border border-border bg-bg-input px-2 text-[13px] text-text-primary outline-none transition-colors hover:bg-bg-app'
        }
      >
        <span className="truncate">{selected?.label ?? placeholder ?? 'Selecionar'}</span>
        <ChevronDown size={14} className="shrink-0 text-text-tertiary" />
      </button>
      <ContextMenu open={pos != null} x={pos?.x ?? 0} y={pos?.y ?? 0} items={items} onClose={() => setPos(null)} />
    </>
  );
}
