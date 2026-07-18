'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { OrderType, ORDER_STATUS_COLORS } from '@/lib/types';
import { Card, Empty, PageLoading } from '@/components/ui';
import { Pagination } from '@/components/display';
import { faDate, toToman } from '@/lib/format';

export default function MyOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', page],
    queryFn: async () => api<OrderType[]>(`/me/orders?page=${page}&limit=10`),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">سفارش‌های من</h1>
      {(data?.data || []).length === 0 && <Empty title="هنوز سفارشی ثبت نکرده‌اید" action={<Link href="/search" className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">شروع خرید</Link>} />}
      {(data?.data || []).map((o) => (
        <Link key={o.id} href={`/account/orders/${o.code}`}>
          <Card className="flex flex-wrap items-center justify-between gap-3 transition-shadow hover:shadow-md">
            <div>
              <span className="font-bold text-slate-900" dir="ltr">{o.code}</span>
              <span className="ms-3 text-xs text-slate-400">{faDate(o.createdAt)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold">{toToman(o.grandTotal)}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${ORDER_STATUS_COLORS[o.status] || 'bg-slate-100'}`}>
                {o.statusLabel}
              </span>
            </div>
          </Card>
        </Link>
      ))}
      <Pagination page={page} limit={10} total={data?.meta?.total || 0} onPage={setPage} />
    </div>
  );
}
