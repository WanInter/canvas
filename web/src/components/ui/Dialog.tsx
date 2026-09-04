'use client';

import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useId, useRef, type ReactNode, type RefObject } from 'react';
import { IconButton } from './IconButton';
import { useOverlayFocus } from './overlayFocus';

export function Dialog({
  open,
  title,
  description,
  children,
  footer,
  size = 'md',
  showClose = true,
  closeLabel = 'Close',
  closeOnBackdrop = true,
  initialFocusRef,
  className = '',
  onOpenChange,
}: Readonly<{
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showClose?: boolean;
  closeLabel?: string;
  closeOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  onOpenChange: (open: boolean) => void;
}>) {
  const titleId = useId();
  const descriptionId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const requestClose = () => onOpenChange(false);
  useOverlayFocus({ containerRef, initialFocusRef: initialFocusRef ?? closeRef, enabled: open, onClose: requestClose });

  if (!open || typeof document === 'undefined') return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-[var(--ui-dialog-max-width)]', lg: 'max-w-3xl' };
  return createPortal(
    <div className="ui-final fixed inset-0 z-overlay flex items-center justify-center overflow-y-auto overscroll-contain p-4">
      <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 cursor-default bg-[var(--ui-overlay)]" onClick={closeOnBackdrop ? requestClose : undefined} />
      <div ref={containerRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1} className={`relative z-10 flex max-h-[min(90dvh,860px)] w-full flex-col overflow-hidden rounded-shell border border-line bg-raised text-ink shadow-floating ${widths[size]} ${className}`}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold leading-6 text-ink">{title}</h2>
            {description ? <div id={descriptionId} className="mt-1 text-sm leading-6 text-muted">{description}</div> : null}
          </div>
          {showClose ? <IconButton ref={closeRef} label={closeLabel} tone="ghost" size="sm"><X size={16} aria-hidden="true" /></IconButton> : null}
        </header>
        {children ? <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div> : null}
        {footer ? <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-subtle px-5 py-4">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
