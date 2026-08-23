'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertTriangle, MessageSquareWarning, ShoppingBag, Ticket, TrendingUp, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faNumber, toToman } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/types';
import { PageLoading, Card } from '@/components/ui';
import { PageHeader, tableCls, Pill } from './_shared';

interface Dashboard {
  salesToday: { total: number; count: number };
  salesMonth: { total: number; count: number };
  orderStats: { pendingPayment: number; paid: number; processing: number; readyToShip: number };
  counts: {
    users: number; products: number; publishedProducts: number;
    pendingReviews: number; pendingQuestions: number; openTickets: number; lowStock: number;
  };
  chart: Array<{ day: string; total: number; count: number }>;
  recentOrders: Array<{ id: number; code: string; status: string; grandTotal: number; createdAt: string; customerName: string }>;
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => (await api<Dashboard>('/admin/dashboard')).data,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return <PageLoading />;
  const maxChart = Math.max(1, ...data.chart.map((c) => c.total));

  const kpis = [
    { label: 'فروش امروز', value: `${toToman(data.salesToday.total)} تومان`, sub: `${faNumber(data.salesToday.count)} سفارش`, icon: <TrendingUp className="h-5 w-5" />, cls: 'bg-emerald-500' },
    { label: 'فروش این ماه', value: `${toToman(data.salesMonth.total)} تومان`, sub: `${faNumber(data.salesMonth.count)} سفارش`, icon: <ShoppingBag className="h-5 w-5" />, cls: 'bg-sky-500' },
    { label: 'کاربران', value: faNumber(data.counts.users), sub: `${faNumber(data.counts.publishedProducts)} محصول منتشرشده`, icon: <Users className="h-5 w-5" />, cls: 'bg-violet-500' },
    { label: 'کم‌موجودی انبار', value: faNumber(data.counts.lowStock), sub: 'اقلام نیازمند شارژ', icon: <AlertTriangle className="h-5 w-5" />, cls: 'bg-amber-500', href: '/admin/inventory?low=1' },
  ];

  return (
    <div>
      <PageHeader title="داشبورد" subtitle="نمای کلی عملکرد فروشگاه" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const inner = (
            <Card className="flex items-center gap-3 p-4">
              <span className={`rounded-2xl p-3 text-white ${k.cls}`}>{k.icon}</span>
              <div className="min-w-0">
                <p className="text-2xs text-slate-400">{k.label}</p>
                <p className="truncate text-base font-black text-slate-900">{k.value}</p>
                <p className="text-2xs text-slate-400">{k.sub}</p>
              </div>
            </Card>
          );
          return k.href ? <Link key={k.label} href={k.href}>{inner}</Link> : <div key={k.label}>{inner}</div>;
        })}
      </div>

      {/* کارهای در انتظار */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'دیدگاه‌های در انتظار', count: data.counts.pendingReviews, href: '/admin/reviews', icon: <MessageSquareWarning className="h-4 w-4" /> },
          { label: 'پرسش‌های بی‌پاسخ', count: data.counts.pendingQuestions, href: '/admin/reviews?tab=questions', icon: <MessageSquareWarning className="h-4 w-4" /> },
          { label: 'تیکت‌های باز', count: data.counts.openTickets, href: '/admin/tickets', icon: <Ticket className="h-4 w-4" /> },
          { label: 'سفارش آماده ارسال', count: data.orderStats.readyToShip, href: '/admin/orders?status=ready_to_ship', icon: <ShoppingBag className="h-4 w-4" /> },
        ].map((w) => (
          <Link key={w.label} href={w.href}>
            <Card className={`flex items-center justify-between p-3.5 transition hover:border-orange-300 ${w.count > 0 ? 'border-orange-200 bg-orange-50/50' : ''}`}>
              <span className="flex items-center gap-2 text-xs text-slate-600">{w.icon}{w.label}</span>
              <span className={`text-base font-black ${w.count > 0 ? 'text-orange-600' : 'text-slate-300'}`}>{faNumber(w.count)}</span>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* نمودار فروش ۱۴ روز */}
        <Card className="p-5 lg:col-span-3">
          <p className="mb-4 text-sm font-bold text-slate-800">فروش ۱۴ روز گذشته</p>
          {data.chart.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-400">هنوز فروشی ثبت نشده است</p>
          ) : (
            <div className="flex h-44 items-end gap-1.5">
              {data.chart.map((c) => (
                <div key={c.day} className="group relative flex-1">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-orange-300 transition group-hover:from-orange-600"
                    style={{ height: `${Math.max(4, (c.total / maxChart) * 100)}%`, minHeight: 4 }}
                  />
                  <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-2xs text-white group-hover:block" style={{ left: '50%' }}>
                    {toToman(c.total)} تومان
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* آخرین سفارش‌ها */}
        <Card className="p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <p className="text-sm font-bold text-slate-800">آخرین سفارش‌ها</p>
            <Link href="/admin/orders" className="text-xs text-orange-600">همه</Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {data.recentOrders.slice(0, 7).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{o.code}</p>
                    <p className="text-2xs text-slate-400">{o.customerName}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800">{toToman(o.grandTotal)}</p>
                    <Pill status={o.status} label={ORDER_STATUS_LABELS[o.status] || o.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
