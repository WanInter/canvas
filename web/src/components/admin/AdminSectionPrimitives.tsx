'use client';

import { AlertTriangle, CheckCircle2, Loader2, Save, X } from 'lucide-react';
import { useLayoutEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayFocus } from '@/components/ui/overlayFocus';
import { FOCUS_RING } from './adminUtils';


export type ConfirmDialogState = Readonly<{
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning';
  onConfirm: () => void;
}>;

export function ConfirmDialog({ state, inline = false, onClose }: Readonly<{ state?: ConfirmDialogState; inline?: boolean; onClose: () => void }>) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useOverlayFocus({ containerRef: dialogRef, initialFocusRef: confirmRef, enabled: Boolean(state), onClose });
  if (!state || typeof document === 'undefined') return null;
  const danger = state.tone === 'danger';
  const content = (
    <div className="ui-final fixed inset-0 z-critical flex items-end justify-center bg-[var(--ui-overlay)] p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onMouseDown={onClose}>
      <div ref={dialogRef} tabIndex={-1} className="w-full max-w-[440px] overflow-hidden rounded-t-shell border border-line bg-surface shadow-floating sm:rounded-shell" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex gap-3">
            <span className={`mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'}`}><AlertTriangle size={18} /></span>
            <div>
              <h3 id="confirm-dialog-title" className="text-base font-black text-ink">{state.title}</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-secondary">{state.description}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={`rounded-full p-2 text-secondary hover:bg-subtle hover:text-ink ${FOCUS_RING}`} aria-label="关闭"><X size={16} /></button>
        </div>
        <div className="flex justify-end gap-2 bg-subtle px-5 py-4">
          <button type="button" onClick={onClose} className={`rounded-control border border-line bg-surface px-4 py-2 text-sm font-black text-secondary hover:border-line-strong hover:text-ink ${FOCUS_RING}`}>{state.cancelLabel ?? '取消'}</button>
          <button ref={confirmRef} type="button" onClick={() => { state.onConfirm(); onClose(); }} className={`rounded-control px-4 py-2 text-sm font-black text-white ${danger ? 'bg-danger hover:brightness-95' : 'bg-warning hover:brightness-95'} ${FOCUS_RING}`}>{state.confirmLabel ?? '确认'}</button>
        </div>
      </div>
    </div>
  );
  return inline ? content : createPortal(content, document.body);
}

export function EmptyState({ icon, title, description }: Readonly<{ icon: React.ReactNode; title: string; description: string }>) {
  return (
    <div className="admin-surface rounded-surface p-10 text-center">
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-surface border border-line bg-surface text-secondary">
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-black text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-6 text-secondary">{description}</p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'slate',
}: Readonly<{
  label: string;
  value: string;
  hint?: string;
  tone?: 'slate' | 'indigo' | 'emerald' | 'amber';
}>) {
  const toneClassName = tone === 'indigo'
    ? 'text-accent'
    : tone === 'emerald'
      ? 'text-success'
      : tone === 'amber'
        ? 'text-warning'
        : 'text-ink';

  return (
    <div className={`rounded-surface border border-line bg-surface px-3.5 py-3 ${toneClassName}`}>
      <div className="admin-mono text-xs font-black text-muted">{label}</div>
      <div className="admin-mono mt-2 text-2xl font-black text-current">{value}</div>
      {hint ? <p className="mt-1 text-xs font-semibold text-secondary">{hint}</p> : null}
    </div>
  );
}

export function StatusBadge({ active, activeLabel, inactiveLabel }: Readonly<{ active: boolean; activeLabel: string; inactiveLabel: string }>) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold text-secondary">
      <CheckCircle2 size={13} className={active ? 'text-success' : 'text-muted'} aria-hidden="true" />
      {active ? activeLabel : inactiveLabel}
    </div>
  );
}

export function PrimaryButton({ children, loading, disabled, onClick }: Readonly<{ children: React.ReactNode; loading?: boolean; disabled?: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-accent bg-accent px-3.5 py-2 text-sm font-black text-white transition duration-150 hover:border-accent-hover hover:bg-accent-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  icon,
  disabled,
  loading,
  onClick,
}: Readonly<{
  children: React.ReactNode;
  icon: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-control border border-line bg-surface px-3.5 py-2 text-sm font-black text-secondary transition duration-150 hover:border-line-strong hover:bg-subtle hover:text-ink active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
    >
      <span aria-hidden="true">{loading ? <Loader2 size={16} className="animate-spin" /> : icon}</span>
      {children}
    </button>
  );
}

