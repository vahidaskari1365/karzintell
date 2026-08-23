'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faDateTime, faNumber, toToman } from '@/lib/format';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/types';
import { Input, PageLoading, Select, Empty, Button } from '@/components/ui';
import { Pagination } from '@/components/display';
import { PageHeader, tableCls, Pill, labelOf } from '../_shared';

interface OrderRow {
  id: number; code: string; status: string; statusLabel: string; paymentStatus: string;
  grandTotal: number; placedAt: string | null; createdAt: string;
  customerName: string; customerPhone: string;
}

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, status, search],
    queryFn: async () =>
      api<OrderRow[]>(`/admin/orders${qs({ page, limit: 20, status: status || undefined, q: search || undefined })}`),
  });

  const items = data?.data || [];

  return (
    <div>
      <PageHeader title="سفارش‌ها" subtitle={data ? `${faNumber(data.meta?.total || 0)} سفارش` : undefined} />

      <div className="mb-4 flex flex-wrap gap-2">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }} className="relative min-w-56 flex-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="کد سفارش، نام یا موبایل مشتری…" className="ps-9" />
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </form>
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="max-w-48">
          <option value="">همه وضعیت‌ها</option>
          {ORDER_STATUSES.map((st) => <option key={st} value={st}>{ORDER_STATUS_LABELS[st]}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <Empty title="سفارشی یافت نشد" />
      ) : (
        <>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>کد سفارش</th>
                  <th className={tableCls.th}>مشتری</th>
                  <th className={tableCls.th}>مبلغ (تومان)</th>
                  <th className={tableCls.th}>وضعیت</th>
                  <th className={tableCls.th}>پرداخت</th>
                  <th className={tableCls.th}>تاریخ</th>
                  <th className={tableCls.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id} className={tableCls.row}>
                    <td className={tableCls.td}><span className="font-bold" dir="ltr">{o.code}</span></td>
                    <td className={tableCls.td}>
                      <p className="font-medium">{o.customerName}</p>
                      <p className="text-2xs text-slate-400" dir="ltr">{o.customerPhone}</p>
                    </td>
                    <td className={tableCls.td}>{toToman(o.grandTotal)}</td>
                    <td className={tableCls.td}><Pill status={o.status} label={o.statusLabel} /></td>
                    <td className={tableCls.td}>
                      <Pill status={o.paymentStatus} label={labelOf({ paid: 'پرداخت‌شده', unpaid: 'پرداخت‌نشده', failed: 'ناموفق', partially_refunded: 'عودت جزئی', refunded: 'عودت‌شده' }, o.paymentStatus)} />
                    </td>
                    <td className={tableCls.td}><span className="text-xs text-slate-400">{faDateTime(o.createdAt)}</span></td>
                    <td className={`${tableCls.td} text-left`}>
                      <Link href={`/admin/orders/${o.id}`}><Button size="sm" variant="secondary">جزئیات</Button></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={data?.meta?.total || 0} onPage={setPage} />
        </>
      )}
    </div>
  );
}
