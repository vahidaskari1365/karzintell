'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Heart, MapPin, Package, Ticket, User, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { AuthGuard } from '@/components/auth-guard';

const menu = [
  { href: '/account', label: 'خلاصه حساب', icon: User, exact: true },
  { href: '/account/orders', label: 'سفارش‌های من', icon: Package },
  { href: '/account/wishlist', label: 'علاقه‌مندی‌ها', icon: Heart },
  { href: '/account/addresses', label: 'آدرس‌ها', icon: MapPin },
  { href: '/account/wallet', label: 'کیف پول', icon: Wallet },
  { href: '/account/tickets', label: 'تیکت‌ها', icon: Ticket },
  { href: '/account/notifications', label: 'اعلان‌ها', icon: Bell },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AuthGuard>
      <div className="grid gap-6 py-8 lg:grid-cols-4">
        <aside className="h-fit rounded-2xl border border-white/10 bg-[#181c20] p-3 lg:sticky lg:top-24">
          {menu.map((m) => {
            const active = m.exact ? pathname === m.href : pathname.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                className={clsx(
                  'mb-1 flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-white/10',
                )}
              >
                <m.icon className="h-4.5 w-4.5" />
                {m.label}
              </Link>
            );
          })}
        </aside>
        <div className="min-w-0 lg:col-span-3">{children}</div>
      </div>
    </AuthGuard>
  );
}
