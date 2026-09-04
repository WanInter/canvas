'use client';

import { useRef } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';

type ConfirmDialogProps = Readonly<{
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  open: boolean;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>;

export function ConfirmDialog({ title, description, confirmLabel, cancelLabel, open, danger = false, busy = false, onCancel, onConfirm }: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      showClose={false}
      closeLabel={cancelLabel}
      closeOnBackdrop={!busy}
      initialFocusRef={cancelButtonRef}
      onOpenChange={(nextOpen) => { if (!nextOpen && !busy) onCancel(); }}
      footer={(
        <div className="grid w-full grid-cols-2 gap-3">
          <Button ref={cancelButtonRef} variant="secondary" size="lg" disabled={busy} onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="lg" loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      )}
    />
  );
}
