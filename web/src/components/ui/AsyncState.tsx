import type { HTMLAttributes, ReactNode } from 'react';

export function EmptyState({ icon, title, description, action, compact = false, className = '' }: Readonly<{
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}>) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'px-4 py-6' : 'px-6 py-10'} ${className}`}>
      {icon ? <div className="mb-3 text-muted">{icon}</div> : null}
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm leading-6 text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} aria-hidden="true" className={`animate-pulse rounded-control bg-subtle motion-reduce:animate-none ${className}`} />;
}

export function InlineMessage({ tone = 'info', children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & Readonly<{ tone?: 'info' | 'success' | 'warning' | 'danger'; children: ReactNode }>) {
  const tones = {
    info: 'border-line bg-subtle text-secondary',
    success: 'border-success/20 bg-success-soft text-success',
    warning: 'border-warning/20 bg-warning-soft text-warning',
    danger: 'border-danger/20 bg-danger-soft text-danger',
  };
  return <div {...props} className={`rounded-control border px-3 py-2 text-sm font-semibold leading-5 ${tones[tone]} ${className}`}>{children}</div>;
}
