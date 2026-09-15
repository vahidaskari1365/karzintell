'use client';

/* ==========================================================================
   داشبورد فروشنده — نمای کلی عملکرد فروشگاه
   --------------------------------------------------------------------------
   - کارت‌های آماری: کل محصولات، سفارش‌های در جریان، درآمد کل، وضعیت پروفایل
   - آخرین سفارش‌ها (۵ مورد)
   - آخرین محصولات (۵ مورد)
   - حالت اسکلتون هنگام بارگذاری
   ========================================================================== */

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  BadgeCheck, Clock, Package, ShoppingBag, Store, TrendingUp, Wallet,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { faNumber, toToman, faDateTime } from '@/lib/format';
import {
  ORDER_STATUS_LABELS, PRODUCT_STATUS_LABELS,
  PageHeader, Pill, SkeletonCard, VendorStatCard, VendorEmptyState,
  VendorGuard, SellerStatusBanner, useSellerProfile,
  type SellerDashboard, type SellerOrder, type SellerProduct,
} from './_shared';
import { Card } from '@/components/ui';

export default function VendorDashboardPage() {
  return (
    <VendorGuard>
      <DashboardContent />
    </VendorGuard>
  );
}

function DashboardContent() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: async () => (await api<SellerDashboard>('/seller/dashboard')).data,
    refetchInterval: 60_000,
  });

  const profileQ = useSellerProfile();

  // آخرین سفارش‌ها و محصولات (هر کدام ۵ مورد) — مستقل از داشبورد
  const ordersQ = useQuery({
    queryKey: ['seller-orders', 1, 5],
    queryFn: async () =>
      (await api<SellerOrder[]>('/seller/orders?page=1&limit=5')).data,
  });
  const productsQ = useQuery({
    queryKey: ['seller-products', 1, 5],
    queryFn: async () =>
      (await api<SellerProduct[]>('/seller/products?page=1&limit=5')).data,
  });

  if (isLoading || !dashboard) {
    return (
      <div>
        <PageHeader title="داشبورد" subtitle="نمای کلی عملکرد فروشگاه شما" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
        </div>
      </div>
    );
  }

  const s = dashboard.stats;
  const profile = dashboard.profile;

  const kpis = [
    {
      label: 'کل محصولات', value: faNumber(s.totalProducts),
      sub: `${faNumber(s.publishedProducts)} منتشرشده · ${faNumber(s.draftProducts)} پیش‌نویس`,
      icon: Package, tone: 'emerald' as const, href: '/vendor/products',
    },
    {
      label: 'سفارش‌های در جریان', value: faNumber(s.pendingOrders),
      sub: `${faNumber(s.deliveredOrders)} تحویل‌شده · ${faNumber(s.totalOrders)} کل`,
      icon: ShoppingBag, tone: 'amber' as const, href: '/vendor/orders',
    },
    {
      label: 'درآمد ناخالص', value: toToman(s.grossRevenue),
      sub: `خالص: ${toToman(s.netRevenue)}`,
      icon: TrendingUp, tone: 'sky' as const,
    },
    {
      label: 'وضعیت پروفایل', value: profile.status === 'approved' ? 'تأییدشده' : 'در انتظار',
      sub: `کمیسیون: ${faNumber(profile.commissionRate)}٪`,
      icon: profile.status === 'approved' ? BadgeCheck : Clock,
      tone: (profile.status === 'approved' ? 'emerald' : 'amber') as 'emerald' | 'amber',
      href: '/vendor/profile',
    },
  ];

  return (
    <div>
      <PageHeader
        title="داشبورد فروشنده"
        subtitle={`${profile.storeName} — خلاصه‌ی عملکرد فروشگاه شما`}
      />

      {profileQ.data && <div className="mb-4"><SellerStatusBanner profile={profileQ.data} /></div>}

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <VendorStatCard
            key={k.label}
            label={k.label}
            value={k.value}
            sub={k.sub}
            icon={k.icon}
            tone={k.tone}
            href={k.href}
          />
        ))}
      </div>

      {/* خلاصه مالی */}
      <Card className="mt-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-2xs text-slate-400">درآمد ناخالص</p>
            <p className="mt-1 text-lg font-black text-slate-100">{toToman(s.grossRevenue)}</p>
          </div>
          <div>
            <p className="text-2xs text-slate-400">کمیسیون پلتفرم ({faNumber(profile.commissionRate)}٪)</p>
            <p className="mt-1 text-lg font-black text-rose-300">− {toToman(s.commissionAmount)}</p>
          </div>
          <div>
            <p className="text-2xs text-slate-400">درآمد خالص شما</p>
            <p className="mt-1 text-lg font-black text-emerald-300">{toToman(s.netRevenue)}</p>
          </div>
        </div>
      </Card>

      {/* آخرین سفارش‌ها و محصولات */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* آخرین سفارش‌ها */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <ShoppingBag className="h-4 w-4 text-emerald-400" /> آخرین سفارش‌ها
            </p>
            <Link href="/vendor/orders" className="text-xs text-emerald-400 hover:underline">همه</Link>
          </div>
          {ordersQ.isLoading ? (
            <div className="px-5 py-10 text-center text-xs text-slate-400">در حال بارگذاری…</div>
          ) : !ordersQ.data?.length ? (
            <div className="px-5 py-10 text-center text-xs text-slate-400">هنوز سفارشی ثبت نشده است</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {ordersQ.data.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <Link href="/vendor/orders" className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.03]">
                    <div>
                      <p className="text-xs font-bold text-slate-100" dir="ltr">{o.code}</p>
                      <p className="text-2xs text-slate-400">{faDateTime(o.createdAt)}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-100">
                        {toToman(o.sellerItems.reduce((sum, it) => sum + it.totalPrice, 0))}
                      </p>
                      <Pill status={o.status} label={ORDER_STATUS_LABELS[o.status] || o.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* آخرین محصولات */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Package className="h-4 w-4 text-emerald-400" /> آخرین محصولات
            </p>
            <Link href="/vendor/products" className="text-xs text-emerald-400 hover:underline">همه</Link>
          </div>
          {productsQ.isLoading ? (
            <div className="px-5 py-10 text-center text-xs text-slate-400">در حال بارگذاری…</div>
          ) : !productsQ.data?.length ? (
            <div className="px-5 py-10 text-center text-xs text-slate-400">
              هنوز محصولی اضافه نکرده‌اید
              <div className="mt-3">
                <Link href="/vendor/products/new" className="text-xs text-emerald-400 hover:underline">افزودن اولین محصول</Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {productsQ.data.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/vendor/products/${p.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-100">{p.name}</p>
                      <p className="text-2xs text-slate-400" dir="ltr">{p.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.minPrice != null && (
                        <span className="text-xs font-bold text-slate-100">{toToman(p.minPrice)}</span>
                      )}
                      <Pill status={p.status} label={PRODUCT_STATUS_LABELS[p.status] || p.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* دعوت به اقدام در صورت خالی بودن */}
      {s.totalProducts === 0 && (
        <div className="mt-6">
          <VendorEmptyState
            icon={Store}
            title="فروشگاه شما آماده‌ی اولین محصول است"
            description="اولین محصول خود را اضافه کنید تا فروش را آغاز کنید."
            action={
              <Link href="/vendor/products/new" className="mt-2 inline-flex">
                <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
                  <Package className="h-4 w-4" /> افزودن محصول
                </span>
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
