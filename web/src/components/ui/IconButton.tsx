'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { ControlSize } from './Button';

type IconButtonTone = 'ghost' | 'secondary' | 'danger';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & Readonly<{
  label: string;
  size?: ControlSize;
  tone?: IconButtonTone;
  circular?: boolean;
}>;

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:ring-offset-2';

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({
  label,
  size = 'md',
  tone = 'secondary',
  circular = false,
  title,
  type = 'button',
  className = '',
  children,
  ...props
}, ref) {
  const sizes: Record<ControlSize, string> = {
    sm: 'size-[var(--ui-control-height-sm)]',
    md: 'size-[var(--ui-control-height-md)]',
    lg: 'size-[var(--ui-control-height-lg)]',
  };
  const tones: Record<IconButtonTone, string> = {
    ghost: 'border-transparent bg-transparent text-secondary hover:bg-subtle hover:text-ink',
    secondary: 'border-line bg-surface text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink',
    danger: 'border-transparent bg-transparent text-danger hover:border-danger hover:bg-danger-soft',
  };
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={`inline-flex shrink-0 items-center justify-center border transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${circular ? 'rounded-full' : 'rounded-control'} ${sizes[size]} ${tones[tone]} ${FOCUS} ${className}`}
    >
      {children}
    </button>
  );
});
