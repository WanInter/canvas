'use client';

import { Activity, Boxes, CreditCard, Users, FileText } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { FOCUS_RING } from './adminUtils';

export type AdminNavigationItem<T extends string> = Readonly<{
  id: T;
  label: string;
  current: number;
  total: number;
  badge?: boolean;
  tooltip?: string;
}>;

type AdminNavigationGroup<T extends string> = Readonly<{
  id: 'configuration' | 'commerce' | 'operations' | 'audience' | 'content';
  label: string;
  description: string;
  items: readonly AdminNavigationItem<T>[];
}>;

const GROUP_ICONS = {
  configuration: Boxes,
  commerce: CreditCard,
  operations: Activity,
  audience: Users,
  content: FileText,
} as const;

export function AdminWorkspaceNavigation<T extends string>({
  groups,
  activeTab,
  title,
  action,
  onChange,
}: Readonly<{
  groups: readonly AdminNavigationGroup<T>[];
  activeTab: T;
  title: string;
  action: ReactNode;
  onChange: (tab: T) => void;
}>) {
  const activeGroup = groups.find((group) => group.items.some((item) => item.id === activeTab)) ?? groups[0];
  const activeItem = activeGroup.items.find((item) => item.id === activeTab) ?? activeGroup.items[0];
  const allItems = groups.flatMap((group) => group.items);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, itemID: T) => {
    const index = allItems.findIndex((item) => item.id === itemID);
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % allItems.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + allItems.length) % allItems.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = allItems.length - 1;
    else return;
    event.preventDefault();
    const next = allItems[nextIndex];
    onChange(next.id);
    window.setTimeout(() => document.getElementById(`admin-tab-button-${next.id}`)?.focus(), 0);
  };

  return (
    <div className="admin-workspace-nav">
      <div className="admin-mobile-nav flex items-center gap-2 lg:hidden">
        <label className="min-w-0 flex-1">
          <span className="sr-only">管理区域</span>
          <select
            value={activeTab}
            onChange={(event) => onChange(event.target.value as T)}
            className={`aics-control min-h-10 w-full rounded-control px-3 text-sm font-bold text-ink ${FOCUS_RING}`}
            aria-label="选择管理区域"
          >
            {groups.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {group.items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        {action}
        {activeItem.tooltip ? <span className="sr-only" aria-live="polite">{activeItem.tooltip}</span> : null}
      </div>

      <aside className="admin-workspace-sidebar hidden lg:flex" aria-label="后台业务分组">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-3 pb-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/55">Waninter Creative</p>
            <h1 className="mt-1 text-base font-black text-white">{title}</h1>
          </div>
          <div className="admin-nav-action shrink-0">{action}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3" role="tablist" aria-label="后台管理页面">
          {groups.map((group) => {
            const Icon = GROUP_ICONS[group.id];
            return (
              <section key={group.id} className="mb-4 last:mb-0" aria-label={group.label}>
                <div className="mb-1.5 flex items-center gap-2 px-2 text-xs font-bold text-white/45" title={group.description}>
                  <Icon size={14} aria-hidden="true" />
                  <span>{group.label}</span>
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.id === activeTab;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        id={`admin-tab-button-${item.id}`}
                        role="tab"
                        aria-selected={active}
                        aria-controls={`admin-tab-panel-${item.id}`}
                        tabIndex={active ? 0 : -1}
                        onClick={() => onChange(item.id)}
                        onKeyDown={(event) => handleTabKeyDown(event, item.id)}
                        title={item.tooltip}
                        className={`admin-tab flex min-h-9 w-full items-center justify-between gap-2 rounded-control px-2.5 text-left text-sm font-bold ${FOCUS_RING}`}
                      >
                        <span className="min-w-0 truncate">{item.label}</span>
                        {item.badge !== false ? <span className="admin-mono shrink-0 text-xs tabular-nums text-current/60">{item.current}/{item.total}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        {activeItem.tooltip ? <p className="border-t border-white/10 px-3 py-3 text-xs font-semibold leading-5 text-white/55">{activeItem.tooltip}</p> : null}
      </aside>
    </div>
  );
}