export function InlineBadge({ children, tone = 'indigo' }: Readonly<{ children: React.ReactNode; tone?: 'indigo' | 'emerald' | 'slate' | 'amber' }>) {
  const toneClassName = tone === 'emerald'
    ? 'border border-success bg-success-soft text-success'
    : tone === 'slate'
      ? 'border border-line bg-subtle text-secondary'
      : tone === 'amber'
        ? 'border border-warning bg-warning-soft text-warning'
        : 'border border-accent bg-accent-soft text-accent';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ${toneClassName}`}>{children}</span>;
}

export function SectionHeader({ icon, eyebrow, title, subtitle }: Readonly<{ icon: React.ReactNode; eyebrow: string; title?: string; subtitle?: string }>) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 text-xs font-black text-secondary">
        <span aria-hidden="true">{icon}</span>
        {eyebrow}
      </div>
      {title ? <h2 className="mt-1.5 text-lg font-black text-ink">{title}</h2> : null}
      {subtitle ? <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-secondary">{subtitle}</p> : null}
    </div>
  );
}

export function Field({ htmlFor, label, error, changed, children }: Readonly<{ htmlFor?: string; label: string; error?: string; changed?: boolean; children: React.ReactNode }>) {
  return (
    <div className="block">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="admin-mono mb-1.5 flex items-center gap-1.5 text-xs font-black text-secondary">
          <span>{label}</span>
          {changed ? <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-xs text-warning">已修改</span> : null}
        </label>
      ) : (
        <span className="admin-mono mb-1.5 flex items-center gap-1.5 text-xs font-black text-secondary">
          <span>{label}</span>
          {changed ? <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-xs text-warning">已修改</span> : null}
        </span>
      )}
      {children}
      {error ? <p className="mt-1.5 text-xs font-semibold text-danger" aria-live="polite">{error}</p> : null}
    </div>
  );
}

export function FilterPill({
  active,
  onClick,
  children,
  count,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold transition duration-150 active:translate-y-px ${active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-secondary hover:border-line-strong hover:bg-subtle hover:text-ink'} ${FOCUS_RING}`}
    >
      <span>{children}</span>
      {typeof count === 'number' ? <span className="admin-mono rounded-full bg-black/5 px-1.5 py-0.5 text-xs font-black">{count}</span> : null}
    </button>
  );
}

export function AdminTableFrame({ children, minWidth = 960, className = '' }: Readonly<{ children: React.ReactNode; minWidth?: number; className?: string }>) {
  return (
    <div className={`overflow-hidden rounded-surface border border-line bg-surface ${className}`}>
      <div className="overflow-x-auto">
        <div style={{ minWidth }} className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AdminTableHeaderRow({ columns, children }: Readonly<{ columns: string; children: React.ReactNode }>) {
  return (
    <div className={`grid ${columns} items-center gap-2 border-b border-line bg-subtle px-3 py-2.5 text-xs font-black text-secondary`}>
      {children}
    </div>
  );
}

export function AdminTableRow({ columns, children, active, muted, className = '' }: Readonly<{ columns: string; children: React.ReactNode; active?: boolean; muted?: boolean; className?: string }>) {
  return (
    <div className={`grid ${columns} items-center gap-2 border-b border-line px-3 py-2.5 text-sm last:border-b-0 ${active ? 'bg-accent-soft' : muted ? 'bg-subtle/80' : 'bg-surface'} hover:bg-subtle ${className}`}>
      {children}
    </div>
  );
}

export function AdminModal({ open, title, subtitle, badge, children, onClose }: Readonly<{ open: boolean; title: string; subtitle?: string; badge?: React.ReactNode; children: React.ReactNode; onClose: () => void }>) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useOverlayFocus({ containerRef: modalRef, initialFocusRef: closeRef, enabled: open, onClose });

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="ui-final fixed inset-0 z-overlay flex items-stretch justify-end p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-[var(--ui-overlay)] backdrop-blur-sm" />
      <div ref={modalRef} tabIndex={-1} className="relative flex h-[100dvh] w-full max-w-[1120px] flex-col overflow-hidden border border-line bg-surface shadow-floating sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-shell" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {badge}
              <h3 id="admin-modal-title" className="truncate text-lg font-black text-ink">{title}</h3>
            </div>
            {subtitle ? <p className="mt-1 break-words text-xs font-semibold leading-5 text-secondary">{subtitle}</p> : null}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className={`rounded-full p-2 text-secondary hover:bg-subtle hover:text-ink ${FOCUS_RING}`} aria-label="关闭"><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-subtle p-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function EmptyList({ title }: Readonly<{ title: string }>) {
  return <div className="rounded-surface border border-dashed border-line bg-surface px-4 py-6 text-center text-sm font-semibold text-muted">{title}</div>;
}

export function AdminMobileCard({
  title,
  subtitle,
  badge,
  children,
  action,
}: Readonly<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}>) {
  return (
    <article className="rounded-surface border border-line bg-surface p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="min-w-0 break-words text-sm font-black leading-5 text-ink">{title}</h3>
          {subtitle ? <div className="mt-1 min-w-0 break-words text-xs font-semibold leading-5 text-secondary">{subtitle}</div> : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
      {action ? <div className="mt-3 border-t border-line pt-3">{action}</div> : null}
    </article>
  );
}

export function AdminKeyValueGrid({ items }: Readonly<{ items: readonly Readonly<{ label: string; value: React.ReactNode }>[] }>) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-black text-muted">{item.label}</dt>
          <dd className="mt-0.5 min-w-0 break-words text-xs font-bold text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type ViewportPosition = { top: number; left: number };

export function useViewportContainedPosition(
  enabled: boolean,
  position: ViewportPosition | null,
  elementRef: RefObject<HTMLElement | null>,
  setPosition: Dispatch<SetStateAction<ViewportPosition | null>>,
): void {
  useLayoutEffect(() => {
    if (!enabled || !position || !elementRef.current) return;
    const margin = 12;
    const rect = elementRef.current.getBoundingClientRect();
    const top = Math.min(Math.max(margin, position.top), Math.max(margin, window.innerHeight - rect.height - margin));
    const left = Math.min(Math.max(margin, position.left), Math.max(margin, window.innerWidth - rect.width - margin));
    if (top !== position.top || left !== position.left) setPosition({ top, left });
  }, [elementRef, enabled, position, setPosition]);
}
