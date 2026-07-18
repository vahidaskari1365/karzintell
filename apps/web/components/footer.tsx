import Link from 'next/link';
import { Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
              <Zap className="h-5 w-5 text-amber-400" />
            </span>
            <span className="text-lg font-black">کارزینتل</span>
          </div>
          <p className="text-sm leading-7 text-slate-500">
            فروشگاه اینترنتی قطعات و گجت‌های الکترونیک؛ موبایل، ساعت هوشمند، هدفون و لوازم جانبی با ضمانت اصالت کالا.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-800">دسترسی سریع</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="/categories/mobile" className="hover:text-slate-800">موبایل</Link></li>
            <li><Link href="/categories/smartwatch" className="hover:text-slate-800">ساعت هوشمند</Link></li>
            <li><Link href="/categories/audio" className="hover:text-slate-800">هدفون و هندزفری</Link></li>
            <li><Link href="/categories/accessories" className="hover:text-slate-800">لوازم جانبی</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-800">خدمات مشتریان</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="/account/orders" className="hover:text-slate-800">پیگیری سفارش</Link></li>
            <li><Link href="/track" className="hover:text-slate-800">رهگیری مرسوله</Link></li>
            <li><Link href="/account/tickets" className="hover:text-slate-800">پشتیبانی و تیکت</Link></li>
            <li><Link href="/pages/terms" className="hover:text-slate-800">شرایط و قوانین</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-800">ارتباط با ما</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>تهران، خیابان انقلاب</li>
            <li dir="ltr" className="text-right">۰۲۱-۰۰۰۰۰۰۰۰</li>
            <li>support@karzintell.ir</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} کارزینتل — Karzintell. تمامی حقوق محفوظ است.
      </div>
    </footer>
  );
}
