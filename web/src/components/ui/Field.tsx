'use client';

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

type FieldContextValue = Readonly<{
  controlId: string;
  describedBy?: string;
  invalid: boolean;
}>;

const FieldContext = createContext<FieldContextValue | null>(null);
const CONTROL_CLASS = 'w-full rounded-control border border-line bg-surface px-3 text-sm text-ink outline-none transition-[background-color,border-color,box-shadow] placeholder:text-muted hover:border-line-strong focus-visible:border-[var(--ui-focus)] focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)]/15 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted';

export function Field({
  id,
  label,
  description,
  error,
  optionalLabel,
  required = false,
  className = '',
  children,
}: Readonly<{
  id?: string;
  label: string;
  description?: string;
  error?: string;
  optionalLabel?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}>) {
  const generatedId = useId();
  const controlId = id ?? `field-${generatedId}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <FieldContext.Provider value={{ controlId, describedBy, invalid: Boolean(error) }}>
      <div className={`grid gap-2 ${className}`}>
        <label htmlFor={controlId} className="flex items-center justify-between gap-3 text-sm font-bold text-ink">
          <span>{label}{required ? <span className="ml-1 text-danger" aria-hidden="true">*</span> : null}</span>
          {optionalLabel ? <span className="text-xs font-medium text-muted">{optionalLabel}</span> : null}
        </label>
        {children}
        {description ? <p id={descriptionId} className="text-xs leading-5 text-muted">{description}</p> : null}
        {error ? <p id={errorId} className="text-xs font-semibold leading-5 text-danger" aria-live="polite">{error}</p> : null}
      </div>
    </FieldContext.Provider>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className = '', id, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }, ref) {
  const field = useContext(FieldContext);
  return <input {...props} ref={ref} id={id ?? field?.controlId} aria-describedby={describedBy ?? field?.describedBy} aria-invalid={invalid ?? (field?.invalid || undefined)} className={`${CONTROL_CLASS} min-h-[var(--ui-control-height-md)] ${className}`} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className = '', id, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }, ref) {
  const field = useContext(FieldContext);
  return <textarea {...props} ref={ref} id={id ?? field?.controlId} aria-describedby={describedBy ?? field?.describedBy} aria-invalid={invalid ?? (field?.invalid || undefined)} className={`${CONTROL_CLASS} min-h-24 resize-y py-2.5 leading-6 ${className}`} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = '', id, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }, ref) {
  const field = useContext(FieldContext);
  return <select {...props} ref={ref} id={id ?? field?.controlId} aria-describedby={describedBy ?? field?.describedBy} aria-invalid={invalid ?? (field?.invalid || undefined)} className={`${CONTROL_CLASS} min-h-[var(--ui-control-height-md)] ${className}`} />;
});
