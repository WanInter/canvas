'use client';

import { createContext, useContext, useId, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';

type TabsContextValue = Readonly<{
  baseId: string;
  value: string;
  onValueChange: (value: string) => void;
}>;

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({ value, onValueChange, id, children }: Readonly<{ value: string; onValueChange: (value: string) => void; id?: string; children: ReactNode }>) {
  const generatedId = useId();
  return <TabsContext.Provider value={{ baseId: id ?? `tabs-${generatedId}`, value, onValueChange }}>{children}</TabsContext.Provider>;
}

export function TabsList({ label, className = '', ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'aria-label'> & Readonly<{ label: string }>) {
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
    if (tabs.length === 0) return;
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click();
    tabs[next].focus();
  };
  return <div {...props} role="tablist" aria-label={label} onKeyDown={move} className={`inline-flex min-w-0 items-center gap-1 border-b border-line ${className}`} />;
}

export function TabsTrigger({ value, disabled = false, className = '', children }: Readonly<{ value: string; disabled?: boolean; className?: string; children: ReactNode }>) {
  const context = useTabsContext();
  const selected = context.value === value;
  const key = safeId(value);
  return (
    <button
      id={`${context.baseId}-tab-${key}`}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={`${context.baseId}-panel-${key}`}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => context.onValueChange(value)}
      className={`relative inline-flex min-h-10 items-center justify-center whitespace-nowrap px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-accent' : 'text-muted hover:text-ink'} ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsPanel({ value, className = '', children, ...props }: HTMLAttributes<HTMLDivElement> & Readonly<{ value: string; children: ReactNode }>) {
  const context = useTabsContext();
  const key = safeId(value);
  return (
    <div
      {...props}
      id={`${context.baseId}-panel-${key}`}
      role="tabpanel"
      aria-labelledby={`${context.baseId}-tab-${key}`}
      hidden={context.value !== value}
      tabIndex={0}
      className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-focus)] ${className}`}
    >
      {children}
    </div>
  );
}

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs components must be rendered inside Tabs');
  return context;
}

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}
