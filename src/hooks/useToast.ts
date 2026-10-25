import { useState, useCallback, useRef } from 'react';
import { ToastMessage, ToastType } from '../types/toast';

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timeoutsRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (options: { type: ToastType; title: string; message: string; duration?: number }) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const duration = options.duration ?? 5000;

      const newToast: ToastMessage = {
        id,
        type: options.type,
        title: options.title,
        message: options.message,
        duration,
      };

      setToasts((prev) => [...prev.slice(-3), newToast]); // Keep at most 4 simultaneous toasts

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, duration);
        timeoutsRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast]
  );

  return {
    toasts,
    showToast,
    dismissToast,
  };
}
