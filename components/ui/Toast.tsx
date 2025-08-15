
'use client';

import { useEffect, useState } from 'react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

export default function Toast({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const iconStyles = {
    success: 'ri-check-line text-green-600',
    error: 'ri-error-warning-line text-red-600',
    warning: 'ri-alert-line text-yellow-600',
    info: 'ri-information-line text-blue-600'
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  return (
    <div 
      className={`fixed top-4 right-4 z-50 max-w-md w-full mx-auto transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      <div className={`border rounded-lg p-4 shadow-lg ${typeStyles[type]}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <i className={`${iconStyles[type]} text-xl`}></i>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

// 全局计数器确保唯一ID
let toastIdCounter = 0;

// Toast Manager Hook
export function useToast() {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([]);

  const addToast = (toast: ToastProps) => {
    // 🔧 修复: 使用计数器+时间戳组合确保唯一性
    toastIdCounter += 1;
    const id = `toast-${Date.now()}-${toastIdCounter}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );

  return {
    addToast,
    ToastContainer,
    success: (message: string) => addToast({ message, type: 'success' }),
    error: (message: string) => addToast({ message, type: 'error' }),
    warning: (message: string) => addToast({ message, type: 'warning' }),
    info: (message: string) => addToast({ message, type: 'info' })
  };
}
