'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export type SegmentedOption<T extends string> = Readonly<{
  value: T;
  label: ReactNode;
  disabled?: boolean;
}>;

export function SegmentedControl<T extends string>({
  value,
  options,
  label,
  onChange,
  size = 'md',
  className = '',
}: Readonly<{
  value: T;
  options: readonly SegmentedOption<T>[];
  label: string;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.map((option, index) => ({ option, index })).filter(({ option }) => !option.disabled);

  const move = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || enabled.length === 0) return;
    event.preventDefault();
    const currentEnabledIndex = Math.max(0, enabled.findIndex(({ index }) => index === currentIndex));
    const nextEnabledIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? enabled.length - 1
        : (currentEnabledIndex + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
    const next = enabled[nextEnabledIndex];
    onChange(next.option.value);
    refs.current[next.index]?.focus();
  };

  return (
    <div className={`inline-grid grid-flow-col gap-1 rounded-control bg-subtle p-1 ${className}`} role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={`inline-flex min-w-0 items-center justify-center whitespace-nowrap rounded-[calc(var(--ui-radius-control)-2px)] px-3 font-bold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${size === 'sm' ? 'min-h-7 text-xs' : 'min-h-8 text-sm'} ${selected ? 'bg-surface text-ink shadow-surface' : 'text-muted hover:bg-surface hover:text-ink'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
