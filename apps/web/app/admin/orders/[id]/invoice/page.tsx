'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { OrderDetailType } from '@/lib/types';
import { PageLoading, Empty } from '@/components/ui';
import { Invoice } from '@/components/invoice';

export default function AdminOrderInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: async () => (await api<OrderDetailType>(`/admin/orders/${id}`)).data,
  });

  if (isLoading) return <PageLoading />;
  if (error || !order) return <Empty title="سفارش یافت نشد" />;

  return (
    <div className="py-6">
      <Link href={`/admin/orders/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 print:hidden">
        <ArrowRight className="h-4 w-4" /> بازگشت به سفارش
      </Link>
      <Invoice order={order} />
    </div>
  );
}
