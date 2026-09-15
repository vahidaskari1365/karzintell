'use client';

/* ==========================================================================
   لیست محصولات فروشنده
   --------------------------------------------------------------------------
   - جدول با ستون‌های: تصویر/نام، قیمت، موجودی، وضعیت، عملیات
   - صفحه‌بندی (۲۰ مورد در هر صفحه)
   - جستجو و فیلتر وضعیت
   - دکمه «محصول جدید»
   - حالت خالی
   ========================================================================== */

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Plus, Search } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faNumber, toToman } from '@/lib/format';
import { Button, Input, Select } from '@/components/ui';
import { Pagination } from '@/components/display';
import {
  PageHeader, PageLoading, Pill, VendorEmptyState, VendorGuard, tableCls,
  PRODUCT_STATUS_LABELS, type SellerProduct,
} from '../_shared';

export default function VendorProductsPage() {
  return (
    <VendorGuard>
      <ProductsContent />
    </VendorGuard>
  );
}

function ProductsContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-products', page, search, status],
    queryFn: async () =>
      api<SellerProduct[]>(
        `/seller/products${qs({ page, limit: 20, q: search || undefined, status: status || undefined })}`,
      ),
  });

  const items = data?.data || [];
  const total = data?.meta?.total || 0;

  return (
    <div>
      <PageHeader
        title="محصولات من"
        subtitle={data ? `${faNumber(total)} محصول` : undefined}
        action={
          <Link href="/vendor/products/new">
            <Button size="sm"><Plus className="h-4 w-4" /> محصول جدید</Button>
          </Link>
        }
      />

      {/* فیلترها */}
      <div className="mb-4 flex flex-wrap gap-2">
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }}
          className="relative min-w-56 flex-1"
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی نام محصول…"
            className="ps-9"
          />
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </form>
        <Select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          className="max-w-44"
        >
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(PRODUCT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <VendorEmptyState
          title="محصولی یافت نشد"
          description="اولین محصول خود را اضافه کنید تا در فروشگاه شما نمایش داده شود."
          action={
            <Link href="/vendor/products/new" className="mt-2 inline-flex">
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
                <Plus className="h-4 w-4" /> افزودن محصول جدید
              </span>
            </Link>
          }
        />
      ) : (
        <>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>محصول</th>
                  <th className={tableCls.th}>قیمت از (تومان)</th>
                  <th className={tableCls.th}>موجودی</th>
                  <th className={tableCls.th}>فروش</th>
                  <th className={tableCls.th}>وضعیت</th>
                  <th className={tableCls.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className={tableCls.row}>
                    <td className={tableCls.td}>
                      <button
                        onClick={() => router.push(`/vendor/products/${p.id}`)}
                        className="text-start"
                      >
                        <p className="font-medium text-slate-100 hover:text-emerald-300">{p.name}</p>
                        <p className="text-2xs text-slate-400" dir="ltr">{p.slug}</p>
                      </button>
                    </td>
                    <td className={tableCls.td}>
                      {p.minPrice != null ? toToman(p.minPrice) : <span className="text-slate-500">—</span>}
                    </td>
                    <td className={tableCls.td}>
                      {p.minPrice != null ? (
                        <span className="text-slate-300">متغیر</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className={tableCls.td}>
                      <span className="text-xs text-slate-400">{faNumber(p.soldCount)}</span>
                    </td>
                    <td className={tableCls.td}>
                      <Pill status={p.status} label={PRODUCT_STATUS_LABELS[p.status] || p.status} />
                    </td>
                    <td className={`${tableCls.td} text-left`}>
                      <Link
                        href={`/vendor/products/${p.id}`}
                        className="inline-flex rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-emerald-300"
                        title="ویرایش"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
