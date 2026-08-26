'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Heart, LayoutDashboard, LayoutGrid, LogOut, Menu, Package, Scale, Search, ShoppingCart, Ticket, User as UserIcon, Wallet, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore, hasPermission, toast } from '@/lib/auth-store';
import { CategoryNode } from '@/lib/types';
import { faNumber } from '@/lib/format';
import { NotificationsBell } from './notifications-bell';
import { SearchBox } from './search-box';
import { BrandLogo } from './brand-logo';


function useCartCount() {
  const { user, hydrated } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['cart', 'count'],
    queryFn: async () => {
      const sid = localStorage.getItem('krz_sid') || '';
      const { data } = await api<{ items: unknown[] }>('/cart', { headers: sid ? { 'X-Cart-Session': sid } : {} });
      return data.items.length;
    },
    enabled: hydrated,
    refetchInterval: 60_000,
  });
  // به رویداد سفارشی به‌روزرسانی سبد گوش می‌دهد
  const [bump, setBump] = useState(0);
  useEffect(() => {
    const h = () => setBump((b) => b + 1);
    window.addEventListener('cart:changed', h);
    return () => window.removeEventListener('cart:changed', h);
  }, []);
  return (data ?? 0) + (bump ? 0 : 0);
}


/* ذرات نئونی هدر — [موقعیت افقی, عمودی, تاخیر] */
const NEON_SEEDS: Array<[string, string, string]> = [
  ['6%', '32%', '0s'], ['14%', '66%', '.6s'], ['22%', '28%', '1.2s'], ['30%', '74%', '1.8s'],
  ['40%', '30%', '.3s'], ['48%', '62%', '.9s'], ['56%', '38%', '1.5s'], ['64%', '68%', '2.1s'],
  ['72%', '30%', '.5s'], ['80%', '60%', '1.1s'], ['87%', '42%', '1.7s'], ['93%', '72%', '2.4s'],
];

/** افکت روشن هدر: هاله‌های سبز کرمی ملایم + چند ذره درخشان ظریف روی شیشه سفید */
function LightHeaderFx() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* هاله سبز کرمی پشت لوگو */}
      <div className="animate-neon-pulse absolute -top-10 right-0 h-24 w-72 rounded-full bg-emerald-500/25 blur-3xl" />
      {/* هاله سبز خیلی ملایم سمت چپ */}
      <div className="animate-neon-pulse absolute -top-6 left-1/4 h-20 w-56 rounded-full bg-teal-500/15 blur-3xl" style={{ animationDelay: '2.5s' }} />
      {/* ذرات درخشان ظریف */}
      {NEON_SEEDS.map(([x, y, d], i) => (
        <i key={i} className="neon-seed" style={{ left: x, top: y, animationDelay: d, opacity: 0.5 }} />
      ))}
      {/* موی خط امضای سبز در لبه پایین هدر */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-emerald-400/70 to-transparent" />
    </div>
  );
}

