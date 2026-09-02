import { useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

interface BaseProps {
  label: string;
  error?: string;
  // Ícone à esquerda, dentro da caixa (ex: distinguir Emissor/Recetor por
  // cor — azul/verde — sem depender só do texto da label).
  icon?: LucideIcon;
  iconClassName?: string;
  // 'sm' — campos secundários (ex: dentro da hierarquia de Emissor/Recetor),
  // mais baixos que o normal; o texto fica sempre ≥16px (evita zoom no iOS).
  // Nome "fieldSize" (não "size") porque <input> já tem um atributo HTML
  // nativo `size: number` — usar o mesmo nome colidia e dava `never`.
  fieldSize?: 'md' | 'sm';
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };
type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };
type SelectProps = BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { as: 'select'; children: ReactNode };

type FloatingLabelInputProps = InputProps | TextareaProps | SelectProps;

// text-[16px] (não 14px) — evita o auto-zoom do iOS ao focar um input com
// menos de 16px; py-3 dá um alvo de toque confortável (≥44px de altura).
const fieldClasses =
  'peer w-full rounded-control border border-border bg-bg-input px-3 pb-2.5 pt-6 text-[16px] text-text-primary outline-none transition-colors focus:border-primary disabled:opacity-60';

const fieldClassesSm =
  'peer w-full rounded-control border border-border bg-bg-input px-2.5 pb-1 pt-4 text-[16px] text-text-primary outline-none transition-colors focus:border-primary disabled:opacity-60';

const labelClasses =
  'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-text-tertiary transition-all peer-focus:top-3.5 peer-focus:text-[12px] peer-focus:text-primary';

const labelClassesSm =
  'pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-text-tertiary transition-all peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-primary';

const labelFloatedClasses = 'top-3.5 text-[12px]';
const labelFloatedClassesSm = 'top-1.5 text-[10px]';

export function FloatingLabelInput(props: FloatingLabelInputProps): React.JSX.Element {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [hasValue, setHasValue] = useState(Boolean(props.value ?? props.defaultValue));

  const { label, error, className, icon: Icon, iconClassName, fieldSize = 'md', ...rest } = props;
  const floated = hasValue || rest.as === 'select';
  const withIcon = Boolean(Icon);
  const sm = fieldSize === 'sm';
  const iconLeftClass = sm ? 'left-2.5' : 'left-3.5';
  const iconSize = sm ? 15 : 19;
  const fieldPlClass = withIcon ? (sm ? 'pl-8' : 'pl-11') : '';
  const labelLeftClass = withIcon ? (sm ? 'left-8' : 'left-11') : '';
  const fieldWithIconClasses = `${sm ? fieldClassesSm : fieldClasses} ${fieldPlClass}`;
  const labelWithIconClasses = `${sm ? labelClassesSm : labelClasses} ${labelLeftClass}`;

  return (
    <div className="w-full">
      <div className="relative">
        {Icon ? (
          <Icon size={iconSize} className={`pointer-events-none absolute ${iconLeftClass} top-1/2 -translate-y-1/2 ${iconClassName ?? 'text-text-tertiary'}`} />
        ) : null}
        {props.as === 'textarea' ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            id={id}
            className={`${fieldWithIconClasses} min-h-[88px] resize-y ${className ?? ''}`}
            onChange={(e) => {
              setHasValue(Boolean(e.target.value));
              (props as TextareaProps).onChange?.(e);
            }}
            placeholder={(rest as TextareaHTMLAttributes<HTMLTextAreaElement>).placeholder ?? ' '}
          />
        ) : props.as === 'select' ? (
          <select
            {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
            id={id}
            className={`${fieldWithIconClasses} ${sm ? 'min-h-[38px]' : 'min-h-touch'} appearance-none ${className ?? ''}`}
            onChange={(e) => {
              setHasValue(Boolean(e.target.value));
              (props as SelectProps).onChange?.(e);
            }}
          >
            {(props as SelectProps).children}
          </select>
        ) : (
          <input
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
            id={id}
            className={`${fieldWithIconClasses} ${sm ? 'min-h-[38px]' : 'min-h-touch'} ${className ?? ''}`}
            onChange={(e) => {
              setHasValue(Boolean(e.target.value));
              (props as InputProps).onChange?.(e);
            }}
            placeholder={(rest as InputHTMLAttributes<HTMLInputElement>).placeholder ?? ' '}
          />
        )}
        <label htmlFor={id} className={`${labelWithIconClasses} ${floated ? (sm ? labelFloatedClassesSm : labelFloatedClasses) : ''} bg-bg-input px-1 -ml-1`}>
          {label}
        </label>
      </div>
      {error ? <p className="mt-1 text-[13px] text-error">{error}</p> : null}
    </div>
  );
}
