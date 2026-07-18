'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faNumber } from '@/lib/format';

export function NotificationsBell() {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const { data } = await api<{ unread: number }>('/me/notifications?limit=1');
      return data.unread || 0;
    },
    refetchInterval: 60_000,
    retry: false,
  });

  return (
    <Link href="/account/notifications" className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100">
      <Bell className="h-5.5 w-5.5" />
      {(data || 0) > 0 && (
        <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
          {faNumber(data!)}
        </span>
      )}
    </Link>
  );
}