export function Header() {
  const router = useRouter();
  const { user, hydrated, clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const cartCount = useCartCount();

  const { data: tree } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: async () => (await api<CategoryNode[]>('/categories')).data,
    staleTime: 300_000,
  });

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* noop */ }
    clearAuth();
    toast.success('از حساب خارج شدید');
    router.push('/');
  };

  const canAdmin = user && (user.permissions === '*' || (Array.isArray(user.permissions) && user.permissions.includes('dashboard.view')));

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#eef3f0]/72 backdrop-blur-xl">
      <LightHeaderFx />
      <div className="relative z-10 mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <button className="rounded-lg p-2 text-slate-600 hover:bg-emerald-600/10 hover:text-emerald-700 lg:hidden" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </button>

        <Link
          href="/"
          className="logo-sheen group flex items-center rounded-2xl bg-[#10181a]/95 px-4 py-2 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-400/30 backdrop-blur transition-transform hover:scale-[1.03]"
        >
          {/* لوگوی رسمی کارزینتل (نشان + نوشته) با هاله سبز نفس‌کش */}
          <BrandLogo className="h-11 sm:h-12" motion="logo-glow" />
        </Link>

        {/* منوی اصلی - دسکتاپ */}
        <nav className="hidden items-center gap-1 lg:flex">
          <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-600/10 hover:text-emerald-700">
            صفحه اصلی
          </Link>
          <div className="group relative" onMouseLeave={() => setCatOpen(false)}>
            <button
              onClick={() => setCatOpen((o) => !o)}
              aria-expanded={catOpen}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-600/10 hover:text-emerald-700"
            >
              <LayoutGrid className="h-4 w-4" /> محصولات
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
            </button>
            {/* لیست کشویی دسته‌بندی‌ها — با هاور یا کلیک باز می‌شود */}
            <div
              className={`invisible absolute right-0 top-full z-50 min-w-60 rounded-xl border border-black/[0.06] bg-white/92 p-2 opacity-0 shadow-xl backdrop-blur-xl transition-all group-hover:visible group-hover:opacity-100 ${
                catOpen ? 'visible opacity-100' : ''
              }`}
            >
              {(tree || []).map((c) => (
                <div key={c.id} className="mb-0.5">
                  <Link
                    href={`/categories/${c.slug}`}
                    onClick={() => setCatOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-emerald-600/10 hover:text-emerald-700"
                  >
                    {c.name}
                    {c.children?.length > 0 && <ChevronDown className="h-3 w-3 -rotate-90 text-slate-400" />}
                  </Link>
                  {c.children?.map((ch) => (
                    <Link
                      key={ch.id}
                      href={`/categories/${ch.slug}`}
                      onClick={() => setCatOpen(false)}
                      className="block rounded-lg py-1.5 pe-3 ps-6 text-sm text-slate-500 hover:bg-emerald-600/10 hover:text-emerald-700"
                    >
                      {ch.name}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {user && (
            <Link href="/account/orders" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-600/10 hover:text-emerald-700">
              <Package className="h-4 w-4" /> پیگیری سفارش
            </Link>
          )}
        </nav>

        {/* جستجو */}
        <div className="neon-search mx-auto hidden w-full max-w-xl flex-1 md:block">
          <SearchBox />
        </div>

        <div className="ms-auto flex items-center gap-1">
          {user && <NotificationsBell />}
          <Link href="/cart" className="relative rounded-xl p-2.5 text-slate-600 hover:bg-emerald-600/10 hover:text-emerald-700 transition-colors">
            <ShoppingCart className="h-5.5 w-5.5" />
            {cartCount > 0 && (
              <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                {faNumber(cartCount)}
              </span>
            )}
          </Link>

          {hydrated && user ? (
            <div className="group relative">
              <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 hover:bg-black/5 transition-colors">
                <UserIcon className="h-5 w-5" />
                <span className="hidden max-w-28 truncate md:block">{user.fullName}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              <div className="invisible absolute end-0 top-full z-50 w-52 rounded-xl border border-black/[0.06] bg-white/92 backdrop-blur-xl p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                <Link href="/account" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-emerald-600/10 hover:text-emerald-700"><UserIcon className="h-4 w-4" /> حساب کاربری</Link>
                <Link href="/account/orders" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-emerald-600/10 hover:text-emerald-700"><Package className="h-4 w-4" /> سفارش‌ها</Link>
                <Link href="/account/wishlist" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-emerald-600/10 hover:text-emerald-700"><Heart className="h-4 w-4" /> علاقه‌مندی‌ها</Link>
                <Link href="/compare" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-emerald-600/10 hover:text-emerald-700"><Scale className="h-4 w-4" /> مقایسه محصولات</Link>
                <Link href="/account/wallet" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-emerald-600/10 hover:text-emerald-700"><Wallet className="h-4 w-4" /> کیف پول</Link>
                <Link href="/account/tickets" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-emerald-600/10 hover:text-emerald-700"><Ticket className="h-4 w-4" /> تیکت‌ها</Link>
                {canAdmin && (
                  <>
                    <div className="my-1 border-t border-black/[0.07]" />
                    <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-emerald-600/10 hover:text-emerald-700"><LayoutDashboard className="h-4 w-4" /> پنل مدیریت</Link>
                  </>
                )}
                <div className="my-1 border-t border-black/[0.07]" />
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-500/10">
                  <LogOut className="h-4 w-4" /> خروج از حساب
                </button>
              </div>
            </div>
          ) : (
            <Link href="/login" className="rounded-xl bg-gradient-to-l from-emerald-500 to-green-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-500/25 transition hover:brightness-105">
              ورود | ثبت‌نام
            </Link>
          )}
        </div>
      </div>

      {/* جستجوی موبایل */}
      <div className="neon-search relative z-10 border-t border-black/[0.07] px-4 py-2 md:hidden">
        <SearchBox mobile onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* منوی موبایل */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-72 overflow-y-auto bg-white/95 p-4 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-bold">منو</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-slate-700 hover:bg-black/5"><X className="h-5 w-5" /></button>
            </div>
            <Link href="/" onClick={() => setMobileOpen(false)} className="mb-1 block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-emerald-600/10 hover:text-emerald-700">
              صفحه اصلی
            </Link>
            {user && (
              <Link href="/account/orders" onClick={() => setMobileOpen(false)} className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-emerald-600/10 hover:text-emerald-700">
                <Package className="h-4 w-4" /> پیگیری سفارش
              </Link>
            )}
            <span className="mb-1 mt-3 block px-3 text-xs font-bold text-slate-400">دسته‌بندی‌ها</span>
            {(tree || []).map((c) => (
              <div key={c.id} className="mb-1">
                <Link href={`/categories/${c.slug}`} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-emerald-600/10 hover:text-emerald-700">
                  {c.name}
                </Link>
                {c.children?.map((ch) => (
                  <Link key={ch.id} href={`/categories/${ch.slug}`} onClick={() => setMobileOpen(false)} className="block rounded-lg px-6 py-1.5 text-sm text-slate-500 hover:bg-emerald-600/10">
                    {ch.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
