'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // 3초 뒤 자동 소멸하는 고성능 토스트 트리거
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* 🔮 사이버 네온 스타일의 실시간 토스트 팝업 UI */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3.5 rounded-xl border font-mono text-xs shadow-2xl flex items-center gap-3 backdrop-blur-md transition-all duration-300 ${
          toast.type === 'success' ? 'bg-[#0A1A12]/90 border-green-500/50 text-green-400 shadow-green-500/10' :
          toast.type === 'error' ? 'bg-[#1A0A0A]/90 border-red-500/50 text-red-400 shadow-red-500/10' :
          'bg-[#0A0A1A]/90 border-[#5865F2]/50 text-blue-400 shadow-[#5865F2]/10'
        }`}>
          <span className="animate-pulse text-sm">
            {toast.type === 'success' ? '⚡' : toast.type === 'error' ? '🚨' : '📡'}
          </span>
          <span className="tracking-wider uppercase">{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
