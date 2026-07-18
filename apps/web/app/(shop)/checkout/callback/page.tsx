'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, PageLoading } from '@/components/ui';

function CallbackContent() {
  const sp = useSearchParams();
  const status = sp.get('status');
  const orderCode = sp.get('orderCode');
  const reason = sp.get('reason');
  const ok = status === 'success';

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-10">
      <Card className="w-full max-w-md text-center">
        {ok ? (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
            <h1 className="mt-4 text-xl font-black text-emerald-700">پرداخت با موفقیت انجام شد</h1>
            <p className="mt-2 text-sm text-slate-500">
              سفارش شما با کد <span className="font-bold text-slate-800" dir="ltr">{orderCode}</span> ثبت شد و در حال پردازش است.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {orderCode && (
                <Link href={`/account/orders/${orderCode}`} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
                  مشاهده سفارش
                </Link>
              )}
              <Link href="/" className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700">
                بازگشت به فروشگاه
              </Link>
            </div>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-16 w-16 text-rose-500" />
            <h1 className="mt-4 text-xl font-black text-rose-700">پرداخت ناموفق بود</h1>
            <p className="mt-2 text-sm text-slate-500">{reason || 'تراکنش توسط درگاه تأیید نشد یا لغو شد.'}</p>
            <div className="mt-6 flex flex-col gap-2">
              {orderCode && (
                <Link href={`/account/orders/${orderCode}`} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
                  تلاش مجدد برای پرداخت
                </Link>
              )}
              <Link href="/cart" className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700">
                بازگشت به سبد خرید
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CallbackContent />
    </Suspense>
  );
}
