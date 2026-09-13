import React from 'react';
import { X } from 'lucide-react';
import { AuthCard } from './AuthCard';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl">
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shadow-md"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <AuthCard initialMode={initialMode} onSuccess={onClose} />
      </div>
    </div>
  );
};
