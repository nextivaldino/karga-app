import { useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

interface BaseProps {
  label: string;
  error?: string;
  // Ícone à esquerda, dentro da caixa — opcional, sem ele o campo fica
  // exatamente igual a antes. Usado com moderação (ver 08-DESIGN-SYSTEM.md),
  // não em todos os campos.
  icon?: ReactNode;
}

type InputProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };

type TextareaProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };

type SelectProps = BaseProps &
  SelectHTMLAttributes<HTMLSelectElement> & { as: 'select'; children: ReactNode };

type FloatingLabelInputProps = InputProps | TextareaProps | SelectProps;

const fieldClasses =
  'w-full rounded-control border border-border bg-bg-input px-3 py-2.5 text-[13.5px] text-text-primary outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60 placeholder:text-text-tertiary';

export function FloatingLabelInput(props: FloatingLabelInputProps): React.JSX.Element {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  // Campos controlados (com `value`) recalculam a cada render — o
  // `value` já reflete o estado atual do pai, incluindo quando este o
  // preenche de forma assíncrona depois da montagem (ex: texto gerado
  // só chega depois de uma chamada IPC). Só os não controlados
  // (`defaultValue`) precisam de estado próprio, atualizado no
  // `onChange`, porque aí não há prop viva a seguir depois do 1º render.
  const isControlled = props.value !== undefined;
  const [hasValueNaoControlado, setHasValueNaoControlado] = useState(Boolean(props.defaultValue));
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const { label, error, icon, className, ...rest } = props;
  // Todo o campo de password ganha o olho de mostrar/esconder — sem
  // precisar de nenhum caller pedir isto, já que todos os campos de
  // password da app passam por aqui (ver CLAUDE.md, "sem exceção").
  const isPassword = props.as !== 'select' && props.as !== 'textarea' && (props as InputProps).type === 'password';
  // "Preenchido" — quando true, os dados reais ficam sozinhos na caixa,
  // sem legenda nenhuma a competir com eles (o antigo padrão de legenda
  // flutuante por cima do texto atrapalhava a leitura do valor real).
  // A legenda só volta a aparecer, em ghost, quando a caixa está vazia
  // — e, já preenchida, fica disponível por tooltip nativa ao pairar o
  // rato, para quem tiver dúvidas sobre o campo.
  // `type="date"` (e afins) têm sempre conteúdo próprio do sistema
  // operativo desenhado dentro da caixa (ex: "dd/mm/aaaa" segmentado),
  // mesmo com `value=""` — tal como o `<select>`, nunca ficam realmente
  // vazios visualmente, por isso a legenda flutuante por cima ficava
  // sobreposta a esse desenho nativo, ilegível.
  const isDataNativa =
    props.as !== 'select' &&
    props.as !== 'textarea' &&
    ['date', 'time', 'month', 'week', 'datetime-local'].includes((props as InputProps).type ?? '');
  const preenchido = (isControlled ? Boolean(props.value) : hasValueNaoControlado) || rest.as === 'select' || isDataNativa;
  const withIcon = Boolean(icon);
  const fieldPadding = `${withIcon ? 'pl-9' : ''} ${isPassword ? 'pr-9' : ''}`;
  const labelPosition = withIcon ? 'left-9' : 'left-3';
  const iconTopClass = props.as === 'textarea' ? 'top-3' : 'top-1/2 -translate-y-1/2';
  const tooltip = preenchido ? label : undefined;

  return (
    <div className="w-full">
      <div className="relative">
        {icon ? (
          <span className={`pointer-events-none absolute left-3 ${iconTopClass} text-text-secondary`}>{icon}</span>
        ) : null}
        {props.as === 'textarea' ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            id={id}
            title={tooltip}
            className={`${fieldClasses} ${fieldPadding} min-h-[80px] resize-y ${className ?? ''}`}
            onChange={(e) => {
              setHasValueNaoControlado(Boolean(e.target.value));
              (props as TextareaProps).onChange?.(e);
            }}
          />
        ) : props.as === 'select' ? (
          <select
            {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
            id={id}
            title={tooltip}
            className={`${fieldClasses} ${fieldPadding} appearance-none ${className ?? ''}`}
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
            title={tooltip}
            type={isPassword ? (mostrarPassword ? 'text' : 'password') : (rest as InputProps).type}
            className={`${fieldClasses} ${fieldPadding} ${className ?? ''}`}
            onChange={(e) => {
              setHasValueNaoControlado(Boolean(e.target.value));
              (props as InputProps).onChange?.(e);
            }}
          />
        )}
        {isPassword ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setMostrarPassword((v) => !v)}
            title={mostrarPassword ? 'Esconder password' : 'Mostrar password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
          >
            {mostrarPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
        {!preenchido ? (
          <label
            htmlFor={id}
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${labelPosition} truncate text-[13px] text-text-tertiary transition-all`}
            style={{ maxWidth: `calc(100% - ${withIcon ? 44 : 24}px - ${isPassword ? 32 : 0}px)` }}
          >
            {label}
          </label>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-[12px] text-error">{error}</p> : null}
    </div>
  );
}
