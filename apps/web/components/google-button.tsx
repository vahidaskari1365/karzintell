'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { toast, useAuthStore } from '@/lib/auth-store';

/**
 * دکمه ورود با گوگل (Google OAuth)
 *
 * از Google Identity Services (GIS) استفاده می‌کند — روی مرورگر کاربر اجرا می‌شود
 * و id_token را به backend ما می‌فرستد. backend توکن را اعتبارسنجی می‌کند و
 * کاربر را وارد می‌کند (یا حساب جدید می‌سازد با status=pending).
 *
 * نیاز به env var دارد: NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * اگر تنظیم نشده باشد، دکمه نمایش داده نمی‌شود.
 */

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// Load Google Identity Services script
let gisLoaded = false;
function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject('server');
    if (gisLoaded && (window as any).google?.accounts?.id) return resolve();
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => {
        gisLoaded = true;
        resolve();
      });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = () => reject('failed to load Google script');
    document.head.appendChild(script);
  });
}

export function GoogleButton({
  label = 'ورود با گوگل',
  variant = 'login',
}: {
  label?: string;
  variant?: 'login' | 'register';
}) {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  if (!GOOGLE_CLIENT_ID) {
    // اگر Google Client ID تنظیم نشده، دکمه نمایش داده نمی‌شود
    return null;
  }

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loadGoogleScript();
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        toast.error('بارگذاری گوگل ناموفق بود');
        return;
      }

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          if (!response.credential) {
            toast.error('ورود با گوگل ناموفق بود');
            setLoading(false);
            return;
          }
          try {
            const { data } = await api<{ accessToken?: string; user?: any }>(
              '/auth/google',
              {
                method: 'POST',
                body: { idToken: response.credential },
                auth: false,
              }
            );
            if (data.accessToken && data.user) {
              setAuth(data.accessToken, data.user);
              toast.success(`خوش آمدید ${data.user.fullName}`);
              router.push('/');
            } else {
              toast.info('حساب شما ایجاد شد ولی در انتظار تأیید ادمین است');
              router.push('/login');
            }
          } catch (e: any) {
            // خطای USER_PENDING → کاربر باید صبر کند
            if (e?.code === 'USER_PENDING') {
              toast.info(e.message || 'حساب شما در انتظار تأیید مدیر است');
              router.push('/login');
            } else {
              toast.error(e?.message || 'خطا در ورود با گوگل');
            }
          } finally {
            setLoading(false);
          }
        },
      });

      // نمایش پنجره انتخاب اکانت گوگل
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // fallback: open OneTap dialog
          google.accounts.id.renderButton(
            document.createElement('div'),
            { theme: 'outline', size: 'large' }
          );
        }
        setLoading(false);
      });
    } catch (e) {
      toast.error('بارگذاری گوگل ناموفق بود');
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <svg className="h-5 w-5 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      <span>{loading ? 'در حال اتصال…' : label}</span>
    </button>
  );
}
