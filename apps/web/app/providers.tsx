'use client';

import { ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/toast';
import { useSilentAuth } from '@/components/auth-guard';

function SilentAuth() {
  useSilentAuth();
  return null;
}

/** ثبت سرویس‌ورکر اعلان‌ها */
function ServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SilentAuth />
      <ServiceWorker />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
