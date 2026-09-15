'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import {
  Award, BarChart3, Boxes, FileText, FolderTree, HelpCircle, Image as ImageIcon, LayoutDashboard,
  ListChecks, Menu, Newspaper, Package, ScrollText, Settings, ShieldCheck, ShoppingBag, Star,
  Store, Ticket, TicketPercent, Truck, UserCheck, UserCog, Users, X,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { BrandMark } from '@/components/brand-logo';
import { useAuthStore, hasPermission } from '@/lib/auth-store';
import clsx from 'clsx';

interface MenuItem { href: string; label: string; icon: ReactNode; perm: string }

const MENU: MenuItem[] = [
  { href: '/admin', label: 'داشبورد', icon: <LayoutDashboard className="h-4.5 w-4.5" />, perm: 'dashboard.view' },
  { href: '/admin/products', label: 'محصولات', icon: <Package className="h-4.5 w-4.5" />, perm: 'products.view' },
  { href: '/admin/categories', label: 'دسته‌بندی‌ها', icon: <FolderTree className="h-4.5 w-4.5" />, perm: 'categories.manage' },
  { href: '/admin/brands', label: 'برندها', icon: <Award className="h-4.5 w-4.5" />, perm: 'brands.manage' },
  { href: '/admin/attributes', label: 'ویژگی‌ها', icon: <ListChecks className="h-4.5 w-4.5" />, perm: 'attributes.manage' },
  { href: '/admin/inventory', label: 'موجودی انبار', icon: <Boxes className="h-4.5 w-4.5" />, perm: 'inventory.view' },
  { href: '/admin/orders', label: 'سفارش‌ها', icon: <ShoppingBag className="h-4.5 w-4.5" />, perm: 'orders.view' },
  { href: '/admin/shipping', label: 'حمل‌ونقل', icon: <Truck className="h-4.5 w-4.5" />, perm: 'settings.manage' },
  { href: '/admin/customers', label: 'مشتریان', icon: <Users className="h-4.5 w-4.5" />, perm: 'customers.view' },
  { href: '/admin/users', label: 'کاربران', icon: <UserCog className="h-4.5 w-4.5" />, perm: 'users.view' },
  { href: '/admin/users/pending', label: 'کاربران در انتظار', icon: <UserCheck className="h-4.5 w-4.5" />, perm: 'users.view' },
  { href: '/admin/roles', label: 'نقش‌ها و دسترسی', icon: <ShieldCheck className="h-4.5 w-4.5" />, perm: 'roles.view' },
  { href: '/admin/coupons', label: 'کدهای تخفیف', icon: <TicketPercent className="h-4.5 w-4.5" />, perm: 'coupons.manage' },
  { href: '/admin/banners', label: 'بنرها', icon: <ImageIcon className="h-4.5 w-4.5" />, perm: 'banners.manage' },
  { href: '/admin/pages', label: 'صفحات سایت', icon: <FileText className="h-4.5 w-4.5" />, perm: 'pages.manage' },
  { href: '/admin/blog', label: 'وبلاگ و اخبار', icon: <Newspaper className="h-4.5 w-4.5" />, perm: 'pages.manage' },
  { href: '/admin/faqs', label: 'سوالات متداول', icon: <HelpCircle className="h-4.5 w-4.5" />, perm: 'pages.manage' },
  { href: '/admin/reviews', label: 'دیدگاه‌ها و پرسش‌ها', icon: <Star className="h-4.5 w-4.5" />, perm: 'reviews.moderate' },
  { href: '/admin/tickets', label: 'تیکت‌ها', icon: <Ticket className="h-4.5 w-4.5" />, perm: 'tickets.view' },
  { href: '/admin/reports', label: 'گزارش فروش', icon: <BarChart3 className="h-4.5 w-4.5" />, perm: 'reports.view' },
  { href: '/admin/settings', label: 'تنظیمات', icon: <Settings className="h-4.5 w-4.5" />, perm: 'settings.manage' },
  { href: '/admin/audit-logs', label: 'لاگ عملیات', icon: <ScrollText className="h-4.5 w-4.5" />, perm: 'audit.view' },
];

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [open, setOpen] = useState(false);

  const visible = MENU.filter((m) => hasPermission(user, m.perm));

  const nav = (
    <nav className="flex h-full flex-col gap-0.5 overflow-y-auto p-3">
      <Link href="/admin" className="mb-4 flex items-center gap-2.5 px-2 py-3" onClick={() => setOpen(false)}>
        <BrandMark className="h-9 w-9 ring-1 ring-emerald-400/30" motion="logo-tilt" />
        <span className="font-black text-slate-100">پنل مدیریت کارزینتل</span>
      </Link>
      {visible.map((m) => {
        const active = m.href === '/admin' ? pathname === '/admin' : pathname.startsWith(m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            onClick={() => setOpen(false)}
            className={clsx(
              'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition',
              active
                ? 'bg-gradient-to-l from-emerald-500/20 to-indigo-500/20 font-bold text-emerald-300 ring-1 ring-emerald-500/30'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
            )}
          >
            {m.icon} {m.label}
          </Link>
        );
      })}
      <div className="mt-auto border-t border-slate-800 pt-3">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200">
          <Store className="h-4.5 w-4.5" /> بازگشت به فروشگاه
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#0a0d12] text-slate-200">
      {/* دسکتاپ */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-e border-slate-800 bg-[#121518] lg:block">{nav}</aside>
      {/* موبایل */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute start-0 top-0 h-full w-64 bg-[#121518] shadow-2xl">
            <button onClick={() => setOpen(false)} className="absolute end-3 top-3 text-slate-400 hover:text-slate-200"><X className="h-5 w-5" /></button>
            {nav}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-800 bg-[#121518]/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-xl border border-slate-800 bg-slate-800/60 p-2"><Menu className="h-5 w-5" /></button>
          <span className="font-black text-slate-100">پنل مدیریت</span>
          <span className="ms-auto text-xs text-slate-400">{user?.fullName}</span>
        </header>
        <header className="sticky top-0 z-40 hidden items-center justify-end gap-3 border-b border-slate-800 bg-[#121518]/90 px-6 py-3 backdrop-blur lg:flex">
          <span className="text-sm text-slate-300">{user?.fullName}</span>
          <button
            onClick={() => { clearAuth(); router.push('/'); }}
            className="rounded-xl border border-slate-800 px-3 py-1.5 text-xs text-slate-400 transition hover:border-rose-500/40 hover:text-rose-300"
          >
            خروج
          </button>
        </header>
        <main className="mx-auto max-w-6xl p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard permission="dashboard.view">
      <Shell>{children}</Shell>
    </AuthGuard>
  );
}
