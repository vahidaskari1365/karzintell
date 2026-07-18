'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { use, useState } from 'react';
import { ArrowRight, Ban, CheckCircle2, MapPin, StickyNote, Truck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faDateTime, faNumber, toToman } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/types';
import { hasPermission, toast, useAuthStore } from '@/lib/auth-store';
import { Button, Card, Field, Input, PageLoading, Select, Textarea } from '@/components/ui';
import { Dialog, ConfirmDialog } from '@/components/dialog';
import { PageHeader, tableCls, Pill, labelOf } from '../../_shared';

const GATEWAY_LABELS: Record<string, string> = {
  zarinpal: 'زرین‌پال', wallet: 'کیف پول', manual: 'دستی/توسعه', cod: 'حضوری',
  idpay: 'آیدی‌پی', zibal: 'زیبال', nextpay: 'نکست‌پی',
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canUpdate = hasPermission(user, 'orders.update_status');
  const canCancel = hasPermission(user, 'orders.cancel');
  const canRefund = hasPermission(user, 'orders.refund');

  const [statusTarget, setStatusTarget] = useState('');
  const [note, setNote] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [ship, setShip] = useState({ provider: 'post', method: '', trackingCode: '', status: 'pending' });
  const [adminNote, setAdminNote] = useState<string | null>(null);

  const { data: o, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: async () => (await api<any>(`/admin/orders/${id}`)).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-order', id] });

  const changeStatus = useMutation({
    mutationFn: async () => api(`/admin/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status: statusTarget, note: note || undefined }) }),
    onSuccess: () => { toast.success('وضعیت سفارش تغییر کرد'); setStatusTarget(''); setNote(''); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async () => api(`/admin/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: cancelReason || undefined }) }),
    onSuccess: () => { toast.success('سفارش لغو شد'); setCancelOpen(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const refund = useMutation({
    mutationFn: async () => api(`/admin/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status: 'refunded' }) }),
    onSuccess: () => { toast.success('عودت وجه ثبت شد'); setRefundOpen(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveShipment = useMutation({
    mutationFn: async () => api(`/admin/orders/${id}/shipment`, { method: 'PUT', body: JSON.stringify(ship) }),
    onSuccess: () => { toast.success('اطلاعات ارسال ذخیره شد'); setShipmentOpen(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveNote = useMutation({
    mutationFn: async (text: string) => api(`/admin/orders/${id}/note`, { method: 'POST', body: JSON.stringify({ note: text }) }),
    onSuccess: () => { toast.success('یادداشت ذخیره شد'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !o) return <PageLoading />;

  const allowed: string[] = o.allowedTransitions || [];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900">
          <ArrowRight className="h-4.5 w-4.5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-900" dir="ltr">{o.code}</h1>
            <Pill status={o.status} label={o.statusLabel} />
            <Pill status={o.paymentStatus} label={o.paymentStatus === 'paid' ? 'پرداخت‌شده' : 'پرداخت‌نشده'} />
          </div>
          <p className="mt-0.5 text-xs text-slate-400">ثبت: {faDateTime(o.createdAt)}{o.paidAt && ` · پرداخت: ${faDateTime(o.paidAt)}`}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* اقلام */}
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>کالا</th>
                  <th className={tableCls.th}>فی (تومان)</th>
                  <th className={tableCls.th}>تعداد</th>
                  <th className={tableCls.th}>جمع</th>
                </tr>
              </thead>
              <tbody>
                {(o.items || []).map((i: any) => (
                  <tr key={i.id} className={tableCls.row}>
                    <td className={tableCls.td}>
                      <p className="font-medium">{i.productName}</p>
                      <p className="text-2xs text-slate-400" dir="ltr">{i.sku}{i.variantTitle ? ` — ${i.variantTitle}` : ''}</p>
                    </td>
                    <td className={tableCls.td}>{toToman(i.unitPrice)}</td>
                    <td className={tableCls.td}>{faNumber(i.quantity)}</td>
                    <td className={tableCls.td}>{toToman(i.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* تاریخچه */}
          <Card className="p-5">
            <p className="mb-3 text-sm font-bold text-slate-800">تاریخچه وضعیت</p>
            <ol className="relative space-y-3 border-s-2 border-slate-100 ps-4">
              {(o.histories || []).map((h: any, idx: number) => (
                <li key={idx} className="relative">
                  <span className="absolute -start-5.5 top-1 h-2.5 w-2.5 rounded-full bg-orange-400" />
                  <p className="text-sm text-slate-700">{h.from ? `${h.from} ← ` : ''}<b>{h.to}</b>{h.note && <span className="text-slate-400"> — {h.note}</span>}</p>
                  <p className="text-2xs text-slate-400">{faDateTime(h.at)}</p>
                </li>
              ))}
            </ol>
          </Card>

          {/* پرداخت‌ها */}
          <Card className="p-5">
            <p className="mb-3 text-sm font-bold text-slate-800">تراکنش‌ها</p>
            {(o.payments || []).length === 0 ? (
              <p className="text-xs text-slate-400">تراکنشی ثبت نشده</p>
            ) : (
              <ul className="space-y-2">
                {o.payments.map((p: any) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-xs">
                    <span>{GATEWAY_LABELS[p.gateway] || p.gateway} · {toToman(Number(p.amount))} تومان</span>
                    <span className="flex items-center gap-2 text-slate-400" dir="ltr">{p.refId || p.authority || ''}</span>
                    <Pill status={p.status} label={labelOf({ paid: 'موفق', pending: 'در انتظار', failed: 'ناموفق', initiated: 'شروع‌شده', cancelled: 'لغوشده', refunded: 'عودت‌شده' }, p.status)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {/* اقدامات */}
          <Card className="space-y-3 p-5">
            <p className="text-sm font-bold text-slate-800">اقدامات</p>
            {allowed.length === 0 ? (
              <p className="text-xs text-slate-400">این سفارش در وضعیت نهایی است.</p>
            ) : (
              <>
                <Field label="تغییر وضعیت به">
                  <Select value={statusTarget} onChange={(e) => setStatusTarget(e.target.value)} disabled={!canUpdate}>
                    <option value="">انتخاب…</option>
                    {allowed.map((st) => <option key={st} value={st}>{ORDER_STATUS_LABELS[st] || st}</option>)}
                  </Select>
                </Field>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت (اختیاری)…" />
                <Button className="w-full" size="sm" disabled={!statusTarget || !canUpdate} loading={changeStatus.isPending} onClick={() => changeStatus.mutate()}>
                  <CheckCircle2 className="h-4 w-4" /> اعمال وضعیت جدید
                </Button>
              </>
            )}
            <div className="flex gap-2 border-t border-slate-100 pt-3">
              {canCancel && allowed.includes('cancelled') && (
                <Button variant="secondary" size="sm" className="flex-1 text-rose-600" onClick={() => setCancelOpen(true)}>
                  <Ban className="h-4 w-4" /> لغو سفارش
                </Button>
              )}
              {canRefund && allowed.includes('refunded') && (
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setRefundOpen(true)}>عودت وجه</Button>
              )}
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setShip((s) => ({ ...s, provider: o.shipment?.provider || 'post', method: o.shipment?.method || '', trackingCode: o.shipment?.trackingCode || '', status: o.shipment?.status || 'pending' })); setShipmentOpen(true); }}>
                <Truck className="h-4 w-4" /> ارسال
              </Button>
            </div>
          </Card>

          {/* آدرس */}
          <Card className="p-5">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800"><MapPin className="h-4 w-4" /> آدرس تحویل</p>
            {o.address ? (
              <div className="space-y-1 text-xs leading-6 text-slate-600">
                <p>{o.address.receiverName} — <span dir="ltr">{o.address.receiverPhone}</span></p>
                <p>{o.address.province}، {o.address.city}</p>
                <p>{o.address.address}{o.address.plaque ? `، پلاک ${o.address.plaque}` : ''}{o.address.unit ? `، واحد ${o.address.unit}` : ''}</p>
                {o.address.postalCode && <p>کدپستی: <span dir="ltr">{o.address.postalCode}</span></p>}
              </div>
            ) : <p className="text-xs text-slate-400">—</p>}
            {o.customerNote && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">یادداشت مشتری: {o.customerNote}</p>}
          </Card>

          {/* مبالغ */}
          <Card className="space-y-1.5 p-5 text-sm">
            <div className="flex justify-between text-slate-500"><span>جمع اقلام</span><span>{toToman(o.subtotal)}</span></div>
            {Number(o.discountTotal) > 0 && <div className="flex justify-between text-emerald-600"><span>تخفیف {o.couponCode && `(${o.couponCode})`}</span><span>{toToman(o.discountTotal)}-</span></div>}
            <div className="flex justify-between text-slate-500"><span>مالیات</span><span>{toToman(o.taxTotal)}</span></div>
            <div className="flex justify-between text-slate-500"><span>ارسال {o.shippingMethod && `(${o.shippingMethod})`}</span><span>{Number(o.shippingCost) === 0 ? 'رایگان' : toToman(o.shippingCost)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-black text-slate-900"><span>مبلغ کل</span><span>{toToman(o.grandTotal)}</span></div>
          </Card>

          {/* ارسال */}
          {o.shipment && (
            <Card className="p-5 text-xs">
              <p className="mb-1 text-sm font-bold text-slate-800"><Truck className="inline h-4 w-4" /> اطلاعات ارسال</p>
              <p className="text-slate-600">{o.shipment.provider} {o.shipment.method && `· ${o.shipment.method}`}</p>
              {o.shipment.trackingCode && <p className="mt-1 text-slate-500">کد رهگیری: <b dir="ltr">{o.shipment.trackingCode}</b></p>}
            </Card>
          )}

          {/* یادداشت داخلی */}
          <Card className="p-5">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800"><StickyNote className="h-4 w-4" /> یادداشت داخلی</p>
            <Textarea rows={3} defaultValue={o.adminNote || ''} onChange={(e) => setAdminNote(e.target.value)} placeholder="فقط برای تیم…" />
            <Button size="sm" variant="secondary" className="mt-2" loading={saveNote.isPending} onClick={() => saveNote.mutate(adminNote ?? o.adminNote ?? '')}>ذخیره</Button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen} onClose={() => setCancelOpen(false)}
        onConfirm={() => cancel.mutate()} loading={cancel.isPending}
        title="لغو سفارش" danger
        message={
          <div className="space-y-2">
            <p>سفارش لغو و موجودی آزاد/برگردانده می‌شود.</p>
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="علت لغو (اختیاری)" />
          </div>
        }
      />
      <ConfirmDialog
        open={refundOpen} onClose={() => setRefundOpen(false)}
        onConfirm={() => refund.mutate()} loading={refund.isPending}
        title="عودت وجه"
        message="وضعیت به «عودت وجه‌شده» تغییر می‌کند. (برگشت پول به کیف پول/درگاه طبق تنظیمات انجام می‌شود)"
      />
    </div>
  );
}
