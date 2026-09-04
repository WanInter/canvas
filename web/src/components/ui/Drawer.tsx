'use client';

import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { IconButton } from './IconButton';
import { useOverlayFocus } from './overlayFocus';

export function Drawer({
  open,
  side = 'right',
  title,
  description,
  children,
  footer,
  closeLabel = 'Close',
  initialFocusRef,
  className = '',
  onOpenChange,
}: Readonly<{
  open: boolean;
  side?: 'left' | 'right' | 'bottom';
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  onOpenChange: (open: boolean) => void;
}>) {
  const titleId = useId();
  const descriptionId = useId();
  const containerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const requestClose = () => onOpenChange(false);
  useOverlayFocus({ containerRef, initialFocusRef: initialFocusRef ?? closeRef, enabled: open, onClose: requestClose });

  if (!open || typeof document === 'undefined') return null;
  const position = side === 'left'
    ? 'inset-y-0 left-0 w-full max-w-[var(--ui-drawer-max-width)] border-r'
    : side === 'right'
      ? 'inset-y-0 right-0 w-full max-w-[var(--ui-drawer-max-width)] border-l'
      : 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-shell border-t';
  return createPortal(
    <div className="ui-final fixed inset-0 z-overlay">
      <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 cursor-default bg-[var(--ui-overlay)]" onClick={requestClose} />
      <aside ref={containerRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1} className={`absolute z-10 flex max-h-full flex-col overflow-hidden border-line bg-raised text-ink shadow-floating ${position} ${className}`}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold leading-6 text-ink">{title}</h2>
            {description ? <div id={descriptionId} className="mt-1 text-sm leading-5 text-muted">{description}</div> : null}
          </div>
          <IconButton ref={closeRef} label={closeLabel} tone="ghost" size="sm"><X size={16} aria-hidden="true" /></IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-subtle px-4 py-3">{footer}</footer> : null}
      </aside>
    </div>,
    document.body,
  );
}
