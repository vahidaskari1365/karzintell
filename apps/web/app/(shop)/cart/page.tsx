'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-client';
import { CartType } from '@/lib/types';
import { getCartSession, toast, useAuthStore } from '@/lib/auth-store';
import { Button, Card, Empty, Input, PageLoading } from '@/components/ui';
import { faNumber, toToman } from '@/lib/format';

export default function CartPage() {
  const queryClient = useQueryClient();
  const { hydrated, user } = useAuthStore();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart', 'view'],
    queryFn: async () =>
      (await api<CartType>('/cart', { headers: { 'X-Cart-Session': getCartSession() } })).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    window.dispatchEvent(new Event('cart:changed'));
  };

  const updateQty = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      api(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: { quantity },
        headers: { 'X-Cart-Session': getCartSession() },
      }),
    onSuccess: invalidate,
    onError: (e) => toast.error((e as Error).message),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: number) =>
      api(`/cart/items/${itemId}`, { method: 'DELETE', headers: { 'X-Cart-Session': getCartSession() } }),
    onSuccess: invalidate,
  });

  if (isLoading || !hydrated) return <PageLoading />;
  if (!cart || cart.items.length === 0)
    return (
      <div className="py-16">
        <Empty
          title="سبد خرید شما خالی است"
          description="هنوز هیچ کالایی به سبد اضافه نکرده‌اید"
          action={<Link href="/search" className="mt-3 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white">شروع خرید</Link>}
        />
      </div>
    );

  const hasUnavailable = cart.items.some((item) => item.available <= 0 || item.quantity > item.available);

  return (
    <div className="py-8">
      <h1 className="mb-6 text-2xl font-black">سبد خرید</h1>
      {hasUnavailable && (
        <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm font-medium text-rose-300">
          یکی از کالاهای سبد خرید موجود نیست یا تعداد انتخاب‌شده بیشتر از موجودی است. برای ادامه، تعداد آن را اصلاح یا کالا را حذف کنید.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {cart.items.map((item) => (
            <Card key={item.id} className="flex gap-4">
              <Link href={`/products/${item.productId}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#10130f]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
              </Link>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-semibold text-slate-100">{item.productName}</span>
                {item.variantTitle && <span className="mt-0.5 text-xs text-slate-400">{item.variantTitle}</span>}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center rounded-xl border border-white/10">
                    <button
                      onClick={() => updateQty.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                      disabled={item.quantity >= item.available}
                      className="p-2 text-slate-400 hover:text-slate-100 disabled:opacity-30"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-bold">{faNumber(item.quantity)}</span>
                    <button onClick={() => updateQty.mutate({ itemId: item.id, quantity: item.quantity - 1 })} className="p-2 text-slate-400 hover:text-slate-100">
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-100">{toToman(item.unitPrice * item.quantity)}</span>
                    <button onClick={() => removeItem.mutate(item.id)} className="rounded-lg p-2 text-slate-300 hover:bg-rose-500/10 hover:text-rose-500">
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
                {(item.available <= 0 || item.quantity > item.available) && (
                  <span className="mt-1 text-xs font-medium text-rose-400">
                    {item.available <= 0 ? 'اتمام موجودی' : `موجودی این کالا فقط ${faNumber(item.available)} عدد است`}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>

        <CartSummary cart={cart} user={user} invalidate={invalidate} />
      </div>
    </div>
  );
}

function CartSummary({ cart, user, invalidate }: { cart: CartType; user: unknown; invalidate: () => void }) {
  const [code, setCode] = useState('');
  const hasUnavailable = cart.items.some((item) => item.available <= 0 || item.quantity > item.available);
  const applyCoupon = useMutation({
    mutationFn: async () =>
      api('/cart/coupon', { method: 'POST', body: { code }, headers: { 'X-Cart-Session': getCartSession() } }),
    onSuccess: () => { toast.success('کد تخفیف اعمال شد'); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const removeCoupon = useMutation({
    mutationFn: async () => api('/cart/coupon', { method: 'DELETE', headers: { 'X-Cart-Session': getCartSession() } }),
    onSuccess: invalidate,
  });

  return (
    <Card className="h-fit space-y-4 lg:sticky lg:top-24">
      <h2 className="font-bold">صورتحساب</h2>

      {user ? (
        cart.couponCode ? (
          <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-3">
            <span className="text-sm font-bold text-emerald-300">کد {cart.couponCode}</span>
            <button onClick={() => removeCoupon.mutate()} className="text-xs text-emerald-400 underline">حذف</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input placeholder="کد تخفیف دارید؟" value={code} onChange={(e) => setCode(e.target.value)} className="text-sm" />
            <Button variant="secondary" onClick={() => applyCoupon.mutate()} loading={applyCoupon.isPending} disabled={!code.trim()}>
              اعمال
            </Button>
          </div>
        )
      ) : (
        <p className="rounded-xl bg-[#10130f] p-3 text-xs text-slate-400">برای استفاده از کد تخفیف ابتدا وارد حساب شوید.</p>
      )}

      <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
        <div className="flex justify-between text-slate-400">
          <span>جمع اقلام ({faNumber(cart.items.length)})</span>
          <span>{toToman(cart.subtotal)}</span>
        </div>
        {cart.couponDiscount > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>تخفیف کوپن</span>
            <span>{toToman(cart.couponDiscount)}-</span>
          </div>
        )}
        <div className="flex justify-between text-slate-400">
          <span>مالیات بر ارزش افزوده (۹٪)</span>
          <span>{toToman(cart.tax)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>هزینه ارسال</span>
          <span className={cart.shipping === 0 ? 'font-bold text-emerald-400' : ''}>
            {cart.shipping === 0 ? 'رایگان' : toToman(cart.shipping)}
          </span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-3 text-base font-black text-slate-100">
          <span>مبلغ قابل پرداخت</span>
          <span>{toToman(cart.grandTotal)}</span>
        </div>
      </div>

      {hasUnavailable ? (
        <Button size="lg" className="w-full" disabled>
          ابتدا موجودی سبد را اصلاح کنید
        </Button>
      ) : (
        <Link href="/checkout" className="block">
          <Button size="lg" className="w-full">
            ادامه ثبت سفارش
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </Card>
  );
}
