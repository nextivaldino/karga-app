import { useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { Icon as LucideIcon } from '@phosphor-icons/react';

interface BaseProps {
  label: string;
  error?: string;
  // Ícone à esquerda, dentro da caixa (ex: distinguir Emissor/Recetor por
  // cor — azul/verde — sem depender só do texto da label).
  icon?: LucideIcon;
  iconClassName?: string;
  // Alternativa ao ícone: conteúdo interativo à esquerda (ex: seletor de
  // indicativo telefónico "+352 ▾"). Mais largo que um ícone — reserva um
  // padding-left maior. Nunca usado ao mesmo tempo que `icon`.
  leftSlot?: ReactNode;
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

// text-[17px] (não <16px) — evita o auto-zoom do iOS ao focar o campo, e
// fica um pouco maior para se ler bem o que se escreve. Vertical mais
// compacto (pt-4.5/pb-1.5) do que a versão anterior, sem perder o alvo de
// toque (min-h-touch trata da altura mínima). O padding-left NUNCA é
// duplicado (só existe uma classe pl-* de cada vez) — combinar px-3 com
// pl-11 já causou uma sobreposição de ícone com texto difícil de depurar.
// Borda mais leve (border-border/60, não a cor cheia) — visual mais "flat",
// menos pesado, sem perder a distinção entre campo e fundo.
const BASE_FIELD =
  'peer w-full rounded-control border border-border/60 bg-bg-input pr-3 pb-1.5 pt-[18px] text-[17px] text-text-primary outline-none transition-colors focus:border-primary disabled:opacity-60';

const BASE_FIELD_SM =
  'peer w-full rounded-control border border-border/60 bg-bg-input pr-2.5 pb-1 pt-[14px] text-[16px] text-text-primary outline-none transition-colors focus:border-primary disabled:opacity-60';

const BASE_LABEL =
  'pointer-events-none absolute top-1/2 -translate-y-1/2 text-[16px] text-text-tertiary transition-all peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-primary';

const BASE_LABEL_SM =
  'pointer-events-none absolute top-1/2 -translate-y-1/2 text-[14px] text-text-tertiary transition-all peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-primary';

const LABEL_FLOATED = 'top-3 text-[11px]';
const LABEL_FLOATED_SM = 'top-1.5 text-[10px]';

export function FloatingLabelInput(props: FloatingLabelInputProps): React.JSX.Element {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [hasValue, setHasValue] = useState(Boolean(props.value ?? props.defaultValue));

  const { label, error, className, icon: Icon, iconClassName, leftSlot, fieldSize = 'md', ...rest } = props;
  const floated = hasValue || rest.as === 'select';
  const withIcon = Boolean(Icon);
  const withSlot = Boolean(leftSlot);
  const sm = fieldSize === 'sm';

  const iconLeftClass = sm ? 'left-2.5' : 'left-3';
  const iconSize = sm ? 15 : 18;
  const plClass = withSlot ? (sm ? 'pl-14' : 'pl-16') : withIcon ? (sm ? 'pl-8' : 'pl-10') : sm ? 'pl-2.5' : 'pl-3';
  const labelLeftClass = withSlot ? (sm ? 'left-14' : 'left-16') : withIcon ? (sm ? 'left-8' : 'left-10') : sm ? 'left-2.5' : 'left-3';

  const fieldFinalClasses = `${sm ? BASE_FIELD_SM : BASE_FIELD} ${plClass}`;
  const labelFinalClasses = `${sm ? BASE_LABEL_SM : BASE_LABEL} ${labelLeftClass}`;

  return (
    <div className="w-full">
      <div className="relative">
        {leftSlot ? (
          <div className={`absolute z-10 ${iconLeftClass} top-1/2 -translate-y-1/2`}>{leftSlot}</div>
        ) : Icon ? (
          <Icon size={iconSize} className={`pointer-events-none absolute z-10 ${iconLeftClass} top-1/2 -translate-y-1/2 ${iconClassName ?? 'text-text-tertiary'}`} />
        ) : null}
        {props.as === 'textarea' ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            id={id}
            className={`${fieldFinalClasses} min-h-[80px] resize-y ${className ?? ''}`}
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
            className={`${fieldFinalClasses} ${sm ? 'min-h-[36px]' : 'min-h-touch'} appearance-none ${className ?? ''}`}
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
            className={`${fieldFinalClasses} ${sm ? 'min-h-[36px]' : 'min-h-touch'} ${className ?? ''}`}
            onChange={(e) => {
              setHasValue(Boolean(e.target.value));
              (props as InputProps).onChange?.(e);
            }}
            placeholder={(rest as InputHTMLAttributes<HTMLInputElement>).placeholder ?? ' '}
          />
        )}
        <label htmlFor={id} className={`${labelFinalClasses} ${floated ? (sm ? LABEL_FLOATED_SM : LABEL_FLOATED) : ''} bg-bg-input px-1 -ml-1`}>
          {label}
        </label>
      </div>
      {error ? <p className="mt-1 text-[13px] text-error">{error}</p> : null}
    </div>
  );
}
