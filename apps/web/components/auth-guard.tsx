'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, hasPermission } from '@/lib/auth-store';
import { refreshAccessToken } from '@/lib/api-client';
import { PageLoading } from './ui';

/**
 * گارد کلاینت: نیازمند ورود (و در صورت نیاز مجوز خاص).
 */
export function AuthGuard({ permission, children }: { permission?: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (permission && !hasPermission(user, permission)) router.replace('/');
  }, [hydrated, user, permission, router, pathname]);

  if (!hydrated) return <PageLoading />;
  if (!user) return <PageLoading label="در حال انتقال به صفحه ورود…" />;
  if (permission && !hasPermission(user, permission))
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-slate-500">
        دسترسی به این بخش برای حساب شما فعال نیست.
      </div>
    );
  return <>{children}</>;
}

/** فراخوانی silent login هنگام لود کل اپ */
export function useSilentAuth() {
  const { hydrated, accessToken, setHydrated } = useAuthStore();
  useEffect(() => {
    if (hydrated) return;
    (async () => {
      if (!accessToken) await refreshAccessToken();
      setHydrated();
    })();
  }, [hydrated, accessToken, setHydrated]);
}
