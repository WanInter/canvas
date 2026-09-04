'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'ghost' | 'danger';
export type ControlSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Readonly<{
  variant?: ButtonVariant;
  size?: ControlSize;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
}>;

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:ring-offset-2';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  loadingLabel,
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  children,
  ...props
}, ref) {
  const tones: Record<ButtonVariant, string> = {
    primary: 'border-accent bg-accent text-white hover:border-accent-hover hover:bg-accent-hover',
    secondary: 'border-line bg-surface text-ink hover:border-line-strong hover:bg-subtle',
    neutral: 'border-ink bg-ink text-white hover:opacity-90',
    ghost: 'border-transparent bg-transparent text-secondary hover:bg-subtle hover:text-ink',
    danger: 'border-danger bg-danger text-white hover:brightness-95',
  };
  const sizes: Record<ControlSize, string> = {
    sm: 'min-h-[var(--ui-control-height-sm)] px-2.5 text-xs',
    md: 'min-h-[var(--ui-control-height-md)] px-3.5 text-sm',
    lg: 'min-h-[var(--ui-control-height-lg)] px-4 text-sm',
  };

  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={props['aria-label'] ?? (loading && typeof children === 'string' ? loadingLabel ?? children : undefined)}
      className={`relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control border font-bold transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''} ${sizes[size]} ${tones[variant]} ${FOCUS} ${className}`}
    >
      {loadingLabel ? (
        <span className="grid">
          <span className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 ${loading ? 'invisible' : ''}`}>{children}</span>
          <span className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 ${loading ? '' : 'invisible'}`}><ButtonProgress />{loadingLabel}</span>
        </span>
      ) : <>{loading ? <span className="absolute inset-0 grid place-items-center"><ButtonProgress /></span> : null}<span className={`inline-flex items-center justify-center gap-2 ${loading ? 'invisible' : ''}`}>{children}</span></>}
    </button>
  );
});

function ButtonProgress({ className = '' }: Readonly<{ className?: string }>) {
  return (
    <span className={`inline-flex size-4 items-center justify-center gap-0.5 ${className}`} aria-hidden="true">
      <span className="size-1 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
      <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:120ms] motion-reduce:animate-none" />
      <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:240ms] motion-reduce:animate-none" />
    </span>
  );
}
