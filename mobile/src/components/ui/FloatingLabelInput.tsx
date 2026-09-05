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
  // Controlo opcional dentro do campo, alinhado à direita (ex: estado de
  // pagamento no campo Valor). Reserva espaço para não sobrepor o texto.
  rightSlot?: ReactNode;
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

// text-[18px] (não <16px) — evita o auto-zoom do iOS ao focar o campo, e
// fica maior para se ler bem o que se escreve, sem negrito (peso normal,
// a legibilidade vem do tamanho, não do peso). Padding vertical SIMÉTRICO
// (py-3) — já não precisa de reservar espaço por baixo de uma legenda que
// fica sempre visível: agora a legenda desaparece por completo assim que
// há valor (ver `mostrarLabel`), por isso o texto fica centrado no eixo Y
// tal como no eixo X, sem viés para baixo. O padding-left NUNCA é
// duplicado (só existe uma classe pl-* de cada vez) — combinar px-3 com
// pl-11 já causou uma sobreposição de ícone com texto difícil de depurar.
const BASE_FIELD =
  'peer w-full rounded-control border border-border/60 bg-bg-input pr-3 py-3 text-[18px] font-normal text-text-primary outline-none transition-shadow focus:border-primary focus:shadow-[0_0_0_2px_rgb(var(--color-primary-rgb)/0.25)] disabled:opacity-60';

const BASE_FIELD_SM =
  'peer w-full rounded-control border border-border/60 bg-bg-input pr-2.5 py-2 text-[16px] font-normal text-text-primary outline-none transition-shadow focus:border-primary focus:shadow-[0_0_0_2px_rgb(var(--color-primary-rgb)/0.25)] disabled:opacity-60';

const BASE_LABEL =
  'pointer-events-none absolute text-[16px] text-text-tertiary transition-all peer-focus:text-[11px] peer-focus:text-primary';

const BASE_LABEL_SM =
  'pointer-events-none absolute text-[14px] text-text-tertiary transition-all peer-focus:text-[10px] peer-focus:text-primary';

const LABEL_RESTING = 'top-1/2 -translate-y-1/2 peer-focus:top-3 peer-focus:translate-y-0';
const LABEL_RESTING_SM = 'top-1/2 -translate-y-1/2 peer-focus:top-1.5 peer-focus:translate-y-0';
const LABEL_FLOATED = 'top-3 translate-y-0 text-[11px]';
const LABEL_FLOATED_SM = 'top-1.5 translate-y-0 text-[10px]';

export function FloatingLabelInput(props: FloatingLabelInputProps): React.JSX.Element {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  // Campos controlados (com `value`) recalculam a floated a cada render
  // — necessário para quando o valor chega de forma assíncrona depois
  // da montagem (ex: editar uma carga cujo prefill só resolve após uma
  // chamada à API); só os não controlados precisam de estado próprio.
  const isControlled = props.value !== undefined;
  const [hasValueNaoControlado, setHasValueNaoControlado] = useState(Boolean(props.defaultValue));

  const { label, error, className, icon: Icon, iconClassName, leftSlot, rightSlot, fieldSize = 'md', ...rest } = props;
  // Com valor preenchido, o título desaparece por completo (em vez de
  // encolher para o topo) — evita sobrepor o que o utilizador escreveu.
  // Um <select> mantém sempre a legenda pequena no topo (o valor
  // selecionado sozinho não identifica o campo tão bem como num texto
  // livre já com ícone/cor próprios).
  const isSelect = rest.as === 'select';
  const floatedByValue = isControlled ? Boolean(props.value) : hasValueNaoControlado;
  const mostrarLabel = !floatedByValue || isSelect;
  const withIcon = Boolean(Icon);
  const withSlot = Boolean(leftSlot);
  const withRightSlot = Boolean(rightSlot);
  const sm = fieldSize === 'sm';

  const iconLeftClass = sm ? 'left-2.5' : 'left-3';
  const iconSize = sm ? 15 : 18;
  const plClass = withSlot ? (sm ? 'pl-14' : 'pl-16') : withIcon ? (sm ? 'pl-8' : 'pl-10') : sm ? 'pl-2.5' : 'pl-3';
  const prClass = withRightSlot ? (sm ? 'pr-[112px]' : 'pr-[124px]') : '';
  const labelLeftClass = withSlot ? (sm ? 'left-14' : 'left-16') : withIcon ? (sm ? 'left-8' : 'left-10') : sm ? 'left-2.5' : 'left-3';

  const fieldFinalClasses = `${sm ? BASE_FIELD_SM : BASE_FIELD} ${plClass} ${prClass}`;
  const labelPositionClass = isSelect
    ? sm
      ? LABEL_FLOATED_SM
      : LABEL_FLOATED
    : sm
      ? LABEL_RESTING_SM
      : LABEL_RESTING;
  const labelFinalClasses = `${sm ? BASE_LABEL_SM : BASE_LABEL} ${labelLeftClass} ${labelPositionClass}`;

  return (
    <div className="w-full">
      <div className="relative">
        {leftSlot ? (
          <div className={`absolute z-10 ${iconLeftClass} top-1/2 -translate-y-1/2`}>{leftSlot}</div>
        ) : Icon ? (
          <Icon size={iconSize} className={`pointer-events-none absolute z-10 ${iconLeftClass} top-1/2 -translate-y-1/2 ${iconClassName ?? 'text-text-tertiary'}`} />
        ) : null}
        {rightSlot ? <div className="absolute right-1 top-1/2 z-10 -translate-y-1/2">{rightSlot}</div> : null}
        {props.as === 'textarea' ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            id={id}
            className={`${fieldFinalClasses} min-h-[80px] resize-y ${className ?? ''}`}
            onChange={(e) => {
              setHasValueNaoControlado(Boolean(e.target.value));
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
              setHasValueNaoControlado(Boolean(e.target.value));
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
              setHasValueNaoControlado(Boolean(e.target.value));
              (props as InputProps).onChange?.(e);
            }}
            placeholder={(rest as InputHTMLAttributes<HTMLInputElement>).placeholder ?? ' '}
          />
        )}
        {mostrarLabel ? (
          <label htmlFor={id} className={`${labelFinalClasses} bg-bg-input px-1 -ml-1`}>
            {label}
          </label>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-[13px] text-error">{error}</p> : null}
    </div>
  );
}
