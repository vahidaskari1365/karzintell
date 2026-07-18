'use client';

import { Printer } from 'lucide-react';
import { OrderDetailType } from '@/lib/types';
import { Button } from '@/components/ui';
import { faDateTime, faNumber, toToman } from '@/lib/format';

/** فاکتور فروش — مناسب چاپ A4 */
export function Invoice({ order, storeName = 'فروشگاه کارزینتل' }: { order: OrderDetailType; storeName?: string }) {
  const addr = (order.address || {}) as {
    receiverName?: string; receiverPhone?: string; province?: string; city?: string; address?: string; postalCode?: string;
  };
  const paid = order.paymentStatus === 'paid';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-end print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> چاپ فاکتور
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-300 bg-white p-8 text-sm shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* سربرگ */}
        <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-black">{storeName}</h1>
            <p className="mt-1 text-xs text-slate-500">فروشگاه اینترنتی لوازم دیجیتال — karzintell.ir</p>
          </div>
          <div className="text-left text-xs leading-6">
            <div><span className="text-slate-400">شماره فاکتور: </span><b>{order.code}</b></div>
            <div><span className="text-slate-400">تاریخ: </span>{order.placedAt ? faDateTime(order.placedAt) : faDateTime(order.createdAt)}</div>
            <div>
              <span className="text-slate-400">وضعیت پرداخت: </span>
              <b className={paid ? 'text-emerald-700' : 'text-amber-700'}>{paid ? 'پرداخت‌شده' : 'پرداخت‌نشده'}</b>
            </div>
          </div>
        </div>

        {/* مشخصات خریدار */}
        <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs leading-6 print:bg-white print:outline print:outline-1 print:outline-slate-300">
          <div>
            <div className="mb-1 font-bold text-slate-500">مشخصات خریدار</div>
            <div>نام: {addr.receiverName || '—'}</div>
            <div>موبایل: <span dir="ltr">{addr.receiverPhone || '—'}</span></div>
          </div>
          <div>
            <div className="mb-1 font-bold text-slate-500">آدرس تحویل</div>
            <div>{addr.province}، {addr.city}</div>
            <div>{addr.address}{addr.postalCode ? ` — کدپستی: ${addr.postalCode}` : ''}</div>
          </div>
        </div>

        {/* اقلام */}
        <table className="mt-6 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="p-2.5 text-right font-medium">#</th>
              <th className="p-2.5 text-right font-medium">شرح کالا</th>
              <th className="p-2.5 text-center font-medium">تعداد</th>
              <th className="p-2.5 text-left font-medium">قیمت واحد</th>
              <th className="p-2.5 text-left font-medium">تخفیف</th>
              <th className="p-2.5 text-left font-medium">مبلغ کل</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={it.id} className="border-b border-slate-200">
                <td className="p-2.5">{faNumber(i + 1)}</td>
                <td className="p-2.5">
                  <div className="font-medium text-slate-800">{it.productName}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {it.variantTitle || ''}{it.warrantyMonths ? ` • گارانتی ${faNumber(it.warrantyMonths)} ماهه` : ''} • SKU: {it.sku}
                  </div>
                </td>
                <td className="p-2.5 text-center">{faNumber(it.quantity)}</td>
                <td className="p-2.5 text-left" dir="ltr">{toToman(it.unitPrice)}</td>
                <td className="p-2.5 text-left" dir="ltr">{it.discountAmount ? toToman(it.discountAmount) : '—'}</td>
                <td className="p-2.5 text-left font-bold" dir="ltr">{toToman(it.totalPrice - (it.discountAmount || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* جمع‌ها */}
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">جمع اقلام:</span><span>{toToman(order.subtotal)}</span></div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>تخفیف{order.couponCode ? ` (${order.couponCode})` : ''}:</span><span>{toToman(order.discountTotal)}-</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-slate-500">هزینه ارسال{order.shippingMethod ? ` (${order.shippingMethod})` : ''}:</span><span>{order.shippingCost ? toToman(order.shippingCost) : 'رایگان'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">مالیات بر ارزش افزوده (۹٪):</span><span>{toToman(order.taxTotal)}</span></div>
            <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-base font-black">
              <span>مبلغ نهایی:</span><span>{toToman(order.grandTotal)}</span>
            </div>
          </div>
        </div>

        {order.customerNote && (
          <div className="mt-6 rounded-xl border border-slate-200 p-3 text-xs text-slate-500">
            <b>یادداشت مشتری:</b> {order.customerNote}
          </div>
        )}

        {/* امضا */}
        <div className="mt-10 flex justify-between text-center text-xs text-slate-500">
          <div className="w-40 border-t border-slate-300 pt-2">امضای فروشنده</div>
          <div className="pt-2 text-[10px] text-slate-400">این فاکتور به‌صورت سیستمی صادر شده است — {order.code}</div>
          <div className="w-40 border-t border-slate-300 pt-2">امضای خریدار</div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-3xl, .max-w-3xl * { visibility: visible; }
          .max-w-3xl { position: absolute; inset: 0; width: 100%; max-width: 100%; margin: 0; }
        }
      `}</style>
    </div>
  );
}
