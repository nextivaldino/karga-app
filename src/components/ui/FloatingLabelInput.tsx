import { useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface BaseProps {
  label: string;
  error?: string;
}

type InputProps = BaseProps &
  InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };

type TextareaProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };

type SelectProps = BaseProps &
  SelectHTMLAttributes<HTMLSelectElement> & { as: 'select'; children: ReactNode };

type FloatingLabelInputProps = InputProps | TextareaProps | SelectProps;

const fieldClasses =
  'peer w-full rounded-control border border-border bg-bg-input px-3 pb-2 pt-5 text-[14px] text-text-primary outline-none transition-colors focus:border-primary disabled:opacity-60';

const labelClasses =
  'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-text-tertiary transition-all peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-primary';

const labelFloatedClasses = 'top-3 text-[11px]';

export function FloatingLabelInput(props: FloatingLabelInputProps): React.JSX.Element {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const [hasValue, setHasValue] = useState(Boolean(props.value ?? props.defaultValue));

  const { label, error, className, ...rest } = props;
  const floated = hasValue || rest.as === 'select';

  return (
    <div className="w-full">
      <div className="relative">
        {props.as === 'textarea' ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            id={id}
            className={`${fieldClasses} min-h-[80px] resize-y ${className ?? ''}`}
            onChange={(e) => {
              setHasValue(Boolean(e.target.value));
              (props as TextareaProps).onChange?.(e);
            }}
            placeholder=" "
          />
        ) : props.as === 'select' ? (
          <select
            {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
            id={id}
            className={`${fieldClasses} appearance-none ${className ?? ''}`}
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
            className={`${fieldClasses} ${className ?? ''}`}
            onChange={(e) => {
              setHasValue(Boolean(e.target.value));
              (props as InputProps).onChange?.(e);
            }}
            placeholder=" "
          />
        )}
        <label htmlFor={id} className={`${labelClasses} ${floated ? labelFloatedClasses : ''} bg-bg-input px-1 -ml-1`}>
          {label}
        </label>
      </div>
      {error ? <p className="mt-1 text-[12px] text-error">{error}</p> : null}
    </div>
  );
}
