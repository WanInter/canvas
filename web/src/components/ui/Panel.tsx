import type { HTMLAttributes } from 'react';

type PanelVariant = 'plain' | 'framed' | 'raised';

export function Panel({ variant = 'plain', className = '', ...props }: HTMLAttributes<HTMLElement> & Readonly<{ variant?: PanelVariant }>) {
  const variants: Record<PanelVariant, string> = {
    plain: 'bg-surface',
    framed: 'rounded-surface border border-line bg-surface shadow-surface',
    raised: 'rounded-shell border border-line bg-raised shadow-floating',
  };
  return <section {...props} className={`${variants[variant]} ${className}`} />;
}

export function PanelHeader({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <header {...props} className={`flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 ${className}`} />;
}

export function PanelBody({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`min-h-0 px-4 py-3 ${className}`} />;
}

export function PanelFooter({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <footer {...props} className={`flex min-h-12 items-center justify-between gap-3 border-t border-line px-4 ${className}`} />;
}
