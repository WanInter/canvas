import type { HTMLAttributes } from 'react';

export function Toolbar({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} role={props.role ?? 'toolbar'} className={`flex min-h-[var(--ui-toolbar-height)] min-w-0 items-center gap-2 border-b border-line bg-surface px-3 ${className}`} />;
}

export function ToolbarGroup({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`flex min-w-0 items-center gap-1.5 ${className}`} />;
}

export function ToolbarSeparator({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} role="separator" aria-orientation="vertical" className={`mx-1 h-5 w-px shrink-0 bg-line ${className}`} />;
}
