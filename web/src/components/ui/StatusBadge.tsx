import type { ReactNode } from 'react';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function StatusBadge({ tone = 'neutral', children, className = '' }: Readonly<{ tone?: StatusTone; children: ReactNode; className?: string }>) {
  const tones: Record<StatusTone, string> = {
    neutral: 'bg-subtle text-secondary',
    info: 'bg-accent-soft text-accent',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
  };
  return <span className={`inline-flex min-h-6 items-center rounded-full px-2 py-0.5 text-xs font-bold ${tones[tone]} ${className}`}>{children}</span>;
}
