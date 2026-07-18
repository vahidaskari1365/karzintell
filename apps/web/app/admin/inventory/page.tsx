'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle, Boxes, History, Search } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faDateTime, faNumber } from '@/lib/format';
import { hasPermission, toast, useAuthStore } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Select, Empty } from '@/components/ui';
import { Dialog } from '@/components/dialog';
import { Pagination } from '@/components/display';
import { PageHeader, tableCls, Pill } from '../_shared';

interface StockRow {
  variantId: number; warehouseId: number; quantity: number; reserved: number; available: number;
  lowStockThreshold: number; sku: string; variantTitle: string | null; productName: string; productId: number; warehouseName: string;
}

interface Movement {
  id: number; variantId: number; warehouseId: number; type: string; quantity: number;
  qtyBefore: number; qtyAfter: number; referenceType: string | null; referenceId: number | null;
  note: string | null; createdAt: string; sku?: string;
}

const MOVE_LABELS: Record<string, string> = {
  in: 'ورود', out: 'خروج', reserve: 'رزرو', release: 'آزادسازی', return: 'عودت', adjust: 'اصلاح',
};

export default function AdminInventoryPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const canManage = hasPermission(user, 'inventory.manage');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);
  const [historyFor, setHistoryFor] = useState<StockRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-inventory', page, search, lowOnly],
    queryFn: async () => api<StockRow[]>(`/admin/inventory${qs({ page, limit: 20, q: search || undefined, low_stock: lowOnly ? 1 : undefined })}`),
  });

  const items = data?.data || [];

  return (
    <div>
      <PageHeader title="موجودی انبار" subtitle="قابل‌فروش = موجودی − رزرو" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }} className="relative min-w-56 flex-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو: نام محصول، SKU…" className="ps-9" />
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </form>
        <Button variant={lowOnly ? 'primary' : 'secondary'} size="sm" onClick={() => { setPage(1); setLowOnly(!lowOnly); }}>
          <AlertTriangle className="h-4 w-4" /> فقط کم‌موجود
        </Button>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <Empty title="موردی یافت نشد" />
      ) : (
        <>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>محصول / SKU</th>
                  <th className={tableCls.th}>انبار</th>
                  <th className={tableCls.th}>موجودی</th>
                  <th className={tableCls.th}>رزرو</th>
                  <th className={tableCls.th}>قابل‌فروش</th>
                  <th className={tableCls.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={`${r.variantId}-${r.warehouseId}`} className={tableCls.row}>
                    <td className={tableCls.td}>
                      <p className="font-medium">{r.productName}</p>
                      <p className="text-2xs text-slate-400" dir="ltr">{r.sku}{r.variantTitle ? ` — ${r.variantTitle}` : ''}</p>
                    </td>
                    <td className={tableCls.td}>{r.warehouseName}</td>
                    <td className={tableCls.td}>
                      <span className={r.quantity <= r.lowStockThreshold ? 'font-black text-rose-600' : 'font-bold'}>{faNumber(r.quantity)}</span>
                      {r.quantity <= r.lowStockThreshold && <span className="ms-1 text-2xs text-rose-500">(کم)</span>}
                    </td>
                    <td className={tableCls.td}>{faNumber(r.reserved)}</td>
                    <td className={tableCls.td}><Pill status={r.available > 0 ? 'active' : 'rejected'} label={faNumber(r.available)} /></td>
                    <td className={`${tableCls.td} text-left`}>
                      <div className="flex justify-end gap-1">
                        {canManage && (
                          <Button size="sm" variant="secondary" onClick={() => setAdjusting(r)}>اصلاح</Button>
                        )}
                        <button onClick={() => setHistoryFor(r)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="تاریخچه گردش">
                          <History className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={data?.meta?.total || 0} onPage={setPage} />
        </>
      )}

      {adjusting && <AdjustDialog row={adjusting} onClose={() => { setAdjusting(null); qc.invalidateQueries({ queryKey: ['admin-inventory'] }); }} />}
      {historyFor && <MovementsDialog row={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}

function AdjustDialog({ row, onClose }: { row: StockRow; onClose: () => void }) {
  const [mode, setMode] = useState<'adjust' | 'set'>('adjust');
  const [type, setType] = useState<'in' | 'out' | 'return' | 'adjust'>('in');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');

  const submit = useMutation({
    mutationFn: async () =>
      mode === 'adjust'
        ? api('/admin/inventory/adjust', {
            method: 'POST',
            body: JSON.stringify({ variantId: row.variantId, warehouseId: row.warehouseId, type, quantity: Number(qty) || 0, note: note || undefined }),
          })
        : api('/admin/inventory/set', {
            method: 'POST',
            body: JSON.stringify({ variantId: row.variantId, warehouseId: row.warehouseId, quantity: Number(qty) || 0, note: note || undefined }),
          }),
    onSuccess: () => {
      toast.success('موجودی به‌روزرسانی شد');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onClose={onClose} title={`اصلاح موجودی — ${row.productName}`}>
      <div className="space-y-4">
        <p className="text-xs text-slate-400" dir="ltr">{row.sku}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="نوع عملیات">
            <Select value={mode} onChange={(e) => setMode(e.target.value as 'adjust' | 'set')}>
              <option value="adjust">ورود/خروج/عودت</option>
              <option value="set">شمارش و ثبت قطعی</option>
            </Select>
          </Field>
          {mode === 'adjust' && (
            <Field label="جهت">
              <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                <option value="in">ورود به انبار (+)</option>
                <option value="out">خروج از انبار (−)</option>
                <option value="return">عودت مشتری (+)</option>
                <option value="adjust">اصلاح دستی</option>
              </Select>
            </Field>
          )}
          <Field label={mode === 'set' ? 'موجودی جدید' : 'تعداد'} required>
            <Input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))} />
          </Field>
        </div>
        <Field label="یادداشت"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="علت تغییر…" /></Field>
        <Button className="w-full" loading={submit.isPending} disabled={!qty} onClick={() => submit.mutate()}>ثبت تغییر</Button>
      </div>
    </Dialog>
  );
}

function MovementsDialog({ row, onClose }: { row: StockRow; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', row.variantId, page],
    queryFn: async () => api<Movement[]>(`/admin/inventory/movements${qs({ variant_id: row.variantId, page, limit: 15 })}`),
  });

  return (
    <Dialog open onClose={onClose} title={`گردش انبار — ${row.sku}`}>
      {isLoading ? (
        <PageLoading />
      ) : (
        <>
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {(data?.data || []).map((m) => (
              <li key={m.id} className="rounded-xl border border-slate-100 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <Pill status={m.type === 'out' ? 'rejected' : 'active'} label={MOVE_LABELS[m.type] || m.type} />
                  <span className="text-slate-400">{faDateTime(m.createdAt)}</span>
                </div>
                <p className="mt-1.5 text-slate-600">
                  {faNumber(m.quantity)} عدد — موجودی: {faNumber(m.qtyBefore)} ← {faNumber(m.qtyAfter)}
                </p>
                {m.note && <p className="mt-1 text-slate-400">{m.note}</p>}
              </li>
            ))}
            {(data?.data || []).length === 0 && <p className="p-6 text-center text-xs text-slate-400">گردشی ثبت نشده</p>}
          </ul>
          <Pagination page={page} limit={15} total={data?.meta?.total || 0} onPage={setPage} />
        </>
      )}
    </Dialog>
  );
}
