import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sun, Moon } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PLBrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
  className?: string;
  admin?: boolean;
}

export const PLBrandLogo: React.FC<PLBrandLogoProps> = ({
  size = 'md',
  withText = true,
  className,
  admin = false,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-11 h-11 text-xl',
  };

  return (
    <div className={cn('flex items-center gap-2.5 font-bold select-none', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-black shadow-md shadow-brand-500/20',
          iconSizes[size]
        )}
      >
        <span className="tracking-tight">PL</span>
        <span className="absolute -top-1 -right-1 text-xs font-black text-amber-300 drop-shadow">
          +
        </span>
      </div>
      {withText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1 text-slate-900 dark:text-white font-extrabold tracking-tight">
            <span>Pixelift</span>
            <span
              className={cn(
                'font-semibold text-xs px-1.5 py-0.5 rounded-full',
                admin
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                  : 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300'
              )}
            >
              {admin ? 'Admin' : 'Lite'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  isDark,
  onToggle,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Toggle dark mode"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={cn(
        'p-2 rounded-xl transition-all duration-200 border text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800',
        className
      )}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

export { FeedbackProvider, NotificationCenter, Dialog, toast, confirmAction } from './feedback';
export { LanguageProvider, useLanguage, LanguageToggle, translations } from './i18n';
export type { SupportedLanguage } from './i18n';

export {translateText,languageLocale} from './locale';
