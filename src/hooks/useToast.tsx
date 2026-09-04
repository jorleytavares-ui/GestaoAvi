// src/hooks/useToast.ts
import { useState, useCallback } from 'react';
import type { ToastType } from '../components/Toast';

export function useToast() {
  const [state, setState] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setState({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  return { toast: state, showToast, hideToast };
}
