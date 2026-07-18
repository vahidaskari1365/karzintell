'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faDate, faNumber, toToman } from '@/lib/format';
import { Button, Input, PageLoading, Empty } from '@/components/ui';
import { Pagination } from '@/components/display';
import { PageHeader, tableCls, Pill, labelOf } from '../_shared';

interface CustomerRow {
  id: number; fullName: string; phone: string; email: string | null;
  status: string; createdAt: string; ordersCount?: number; totalSpent?: number; lastOrderAt?: string | null;
}

export default function AdminCustomersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search],
    queryFn: async () => api<CustomerRow[] | { items: CustomerRow[] }>(`/admin/customers${qs({ page, limit: 20, q: search || undefined })}`),
  });

  const raw: any = data?.data;
  const items: CustomerRow[] = Array.isArray(raw) ? raw : raw?.items || [];

  return (
    <div>
      <PageHeader title="مشتریان" subtitle={data ? `${faNumber(data.meta?.total || 0)} مشتری` : undefined} />
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }} className="relative mb-4 max-w-md">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام، موبایل یا ایمیل…" className="ps-9" />
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </form>

      {isLoading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <Empty title="مشتری‌ای یافت نشد" />
      ) : (
        <>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>مشتری</th>
                  <th className={tableCls.th}>تماس</th>
                  <th className={tableCls.th}>سفارش‌ها</th>
                  <th className={tableCls.th}>مجموع خرید</th>
                  <th className={tableCls.th}>عضویت</th>
                  <th className={tableCls.th}>وضعیت</th>
                  <th className={tableCls.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className={tableCls.row}>
                    <td className={tableCls.td}><span className="font-medium">{c.fullName}</span></td>
                    <td className={tableCls.td}>
                      <p className="text-xs" dir="ltr">{c.phone}</p>
                      {c.email && <p className="text-2xs text-slate-400" dir="ltr">{c.email}</p>}
                    </td>
                    <td className={tableCls.td}>{faNumber(c.ordersCount ?? 0)}</td>
                    <td className={tableCls.td}>{c.totalSpent != null ? toToman(c.totalSpent) : '—'}</td>
                    <td className={tableCls.td}><span className="text-xs text-slate-400">{faDate(c.createdAt)}</span></td>
                    <td className={tableCls.td}><Pill status={c.status} label={labelOf({ active: 'فعال', pending: 'در انتظار', suspended: 'معلق' }, c.status)} /></td>
                    <td className={`${tableCls.td} text-left`}>
                      <Link href={`/admin/customers/${c.id}`}><Button size="sm" variant="secondary">پرونده</Button></Link>
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
