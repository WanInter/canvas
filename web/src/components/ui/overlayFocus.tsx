'use client';

import { useEffect, type RefObject } from 'react';

export function useOverlayFocus(ref: RefObject<HTMLElement>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const element = ref.current;
    const previousActiveElement = document.activeElement as HTMLElement;

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = element.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (firstFocusable) {
      firstFocusable.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement && document.body.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, ref]);
}
