'use client';

import { use } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { OrderDetailType, ORDER_STATUS_COLORS } from '@/lib/types';
import { Button, Card, PageLoading } from '@/components/ui';
import { faDateTime, toToman, faNumber } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { CreditCard } from 'lucide-react';

const ALL_STEPS = ['pending_payment', 'paid', 'processing', 'ready_to_ship', 'shipped', 'delivered'];
const STEP_LABELS: Record<string, string> = {
  pending_payment: 'ثبت سفارش', paid: 'پرداخت', processing: 'پردازش',
  ready_to_ship: 'آماده ارسال', shipped: 'ارسال', delivered: 'تحویل',
};

export default function OrderDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', code],
    queryFn: async () => (await api<OrderDetailType>(`/me/orders/${code}`)).data,
  });

  const pay = useMutation({
    mutationFn: async () => {
      const { data } = await api<{ redirectUrl: string }>('/payments/init', {
        method: 'POST',
        body: { orderCode: code, gateway: 'manual' },
      });
      return data.redirectUrl;
    },
    onSuccess: (url) => (window.location.href = url),
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading || !order) return <PageLoading />;

  const currentStep = ALL_STEPS.indexOf(order.status);
  const isCancelled = ['cancelled', 'refunded'].includes(order.status);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black" dir="ltr">سفارش {order.code}</h1>
          <span className="text-xs text-slate-400">{faDateTime(order.createdAt)}</span>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${ORDER_STATUS_COLORS[order.status]}`}>
          {order.statusLabel}
        </span>
      </div>

      {/* استیپر */}
      {!isCancelled && (
        <Card>
          <div className="flex items-center">
            {ALL_STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= currentStep ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {faNumber(i + 1)}
                  </span>
                  <span className={`hidden text-[10px] sm:block ${i <= currentStep ? 'text-emerald-700' : 'text-slate-400'}`}>{STEP_LABELS[s]}</span>
                </div>
                {i < ALL_STEPS.length - 1 && <div className={`mx-1 h-0.5 flex-1 ${i < currentStep ? 'bg-emerald-500' : 'bg-slate-100'}`} />}
              </div>
            ))}
          </div>
        </Card>
      )}

      {order.status === 'pending_payment' && (
        <Card className="flex items-center justify-between border-amber-200 bg-amber-50">
          <span className="text-sm text-amber-800">این سفارش در انتظار پرداخت است.</span>
          <Button size="sm" onClick={() => pay.mutate()} loading={pay.isPending}>
            <CreditCard className="h-4 w-4" /> پرداخت آنلاین
          </Button>
        </Card>
      )}

      {/* آیتم‌ها */}
      <Card>
        <h2 className="mb-4 font-bold">اقلام سفارش</h2>
        <div className="divide-y divide-slate-100">
          {order.items.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <span className="text-sm font-semibold text-slate-800">{i.productName}</span>
                {i.variantTitle && <span className="ms-2 text-xs text-slate-400">{i.variantTitle}</span>}
                <span className="mt-0.5 block text-xs text-slate-400">تعداد: {faNumber(i.quantity)}</span>
              </div>
              <span className="text-sm font-bold">{toToman(i.totalPrice)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* آدرس */}
        <Card>
          <h2 className="mb-3 font-bold">آدرس تحویل</h2>
          {order.address && (
            <p className="text-sm leading-7 text-slate-600">
              {(order.address as any).receiverName} — {(order.address as any).receiverPhone}
              <br />
              {(order.address as any).province}، {(order.address as any).city}، {(order.address as any).address}
              {(order.address as any).postalCode && <><br />کد پستی: {(order.address as any).postalCode}</>}
            </p>
          )}
          {order.shipment?.trackingCode && (
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
              کد رهگیری مرسوله: <b dir="ltr">{order.shipment.trackingCode}</b>
            </p>
          )}
        </Card>

        {/* صورتحساب */}
        <Card>
          <h2 className="mb-3 font-bold">صورتحساب</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-500"><span>جمع اقلام</span><span>{toToman(order.subtotal)}</span></div>
            {order.discountTotal > 0 && <div className="flex justify-between text-emerald-600"><span>تخفیف</span><span>{toToman(order.discountTotal)}-</span></div>}
            <div className="flex justify-between text-slate-500"><span>مالیات</span><span>{toToman(order.taxTotal)}</span></div>
            <div className="flex justify-between text-slate-500"><span>هزینه ارسال</span><span>{order.shippingCost ? toToman(order.shippingCost) : 'رایگان'}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-black"><span>جمع نهایی</span><span>{toToman(order.grandTotal)}</span></div>
          </div>
          {order.payments?.[0] && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              درگاه: {order.payments[0].gateway} — وضعیت: {order.payments[0].status}
              {order.payments[0].refId && <span className="block" dir="ltr">Ref: {order.payments[0].refId}</span>}
            </div>
          )}
        </Card>
      </div>

      {/* تاریخچه */}
      <Card>
        <h2 className="mb-3 font-bold">پیگیری سفارش</h2>
        <div className="space-y-3">
          {order.histories.map((h, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="text-slate-800">{h.to}</span>
              {h.note && <span className="text-slate-400">— {h.note}</span>}
              <span className="ms-auto text-xs text-slate-400">{faDateTime(h.at)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
