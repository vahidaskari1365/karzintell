'use client';

/* ==========================================================================
   پنل فروشنده (Vendor) — اجزای مشترک، انواع، هوک‌ها و گاردها
   --------------------------------------------------------------------------
   تمام صفحات /vendor/* از همین اجزا استفاده می‌کنند تا تم تیره‌ی سایت حفظ شود
   و منطق احراز هویت / دسترسی یکپارچه بماند.
   ========================================================================== */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, BadgeCheck, Boxes, Clock, ImagePlus, LayoutDashboard,
  Loader2, LogOut, Menu, Package, PackageX, ShoppingBag, Store, UploadCloud,
  UserCircle, X, type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore, hasPermission } from '@/lib/auth-store';
import { mediaUrl } from '@/lib/branding';
import { Button, Input } from '@/components/ui';

/* -------------------------------------------------------------------------- */
/* انواع داده‌ای (TypeScript)                                                  */
/* -------------------------------------------------------------------------- */

export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface SellerProfile {
  id: number;
  userId: number;
  storeName: string;
  storeSlug: string;
  description: string | null;
  logoPath: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  economicCode: string | null;
  registrationNumber: string | null;
  nationalId: string | null;
  commissionRate: number;
  status: SellerStatus;
  rejectionReason: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  productCount: number;
  ratingAvg: number;
  ratingCount: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SellerDashboard {
  profile: {
    id: number;
    storeName: string;
    storeSlug: string;
    status: SellerStatus;
    commissionRate: number;
    ratingAvg: number;
    ratingCount: number;
    isFeatured: boolean;
  };
  stats: {
    totalProducts: number;
    publishedProducts: number;
    draftProducts: number;
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    grossRevenue: number;
    commissionAmount: number;
    netRevenue: number;
  };
}

/** ردیف محصول فروشنده — فیلدهای اصلی موجودیت Product */
export interface SellerProduct {
  id: number;
  code: string | null;
  name: string;
  slug: string;
  status: string;
  shortDescription: string | null;
  description: string | null;
  features: string[] | null;
  weightG: number | null;
  warrantyMonths: number | null;
  categoryId: number;
  brandId: number | null;
  sellerId: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerOrderItem {
  id: number;
  orderId: number;
  productId: number;
  variantId: number | null;
  sku: string;
  productName: string;
  variantTitle: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface SellerOrder {
  id: number;
  code: string;
  userId: number;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  taxTotal: number;
  grandTotal: number;
  couponCode: string | null;
  shippingMethod: string | null;
  placedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** اقلام این سفارش که متعلق به فروشنده‌ی جاری است */
  sellerItems: SellerOrderItem[];
}

/* -------------------------------------------------------------------------- */
/* برچسبهای وضعیت فارسی                                                       */
/* -------------------------------------------------------------------------- */

export const SELLER_STATUS_LABELS: Record<SellerStatus, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تأییدشده',
  rejected: 'ردشده',
  suspended: 'معلق',
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: 'پیش‌نویس',
  pending: 'در انتظار بازبینی',
  published: 'منتشرشده',
  archived: 'بایگانی',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  processing: 'در حال پردازش',
  ready_to_ship: 'آماده ارسال',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
  refunded: 'مستردشده',
};

/* -------------------------------------------------------------------------- */
/* استایل‌های ثابت جدول (تم تیره)                                              */
/* -------------------------------------------------------------------------- */

export const tableCls = {
  wrap: 'overflow-x-auto rounded-2xl border border-white/10 bg-[#181c20]',
  table: 'w-full min-w-[640px] text-sm',
  thead: 'bg-white/5 text-xs text-slate-400',
  th: 'px-4 py-3 text-start font-bold',
  td: 'px-4 py-3 text-slate-300',
  row: 'border-t border-white/5 hover:bg-white/[0.03] transition',
};

/* -------------------------------------------------------------------------- */
/* رنگ برچسب وضعیت                                                             */
/* -------------------------------------------------------------------------- */

const STATUS_TONES: Record<string, string> = {
  published: 'bg-emerald-500/15 text-emerald-300',
  draft: 'bg-white/10 text-slate-400',
  pending: 'bg-amber-500/15 text-amber-300',
  archived: 'bg-white/10 text-slate-500',
  approved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-rose-500/15 text-rose-300',
  suspended: 'bg-rose-500/15 text-rose-300',
  paid: 'bg-emerald-500/15 text-emerald-300',
  unpaid: 'bg-amber-500/15 text-amber-300',
  failed: 'bg-rose-500/15 text-rose-300',
  processing: 'bg-sky-500/15 text-sky-300',
  ready_to_ship: 'bg-indigo-500/15 text-indigo-300',
  shipped: 'bg-violet-500/15 text-violet-300',
  delivered: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-rose-500/15 text-rose-300',
  refunded: 'bg-white/10 text-slate-400',
  pending_payment: 'bg-amber-500/15 text-amber-300',
  partially_refunded: 'bg-orange-500/15 text-orange-300',
};

export function Pill({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={clsx(
        'inline-block rounded-full px-2.5 py-1 text-2xs font-bold',
        STATUS_TONES[status] || 'bg-white/10 text-slate-400',
      )}
    >
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* هدر صفحه                                                                    */
/* -------------------------------------------------------------------------- */

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-black text-slate-100">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* کارت آماری داشبورد                                                          */
/* -------------------------------------------------------------------------- */

export function VendorStatCard({
  label, value, sub, icon: Icon, tone = 'emerald', href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  tone?: 'emerald' | 'amber' | 'sky' | 'violet' | 'rose';
  href?: string;
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-300',
    sky: 'bg-sky-500/15 text-sky-300',
    violet: 'bg-violet-500/15 text-violet-300',
    rose: 'bg-rose-500/15 text-rose-300',
  };
  const inner = (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#181c20] p-4 transition hover:border-white/20">
      <span className={clsx('rounded-2xl p-3', tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xs text-slate-400">{label}</p>
        <p className="truncate text-base font-black text-slate-100">{value}</p>
        {sub && <p className="text-2xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

/* -------------------------------------------------------------------------- */
/* حالت خالی                                                                   */
/* -------------------------------------------------------------------------- */

export function VendorEmptyState({
  title, description, action, icon: Icon = PackageX,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-[#181c20]/60 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
        <Icon className="h-7 w-7" />
      </span>
      <span className="text-base font-semibold text-slate-200">{title}</span>
      {description && <span className="max-w-sm text-sm text-slate-400">{description}</span>}
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* اسکلتون (حالت بارگذاری)                                                     */
/* -------------------------------------------------------------------------- */

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('animate-pulse rounded-2xl border border-white/10 bg-[#181c20] p-4', className)}>
      <div className="h-3 w-1/3 rounded bg-white/10" />
      <div className="mt-3 h-6 w-2/3 rounded bg-white/10" />
      <div className="mt-2 h-3 w-1/2 rounded bg-white/5" />
    </div>
  );
}

export function PageLoading({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* منوی کناری (Sidebar)                                                         */
/* -------------------------------------------------------------------------- */

interface MenuItem { href: string; label: string; icon: LucideIcon; perm?: string }

const MENU: MenuItem[] = [
  { href: '/vendor', label: 'داشبورد', icon: LayoutDashboard, perm: 'seller.dashboard' },
  { href: '/vendor/products', label: 'محصولات', icon: Package, perm: 'seller.products.view' },
  { href: '/vendor/orders', label: 'سفارش‌ها', icon: ShoppingBag, perm: 'seller.orders.view' },
  { href: '/vendor/profile', label: 'پروفایل فروشندگی', icon: UserCircle, perm: 'seller.profile.manage' },
];

export function VendorSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <nav className="flex h-full flex-col gap-0.5 overflow-y-auto p-3">
      <Link href="/vendor" className="mb-4 flex items-center gap-2.5 px-2 py-3" onClick={onNavigate}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
          <Store className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <span className="block text-sm font-black text-slate-100">پنل فروشنده</span>
          <span className="block text-2xs text-slate-400">کارزینتل</span>
        </div>
      </Link>

      {MENU.map((m) => {
        const active = m.href === '/vendor' ? pathname === '/vendor' : pathname.startsWith(m.href);
        const allowed = !m.perm || hasPermission(user, m.perm);
        const Icon = m.icon;
        return (
          <Link
            key={m.href}
            href={m.href}
            onClick={onNavigate}
            className={clsx(
              'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition',
              active
                ? 'bg-emerald-500/15 font-bold text-emerald-300'
                : allowed
                  ? 'text-slate-300 hover:bg-white/5'
                  : 'text-slate-500 hover:bg-white/5',
            )}
          >
            <Icon className="h-4.5 w-4.5" /> {m.label}
          </Link>
        );
      })}

      <div className="mt-auto border-t border-white/5 pt-3">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5">
          <Store className="h-4.5 w-4.5" /> بازگشت به فروشگاه
        </Link>
      </div>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* اسکلتون لایوت اصلی (Top bar + Sidebar)                                      */
/* -------------------------------------------------------------------------- */

export function VendorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#121518]">
      {/* سایدبار دسکتاپ */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-e border-white/10 bg-[#181c20] lg:block">
        <VendorSidebar />
      </aside>

      {/* سایدبار موبایل */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 start-0 z-50 w-64 bg-[#181c20] shadow-2xl lg:hidden"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute end-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
              <VendorSidebar onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="min-w-0 flex-1">
        {/* تاپ‌بار موبایل */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-[#181c20]/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl border border-white/10 p-2 text-slate-300"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-black text-slate-100">پنل فروشنده</span>
          <span className="ms-auto text-xs text-slate-400">{user?.fullName}</span>
        </header>

        {/* تاپ‌بار دسکتاپ */}
        <header className="sticky top-0 z-40 hidden items-center justify-between gap-3 border-b border-white/10 bg-[#181c20]/90 px-6 py-3 backdrop-blur lg:flex">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Store className="h-4 w-4 text-emerald-400" />
            <span>پنل فروشنده کارزینتل</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{user?.fullName}</span>
            <button
              onClick={() => {
                clearAuth();
                router.push('/');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:border-rose-400/30 hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" /> خروج
            </button>
          </div>
        </header>

        {/* محتوای صفحه با انیمیشن نرم هنگام تعویض مسیر */}
        <main className="mx-auto max-w-6xl p-4 lg:p-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* گارد پنل فروشنده — بررسی دسترسی seller.dashboard                              */
/* -------------------------------------------------------------------------- */

/**
 * اگر کاربر مجوز seller.dashboard نداشت (هنوز فروشنده نیست یا در انتظار است)،
 * به‌جای محتوای صفحه، یک فراخوان برای تبدیل شدن به فروشنده نمایش می‌دهد.
 */
export function VendorGuard({ children }: { children: ReactNode }) {
  const { user, hydrated } = useAuthStore();

  if (!hydrated) return <PageLoading />;
  if (!user) return <PageLoading label="در حال انتقال به صفحه ورود…" />;

  if (hasPermission(user, 'seller.dashboard')) return <>{children}</>;

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="rounded-3xl border border-white/10 bg-[#181c20] p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
          <Store className="h-8 w-8" />
        </span>
        <h2 className="mt-5 text-lg font-black text-slate-100">هنوز فروشنده نیستید</h2>
        <p className="mt-2 text-sm leading-7 text-slate-400">
          برای دسترسی به داشبورد فروشنده، ابتدا باید درخواست فروشندگی ثبت کنید و
          توسط مدیریت تأیید شوید.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/vendor/apply">
            <Button><Store className="h-4 w-4" /> ثبت درخواست فروشندگی</Button>
          </Link>
          <Link href="/vendor/profile">
            <Button variant="ghost">مشاهده وضعیت درخواست</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* بنر وضعیت پروفایل فروشنده                                                    */
/* -------------------------------------------------------------------------- */

export function SellerStatusBanner({ profile }: { profile: SellerProfile | null | undefined }) {
  if (!profile) return null;
  const status = profile.status;

  const cfg: Record<SellerStatus, { tone: string; icon: LucideIcon; title: string; desc: string } | null> = {
    pending: {
      tone: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
      icon: Clock,
      title: 'درخواست شما در انتظار بررسی است',
      desc: 'کارشناسان ما به‌زودی درخواست فروشندگی شما را بررسی خواهند کرد. تا آن زمان می‌توانید اطلاعات فروشگاه را مرور کنید.',
    },
    approved: {
      tone: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
      icon: BadgeCheck,
      title: 'حساب فروشندگی شما تأیید شد',
      desc: 'شما می‌توانید محصولات خود را اضافه کنید و سفارش‌ها را مدیریت کنید.',
    },
    rejected: {
      tone: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
      icon: AlertTriangle,
      title: 'درخواست شما رد شد',
      desc: profile.rejectionReason
        ? `دلیل رد: ${profile.rejectionReason}`
        : 'برای اصلاح اطلاعات و ثبت مجدد با پشتیبانی تماس بگیرید.',
    },
    suspended: {
      tone: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
      icon: AlertTriangle,
      title: 'حساب فروشندگی شما تعلیق شده است',
      desc: 'برای رفع تعلیق با پشتیبانی تماس بگیرید.',
    },
  };

  const c = cfg[status];
  if (!c) return null;
  const Icon = c.icon;

  return (
    <div className={clsx('flex items-start gap-3 rounded-2xl border p-4', c.tone)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="text-sm font-bold">{c.title}</p>
        <p className="mt-1 text-xs leading-6 opacity-90">{c.desc}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* آپلودر تصویر/ویدئو مخصوص فروشنده (با /files/upload)                          */
/* -------------------------------------------------------------------------- */

/**
 * آپلود فایل از طریق endpoint عمومی /files/upload.
 * این مسیر فقط نیازمند ورود است (نه مجوز ادمین) و فایل را به‌صورت multipart
 * دریافت کرده و مسیر (path) ذخیره‌شده را برمی‌گرداند.
 */
async function uploadVendorFile(file: File, purpose = 'product_image'): Promise<string> {
  const token = useAuthStore.getState().accessToken;
  const BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/files/upload?purpose=${encodeURIComponent(purpose)}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: form,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    const err = json?.error || {};
    throw new Error(err.message || 'آپلود فایل ناموفق بود');
  }
  return json?.data?.path as string;
}

export function VendorImageUpload({
  value, onChange, purpose = 'product_image', kind = 'image',
}: {
  value: string;
  onChange: (path: string) => void;
  purpose?: string;
  kind?: 'image' | 'video';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useVendorToast();

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadVendorFile(file, purpose);
      onChange(path);
      toast.success('فایل آپلود شد');
    } catch (e) {
      toast.error((e as Error).message || 'آپلود ناموفق بود');
    } finally {
      setUploading(false);
    }
  };

  const preview = mediaUrl(value);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={kind === 'video' ? 'video/*' : 'image/*'}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#10130f]">
        {preview ? (
          kind === 'video' ? (
            <Package className="h-6 w-6 text-slate-400" />
          ) : (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <ImagePlus className="h-6 w-6 text-slate-500" />
        )}
      </div>
      <div className="flex flex-1 items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="مسیر فایل یا لینک تصویر…"
          className="text-xs"
          dir="ltr"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud className="h-4 w-4" /> آپلود
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* helper برای toast (پوشش کوتاه از store موجود)                                */
/* -------------------------------------------------------------------------- */

import { toast as globalToast } from '@/lib/auth-store';
export function useVendorToast() {
  return {
    success: (m: string) => globalToast.success(m),
    error: (m: string) => globalToast.error(m),
    info: (m: string) => globalToast.info(m),
  };
}

/* -------------------------------------------------------------------------- */
/* هوک واکشی پروفایل فروشنده                                                    */
/* -------------------------------------------------------------------------- */

/**
 * پروفایل فروشنده‌ی کاربر جاری را واکشی می‌کند.
 *
 * فقط زمانی فراخوانی می‌شود که کاربر مجوز seller.profile.manage داشته باشد
 * (یعنی فروشنده‌ی تأییدشده است). اگر پروفایلی وجود نداشته باشد (404)،
 * ‌null برمی‌گرداند تا صفحه بتواند پیام «تبدیل به فروشنده» نمایش دهد.
 *
 * کاربرانی که هنوز نقش seller نگرفته‌اند (درخواست داده اما تأیید نشده‌اند)
 * مجوز ندارند، پس واکشی انجام نمی‌شود و data برابر undefined می‌ماند.
 */
export function useSellerProfile() {
  const { user } = useAuthStore();
  return useQuery<SellerProfile | null>({
    queryKey: ['seller-profile'],
    queryFn: async () => {
      try {
        const { data } = await api<SellerProfile>('/seller/profile');
        return data;
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === 'SELLER_PROFILE_NOT_FOUND') return null;
        throw e;
      }
    },
    enabled: !!user && hasPermission(user, 'seller.profile.manage'),
    retry: 1,
    staleTime: 30_000,
  });
}

/** صادرات مجدد آیکن‌ها برای استفاده در کارت‌ها */
export { Boxes, Clock };
