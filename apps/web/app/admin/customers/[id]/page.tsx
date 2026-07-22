'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { use } from 'react';
import { ArrowRight, MapPin, ShoppingBag, Star, Wallet as WalletIcon } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faDate, faDateTime, faNumber, toToman } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/types';
import { Card, PageLoading } from '@/components/ui';
import { PageHeader, tableCls, Pill, labelOf } from '../../_shared';

/** پرونده ۳۶۰ درجه مشتری */
export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: d, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: async () => (await api<any>(`/admin/customers/${id}`)).data,
  });

  if (isLoading || !d) return <PageLoading />;
  const user = d.user || d;

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Link href="/admin/customers" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900">
          <ArrowRight className="h-4.5 w-4.5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900">{user.fullName}</h1>
          <p className="mt-0.5 text-xs text-slate-400" dir="ltr">{user.phone}{user.email ? ` · ${user.email}` : ''}</p>
        </div>
        <Pill status={user.status} label={labelOf({ active: 'فعال', pending: 'در انتظار', suspended: 'معلق' }, user.status)} />
      </div>

      {d.stats && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'تعداد سفارش', value: faNumber(d.stats.ordersCount ?? d.stats.orders ?? 0), icon: <ShoppingBag className="h-4 w-4" /> },
            { label: 'مجموع خرید', value: `${toToman(d.stats.totalSpent ?? 0)} تومان`, icon: <ShoppingBag className="h-4 w-4" /> },
            { label: 'موجودی کیف پول', value: `${toToman(d.wallet?.balance ?? d.stats.walletBalance ?? 0)} تومان`, icon: <WalletIcon className="h-4 w-4" /> },
            { label: 'دیدگاه‌ها', value: faNumber(d.stats.reviewsCount ?? 0), icon: <Star className="h-4 w-4" /> },
          ].map((k) => (
            <Card key={k.label} className="p-4">
              <p className="mb-1 flex items-center gap-1.5 text-2xs text-slate-400">{k.icon}{k.label}</p>
              <p className="text-base font-black text-slate-900">{k.value}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-0 lg:col-span-2">
          <p className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-800">آخرین سفارش‌ها</p>
          <div className="overflow-x-auto">
            <table className={tableCls.table}>
              <tbody>
                {(d.orders || d.recentOrders || []).slice(0, 10).map((o: any) => (
                  <tr key={o.id} className={tableCls.row}>
                    <td className={tableCls.td}><Link href={`/admin/orders/${o.id}`} className="font-bold text-orange-600" dir="ltr">{o.code}</Link></td>
                    <td className={tableCls.td}><Pill status={o.status} label={ORDER_STATUS_LABELS[o.status] || o.statusLabel || o.status} /></td>
                    <td className={tableCls.td}>{toToman(o.grandTotal)}</td>
                    <td className={tableCls.td}><span className="text-xs text-slate-400">{faDateTime(o.createdAt)}</span></td>
                  </tr>
                ))}
                {(d.orders || d.recentOrders || []).length === 0 && (
                  <tr><td className="p-6 text-center text-xs text-slate-400">سفارشی ندارد</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800"><MapPin className="h-4 w-4" /> آدرس‌ها</p>
          {(d.addresses || []).length === 0 ? (
            <p className="text-xs text-slate-400">آدرسی ثبت نشده</p>
          ) : (
            <ul className="space-y-2 text-xs leading-6 text-slate-600">
              {d.addresses.map((a: any) => (
                <li key={a.id} className="rounded-xl border border-slate-100 p-3">
                  <p className="font-bold text-slate-700">{a.title}</p>
                  <p>{a.province}، {a.city} — {a.address}</p>
                  <p className="text-slate-400" dir="ltr">{a.receiverPhone}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 border-t border-slate-100 pt-3 text-2xs text-slate-400">عضویت: {faDate(user.createdAt)}</p>
          {user.lastLoginAt && <p className="text-2xs text-slate-400">آخرین ورود: {faDateTime(user.lastLoginAt)}</p>}
        </Card>
      </div>
    </div>
  );
}
