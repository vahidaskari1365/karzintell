'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { OrderDetailType } from '@/lib/types';
import { PageLoading, Empty } from '@/components/ui';
import { Invoice } from '@/components/invoice';

export default function OrderInvoicePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', code],
    queryFn: async () => (await api<OrderDetailType>(`/me/orders/${code}`)).data,
  });

  if (isLoading) return <PageLoading />;
  if (error || !order) return <Empty title="فاکتور یافت نشد" description="این سفارش متعلق به شما نیست یا حذف شده است." />;

  return (
    <div className="py-8">
      <Link href={`/account/orders/${code}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 print:hidden">
        <ArrowRight className="h-4 w-4" /> بازگشت به جزئیات سفارش
      </Link>
      <Invoice order={order} />
    </div>
  );
}
