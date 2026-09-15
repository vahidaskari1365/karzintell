'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * دکمه تغییر تم (روشن/تاریک)
 *
 * در پنل ادمین و سایت استفاده می‌شود.
 * با next-themes کار می‌کند: class="dark" یا class="light" روی <html> تنظیم می‌کند.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={`h-9 w-9 ${className}`} />;
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
        isDark
          ? 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-teal-500 hover:text-teal-300'
          : 'border-slate-200 bg-white text-slate-600 hover:border-teal-500 hover:text-teal-600'
      } ${className}`}
      title={isDark ? 'تغییر به تم روشن' : 'تغییر به تم تاریک'}
      aria-label="تغییر تم"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
