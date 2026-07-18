'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faNumber, toToman } from '@/lib/format';
import { PRODUCT_STATUS_LABELS } from '@/lib/types';
import { toast } from '@/lib/auth-store';
import { Button, Input, PageLoading, Select, Empty } from '@/components/ui';
import { Pagination } from '@/components/display';
import { ConfirmDialog } from '@/components/dialog';
import { PageHeader, tableCls, Pill } from '../_shared';

interface AdminProductRow {
  id: number; code: string | null; name: string; slug: string; status: string;
  minPrice: number | null; soldCount: number; ratingAvg: number;
  brand: string | null; category: string | null; image: string | null; stock: number; createdAt: string;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [deleting, setDeleting] = useState<AdminProductRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search, status],
    queryFn: async () =>
      api<{ items: AdminProductRow[] }>(`/admin/products${qs({ page, limit: 15, q: search || undefined, status: status || undefined })}`),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api(`/admin/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('محصول حذف شد');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.data.items || [];

  return (
    <div>
      <PageHeader
        title="محصولات"
        subtitle={data ? `${faNumber(data.meta?.total || 0)} محصول` : undefined}
        action={
          <Link href="/admin/products/new">
            <Button size="sm"><Plus className="h-4 w-4" /> محصول جدید</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }}
          className="relative min-w-56 flex-1"
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو: نام، کد، اسلاگ…" className="ps-9" />
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </form>
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="max-w-44">
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(PRODUCT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <Empty title="محصولی یافت نشد" description="اولین محصول را ایجاد کنید" />
      ) : (
        <>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>محصول</th>
                  <th className={tableCls.th}>کد</th>
                  <th className={tableCls.th}>دسته / برند</th>
                  <th className={tableCls.th}>قیمت از (تومان)</th>
                  <th className={tableCls.th}>موجودی</th>
                  <th className={tableCls.th}>وضعیت</th>
                  <th className={tableCls.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className={tableCls.row}>
                    <td className={tableCls.td}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt="" className="h-full w-full object-contain" />
                          ) : <span className="text-2xs text-slate-300">بدون عکس</span>}
                        </span>
                        <button onClick={() => router.push(`/admin/products/${p.id}`)} className="text-start font-medium text-slate-800 hover:text-orange-600">
                          {p.name}
                        </button>
                      </div>
                    </td>
                    <td className={tableCls.td}>{p.code || '—'}</td>
                    <td className={tableCls.td}><span className="text-xs">{p.category || '—'}<br />{p.brand || ''}</span></td>
                    <td className={tableCls.td}>{p.minPrice != null ? toToman(p.minPrice) : '—'}</td>
                    <td className={tableCls.td}>
                      <span className={p.stock <= 5 ? 'font-bold text-rose-600' : ''}>{faNumber(p.stock)}</span>
                    </td>
                    <td className={tableCls.td}><Pill status={p.status} label={PRODUCT_STATUS_LABELS[p.status] || p.status} /></td>
                    <td className={`${tableCls.td} text-left`}>
                      <div className="flex justify-end gap-1">
                        <Link href={`/admin/products/${p.id}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button onClick={() => setDeleting(p)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={15} total={data?.meta?.total || 0} onPage={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="حذف محصول"
        message={`«${deleting?.name}» برای همیشه حذف می‌شود. مطمئن هستید؟`}
      />
    </div>
  );
}
