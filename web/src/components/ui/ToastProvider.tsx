'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

type ToastKind = 'success' | 'error' | 'info';
type ToastInput = Readonly<{ kind: ToastKind; message: string }>;
type ToastItem = ToastInput & Readonly<{ id: number }>;
type ToastContextValue = Readonly<{ showToast: (toast: ToastInput) => void }>;

const TOAST_TTL_MS = 3600;
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [items, setItems] = useState<readonly ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((current) => [...current, { ...toast, id }].slice(-4));
    window.setTimeout(() => removeToast(id), TOAST_TTL_MS);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-20 z-[80] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3" role="status" aria-live="polite">
        {items.map((item) => <Toast key={item.id} item={item} onClose={() => removeToast(item.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

function Toast({ item, onClose }: Readonly<{ item: ToastItem; onClose: () => void }>) {
  const tone = item.kind === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : item.kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-[#dfe2f7] bg-white text-[#404040]';
  return (
    <div className={`rounded-[var(--ui-radius-shell)] border px-4 py-3 text-sm font-bold shadow-[var(--ui-shadow-floating)] ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="min-w-0 flex-1">{item.message}</span>
        <IconButton label="Close toast" onClick={onClose} className="size-7 border-transparent bg-transparent opacity-70 hover:opacity-100"><X size={14} aria-hidden="true" /></IconButton>
      </div>
    </div>
  );
}
