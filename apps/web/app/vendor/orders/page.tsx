'use client';

/* ==========================================================================
   لیست سفارش‌های فروشنده
   --------------------------------------------------------------------------
   - جدول با ستون‌های: کد سفارش، تعداد اقلام، مبلغ فروشنده، وضعیت، تاریخ
   - ردیف قابل گسترش برای نمایش اقلام متعلق به فروشنده
   - فیلتر وضعیت + صفحه‌بندی
   ========================================================================== */

import { useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShoppingBag } from 'lucide-react';
import clsx from 'clsx';
import { api, qs } from '@/lib/api-client';
import { faDateTime, faNumber, toToman } from '@/lib/format';
import { Select } from '@/components/ui';
import { Pagination } from '@/components/display';
import {
  ORDER_STATUS_LABELS, PageHeader, PageLoading, Pill, VendorEmptyState, VendorGuard, tableCls,
  type SellerOrder,
} from '../_shared';

const ORDER_STATUSES = [
  'pending_payment', 'paid', 'processing', 'ready_to_ship',
  'shipped', 'delivered', 'cancelled', 'refunded',
] as const;

const PAYMENT_LABELS: Record<string, string> = {
  paid: 'پرداخت‌شده',
  unpaid: 'پرداخت‌نشده',
  failed: 'ناموفق',
  refunded: 'مستردشده',
  partially_refunded: 'عودت جزئی',
};

export default function VendorOrdersPage() {
  return (
    <VendorGuard>
      <OrdersContent />
    </VendorGuard>
  );
}

function OrdersContent() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['seller-orders', page, status],
    queryFn: async () =>
      api<SellerOrder[]>(`/seller/orders${qs({ page, limit: 20, status: status || undefined })}`),
  });

  const items = data?.data || [];
  const total = data?.meta?.total || 0;

  return (
    <div>
      <PageHeader title="سفارش‌های من" subtitle={data ? `${faNumber(total)} سفارش` : undefined} />

      {/* فیلتر وضعیت */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          className="max-w-52"
        >
          <option value="">همه وضعیت‌ها</option>
          {ORDER_STATUSES.map((st) => (
            <option key={st} value={st}>{ORDER_STATUS_LABELS[st]}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <VendorEmptyState
          icon={ShoppingBag}
          title="سفارشی یافت نشد"
          description="سفارش‌هایی که شامل محصولات شما باشند، اینجا نمایش داده می‌شوند."
        />
      ) : (
        <>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}></th>
                  <th className={tableCls.th}>کد سفارش</th>
                  <th className={tableCls.th}>تعداد اقلام</th>
                  <th className={tableCls.th}>مبلغ شما (تومان)</th>
                  <th className={tableCls.th}>وضعیت</th>
                  <th className={tableCls.th}>تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => {
                  const sellerTotal = o.sellerItems.reduce((sum, it) => sum + it.totalPrice, 0);
                  const isOpen = expanded === o.id;
                  return (
                    <Fragment key={o.id}>
                      <tr className={tableCls.row}>
                        <td className={`${tableCls.td} w-10`}>
                          <button
                            onClick={() => setExpanded(isOpen ? null : o.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-emerald-300"
                            aria-label="جزئیات اقلام"
                          >
                            <ChevronDown className={clsx('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                          </button>
                        </td>
                        <td className={tableCls.td}>
                          <span className="font-bold text-slate-100" dir="ltr">{o.code}</span>
                        </td>
                        <td className={tableCls.td}>
                          {faNumber(o.sellerItems.length)} قلم
                        </td>
                        <td className={tableCls.td}>{toToman(sellerTotal)}</td>
                        <td className={tableCls.td}>
                          <Pill status={o.status} label={ORDER_STATUS_LABELS[o.status] || o.status} />
                        </td>
                        <td className={tableCls.td}>
                          <span className="text-xs text-slate-400">{faDateTime(o.createdAt)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={6} className="p-0">
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-white/5 bg-white/[0.02] p-4">
                                  <p className="mb-3 text-xs font-bold text-slate-400">
                                    اقلام این سفارش که متعلق به شماست
                                  </p>
                                  <div className="overflow-x-auto">
                                    <table className="w-full min-w-[480px] text-sm">
                                      <thead className="text-2xs text-slate-500">
                                        <tr>
                                          <th className="px-3 py-2 text-start font-bold">محصول</th>
                                          <th className="px-3 py-2 text-start font-bold">SKU</th>
                                          <th className="px-3 py-2 text-start font-bold">تعداد</th>
                                          <th className="px-3 py-2 text-start font-bold">قیمت واحد</th>
                                          <th className="px-3 py-2 text-start font-bold">مجموع</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {o.sellerItems.map((it) => (
                                          <tr key={it.id} className="border-t border-white/5">
                                            <td className="px-3 py-2 text-slate-200">
                                              {it.productName}
                                              {it.variantTitle && (
                                                <span className="block text-2xs text-slate-400">{it.variantTitle}</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-slate-400" dir="ltr">{it.sku}</td>
                                            <td className="px-3 py-2 text-slate-300">{faNumber(it.quantity)}</td>
                                            <td className="px-3 py-2 text-slate-300">{toToman(it.unitPrice)}</td>
                                            <td className="px-3 py-2 font-bold text-slate-100">{toToman(it.totalPrice)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className="mt-3 flex flex-wrap justify-end gap-4 text-xs">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                      <span>پرداخت:</span>
                                      <Pill
                                        status={o.paymentStatus}
                                        label={PAYMENT_LABELS[o.paymentStatus] || o.paymentStatus}
                                      />
                                    </div>
                                    {o.shippingMethod && (
                                      <div className="text-slate-400">
                                        ارسال: <span className="text-slate-200">{o.shippingMethod}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
