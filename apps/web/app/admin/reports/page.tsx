'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, qs } from '@/lib/api-client';
import { faNumber, toToman } from '@/lib/format';
import { Button, Card, Field, Input, PageLoading, Select } from '@/components/ui';
import { PageHeader, tableCls, Pill } from '../_shared';

interface SalesReport {
  series: Array<{ period: string; total: number; discount: number; orders: number }>;
  totals: { total: number; orders: number; discount: number; tax: number };
}

export default function AdminReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');

  const { data, isLoading } = useQuery({
    queryKey: ['report-sales', from, to, groupBy],
    queryFn: async () => (await api<SalesReport>(`/admin/reports/sales${qs({ from, to, groupBy })}`)).data,
  });

  const { data: top } = useQuery({
    queryKey: ['report-top-products'],
    queryFn: async () => (await api<any[] | { items: any[] }>(`/admin/reports/top-products?limit=10`)).data,
  });
  const { data: lowStock } = useQuery({
    queryKey: ['report-low-stock'],
    queryFn: async () => (await api<any[] | { items: any[] }>(`/admin/reports/low-stock`)).data,
  });

  const maxTotal = Math.max(1, ...(data?.series || []).map((s) => s.total));
  const topItems: any[] = Array.isArray(top) ? top : (top as any)?.items || [];
  const lowItems: any[] = Array.isArray(lowStock) ? lowStock : (lowStock as any)?.items || [];

  return (
    <div>
      <PageHeader title="گزارش فروش" />

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="از تاریخ"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="تا تاریخ"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="گروه‌بندی">
            <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'day' | 'month')}>
              <option value="day">روزانه</option>
              <option value="month">ماهانه</option>
            </Select>
          </Field>
        </div>
      </Card>

      {isLoading || !data ? (
        <PageLoading />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'فروش کل', value: `${toToman(data.totals.total)} تومان` },
              { label: 'تعداد سفارش', value: faNumber(data.totals.orders) },
              { label: 'مجموع تخفیف', value: `${toToman(data.totals.discount)} تومان` },
              { label: 'مالیات', value: `${toToman(data.totals.tax)} تومان` },
            ].map((k) => (
              <Card key={k.label} className="p-4">
                <p className="text-2xs text-slate-400">{k.label}</p>
                <p className="mt-1 text-lg font-black text-slate-900">{k.value}</p>
              </Card>
            ))}
          </div>

          <Card className="mb-5 p-5">
            <p className="mb-4 text-sm font-bold text-slate-800">روند ({groupBy === 'day' ? 'روزانه' : 'ماهانه'})</p>
            {data.series.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">در این بازه فروشی ثبت نشده</p>
            ) : (
              <div className="flex h-48 items-end gap-1 overflow-x-auto pb-6">
                {data.series.map((s) => (
                  <div key={s.period} className="group relative min-w-8 flex-1">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-sky-600 to-sky-300 transition group-hover:from-sky-700"
                      style={{ height: `${Math.max(3, (s.total / maxTotal) * 180)}px` }}
                    />
                    <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-2xs text-slate-400" dir="ltr">{s.period.slice(5)}</p>
                    <div className="pointer-events-none absolute -top-12 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-2xs text-white group-hover:block">
                      {toToman(s.total)} تومان<br />{faNumber(s.orders)} سفارش
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* پرفروش‌ترین‌ها */}
        <div className={tableCls.wrap}>
          <p className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-800">پرفروش‌ترین محصولات</p>
          <table className={tableCls.table}>
            <tbody>
              {topItems.map((t: any, i: number) => (
                <tr key={t.productId || t.id || i} className={tableCls.row}>
                  <td className={tableCls.td}><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-2xs font-black text-slate-500">{faNumber(i + 1)}</span></td>
                  <td className={tableCls.td}><span className="text-xs font-medium">{t.productName || t.name}</span></td>
                  <td className={tableCls.td}>{faNumber(t.qty || t.sold || 0)} عدد</td>
                  <td className={tableCls.td}>{t.revenue != null ? `${toToman(t.revenue)} تومان` : '—'}</td>
                </tr>
              ))}
              {topItems.length === 0 && <tr><td className="p-6 text-center text-xs text-slate-400">داده‌ای نیست</td></tr>}
            </tbody>
          </table>
        </div>

        {/* کم‌موجودی */}
        <div className={tableCls.wrap}>
          <p className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-800">اقلام کم‌موجود انبار</p>
          <table className={tableCls.table}>
            <tbody>
              {lowItems.slice(0, 10).map((l: any, i: number) => (
                <tr key={l.variantId || i} className={tableCls.row}>
                  <td className={tableCls.td}><span className="text-xs font-medium">{l.productName}</span><br /><span className="text-2xs text-slate-400" dir="ltr">{l.sku}</span></td>
                  <td className={tableCls.td}><Pill status={Number(l.available ?? l.quantity) <= 0 ? 'rejected' : 'pending'} label={`${faNumber(l.available ?? l.quantity ?? 0)} عدد`} /></td>
                </tr>
              ))}
              {lowItems.length === 0 && <tr><td className="p-6 text-center text-xs text-slate-400">همه اقلام شارژ هستند 🎉</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
