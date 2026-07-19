'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MapPin, Plus, Truck, Wallet as WalletIcon, CreditCard } from 'lucide-react';
import { api, newIdempotencyKey } from '@/lib/api-client';
import { AddressType, CartType, OrderDetailType } from '@/lib/types';
import { getCartSession, toast, useAuthStore } from '@/lib/auth-store';
import { Button, Card, Field, Input, PageLoading, Textarea } from '@/components/ui';
import { AuthGuard } from '@/components/auth-guard';
import { faNumber, toToman } from '@/lib/format';

type GatewayInfo = { key: string; title: string; description?: string };
type ShippingMethodInfo = {
  id: number; name: string; typeLabel: string; eta: string | null;
  cost: number; finalCost: number; isFree: boolean;
};

function NewAddressForm({ onCreated }: { onCreated: (a: AddressType) => void }) {
  const [form, setForm] = useState({ receiverName: '', receiverPhone: '', province: '', city: '', address: '', postalCode: '' });
  const save = useMutation({
    mutationFn: async () =>
      api<AddressType>('/me/addresses', { method: 'POST', body: { ...form, title: 'آدرس من', isDefault: false } }),
    onSuccess: (r) => { toast.success('آدرس ثبت شد'); onCreated(r.data); },
    onError: (e) => toast.error((e as Error).message),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="mt-3 grid gap-3 rounded-2xl border border-dashed border-slate-300 p-4 sm:grid-cols-2">
      <Field label="نام تحویل‌گیرنده" required><Input value={form.receiverName} onChange={(e) => set('receiverName', e.target.value)} /></Field>
      <Field label="موبایل" required><Input value={form.receiverPhone} onChange={(e) => set('receiverPhone', e.target.value)} placeholder="09xxxxxxxxx" /></Field>
      <Field label="استان" required><Input value={form.province} onChange={(e) => set('province', e.target.value)} /></Field>
      <Field label="شهر" required><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
      <Field label="کد پستی"><Input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} /></Field>
      <Field label="نشانی کامل" required>
        <Input value={form.address} onChange={(e) => set('address', e.target.value)} className="sm:col-span-2" />
      </Field>
      <div className="sm:col-span-2">
        <Button size="sm" variant="secondary" onClick={() => save.mutate()} loading={save.isPending}>ثبت آدرس جدید</Button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  const [addressId, setAddressId] = useState<number | null>(null);
  const [gateway, setGateway] = useState<string>('');
  const [shippingMethodId, setShippingMethodId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart', 'view'],
    queryFn: async () =>
      (await api<CartType>('/cart', { headers: { 'X-Cart-Session': getCartSession() } })).data,
  });

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => (await api<AddressType[]>('/me/addresses')).data,
    enabled: hydrated && !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => (await api<{ balance: number }>('/me/wallet')).data,
    enabled: hydrated && !!user,
  });

  const { data: gatewaysData } = useQuery({
    queryKey: ['gateways'],
    queryFn: async () =>
      (await api<{ items: GatewayInfo[]; default: string }>('/payments/gateways')).data,
  });

  const payable = useMemo(
    () => (cart ? cart.subtotal - cart.couponDiscount : 0),
    [cart],
  );

  const selectedAddress = (addresses || []).find((a) => a.id === addressId);

  // روش‌های ارسال بر اساس آدرس انتخاب‌شده
  const { data: shippingData, isFetching: shippingLoading } = useQuery({
    queryKey: ['shipping-methods', selectedAddress?.province, selectedAddress?.city, payable],
    queryFn: async () => {
      const params = new URLSearchParams({
        province: selectedAddress!.province,
        city: selectedAddress!.city,
        subtotal: String(payable),
      });
      return (await api<{ zone: string | null; items: ShippingMethodInfo[] }>(`/shipping/methods?${params}`)).data;
    },
    enabled: !!selectedAddress,
  });

  useEffect(() => {
    if (addresses?.length && !addressId) {
      setAddressId((addresses.find((a) => a.isDefault) || addresses[0]).id);
    }
  }, [addresses, addressId]);

  useEffect(() => {
    if (gatewaysData && !gateway) setGateway(gatewaysData.default);
  }, [gatewaysData, gateway]);

  // انتخاب خودکار ارزان‌ترین روش ارسال
  useEffect(() => {
    const methods = shippingData?.items || [];
    if (methods.length && !methods.some((m) => m.id === shippingMethodId)) {
      const cheapest = [...methods].sort((a, b) => a.finalCost - b.finalCost)[0];
      setShippingMethodId(cheapest.id);
    }
    if (!methods.length) setShippingMethodId(null);
  }, [shippingData, shippingMethodId]);

  const selectedMethod = (shippingData?.items || []).find((m) => m.id === shippingMethodId);
  const tax = cart?.tax ?? 0;
  const shippingCost = selectedMethod ? selectedMethod.finalCost : 0;
  const grand = payable + tax + shippingCost;

  const gateways: GatewayInfo[] = gatewaysData?.items || [{ key: 'manual', title: 'درگاه آزمایشی' }];

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!addressId) throw new Error('ابتدا آدرس تحویل را انتخاب کنید');
      if (!shippingMethodId && (shippingData?.items?.length ?? 0) > 0) throw new Error('روش ارسال را انتخاب کنید');
      const { data: order } = await api<OrderDetailType>('/checkout', {
        method: 'POST',
        body: {
          addressId,
          shippingMethodId: shippingMethodId ?? undefined,
          customerNote: note || undefined,
        },
        headers: { 'X-Cart-Session': getCartSession() },
        idempotencyKey: newIdempotencyKey(),
      });
      const { data: pay } = await api<{ redirectUrl: string }>('/payments/init', {
        method: 'POST',
        body: { orderCode: order.code, gateway },
      });
      return pay.redirectUrl;
    },
    onSuccess: (url) => {
      window.dispatchEvent(new Event('cart:changed'));
      window.location.href = url;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <PageLoading />;
  if (!cart || cart.items.length === 0) {
    router.replace('/cart');
    return <PageLoading />;
  }

  return (
    <AuthGuard>
      <div className="py-8">
        <h1 className="mb-6 text-2xl font-black">تکمیل خرید و پرداخت</h1>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {/* آدرس */}
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold"><MapPin className="h-5 w-5 text-slate-400" /> آدرس تحویل</h2>
                <Button size="sm" variant="ghost" onClick={() => setShowNewAddress((s) => !s)}>
                  <Plus className="h-4 w-4" /> آدرس جدید
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(addresses || []).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAddressId(a.id)}
                    className={`rounded-2xl border-2 p-4 text-right transition-colors ${addressId === a.id ? 'border-slate-900 bg-[#10130f]' : 'border-white/10'}`}
                  >
                    <div className="font-bold text-slate-100">{a.receiverName}</div>
                    <div className="mt-1 text-xs leading-6 text-slate-400">
                      {a.province}، {a.city}، {a.address}
                    </div>
                    <div className="mt-1 text-xs text-slate-400" dir="ltr">{a.receiverPhone}</div>
                  </button>
                ))}
              </div>
              {(showNewAddress || !addresses?.length) && <NewAddressForm onCreated={(a) => setAddressId(a.id)} />}
            </Card>

            {/* روش ارسال */}
            <Card>
              <h2 className="mb-3 flex items-center gap-2 font-bold">
                <Truck className="h-5 w-5 text-slate-400" /> روش ارسال
                {shippingData?.zone && <span className="text-xs font-normal text-slate-400">(منطقه: {shippingData.zone})</span>}
              </h2>
              {!selectedAddress && <p className="text-sm text-slate-400">ابتدا آدرس تحویل را انتخاب کنید.</p>}
              {selectedAddress && shippingLoading && <p className="text-sm text-slate-400">در حال محاسبه روش‌های ارسال…</p>}
              {selectedAddress && !shippingLoading && (shippingData?.items?.length ?? 0) === 0 && (
                <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-300">
                  برای منطقه شما روش ارسال فعالی تعریف نشده است؛ هزینه ارسال پس از ثبت سفارش محاسبه می‌شود.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                {(shippingData?.items || []).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setShippingMethodId(m.id)}
                    className={`rounded-2xl border-2 p-4 text-center transition-colors ${shippingMethodId === m.id ? 'border-slate-900 bg-[#10130f]' : 'border-white/10'}`}
                  >
                    <div className="text-sm font-bold">{m.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{m.typeLabel}{m.eta ? ` — ${m.eta}` : ''}</div>
                    <div className={`mt-2 text-sm font-black ${m.isFree ? 'text-emerald-400' : ''}`}>
                      {m.isFree ? 'رایگان!' : toToman(m.finalCost)}
                    </div>
                    {m.isFree && m.cost > 0 && <div className="text-xs text-slate-400 line-through">{toToman(m.cost)}</div>}
                  </button>
                ))}
              </div>
            </Card>

            {/* درگاه پرداخت */}
            <Card>
              <h2 className="mb-3 flex items-center gap-2 font-bold"><CreditCard className="h-5 w-5 text-slate-400" /> روش پرداخت</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {gateways.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setGateway(g.key)}
                    className={`rounded-2xl border-2 p-4 text-center transition-colors ${gateway === g.key ? 'border-slate-900 bg-[#10130f]' : 'border-white/10'}`}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-sm font-bold">
                      {g.key === 'wallet' && <WalletIcon className="h-4 w-4" />}
                      {g.title}
                    </div>
                    {g.key === 'wallet' ? (
                      <>
                        <span className="mt-1 block text-xs text-slate-400">موجودی: {toToman(wallet?.balance || 0)}</span>
                        {wallet && wallet.balance < grand && <span className="mt-1 block text-xs text-rose-500">موجودی ناکافی</span>}
                      </>
                    ) : (
                      g.description && <span className="mt-1 block text-xs text-slate-400">{g.description}</span>
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {/* یادداشت */}
            <Card>
              <h2 className="mb-3 font-bold">یادداشت برای سفارش (اختیاری)</h2>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً تحویل ساعت اداری…" />
            </Card>
          </div>

          {/* خلاصه */}
          <Card className="h-fit space-y-3 lg:sticky lg:top-24">
            <h2 className="font-bold">خلاصه سفارش</h2>
            <div className="space-y-2 text-sm text-slate-400">
              {cart.items.map((i) => (
                <div key={i.id} className="flex justify-between gap-2">
                  <span className="line-clamp-1">{i.productName} × {faNumber(i.quantity)}</span>
                  <span className="shrink-0">{toToman(i.unitPrice * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-white/10 pt-3 text-sm">
              <div className="flex justify-between text-slate-400"><span>جمع اقلام</span><span>{toToman(cart.subtotal)}</span></div>
              {cart.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-400"><span>تخفیف{cart.couponCode ? ` (${cart.couponCode})` : ''}</span><span>{toToman(cart.couponDiscount)}-</span></div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>هزینه ارسال{selectedMethod ? ` (${selectedMethod.name})` : ''}</span>
                <span className={shippingCost === 0 ? 'text-emerald-400 font-bold' : ''}>{shippingCost === 0 ? 'رایگان' : toToman(shippingCost)}</span>
              </div>
              <div className="flex justify-between text-slate-400"><span>مالیات (۹٪)</span><span>{toToman(tax)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-3 text-base font-black">
                <span>مبلغ نهایی</span><span>{toToman(grand)}</span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => placeOrder.mutate()}
              loading={placeOrder.isPending}
              disabled={!addressId || !gateway || (gateway === 'wallet' && (wallet?.balance || 0) < grand)}
            >
              ثبت سفارش و پرداخت
            </Button>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
