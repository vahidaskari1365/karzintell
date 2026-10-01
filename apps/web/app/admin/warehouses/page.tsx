'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faDateTime, faNumber } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Switch, Empty } from '@/components/ui';
import { Dialog, ConfirmDialog } from '@/components/dialog';
import { PageHeader, tableCls, Pill } from '../_shared';

/** یک انبار — منطبق با موجودیت warehouses در بک‌اند */
interface Warehouse {
  id: number;
  name: string;
  code: string;
  province: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseForm {
  id?: number;
  name: string;
  code: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  phone: string;
  isActive: boolean;
}

const emptyForm: WarehouseForm = {
  name: '', code: '', province: '', city: '', address: '', postalCode: '', phone: '', isActive: true,
};

const toForm = (w: Warehouse): WarehouseForm => ({
  id: w.id,
  name: w.name,
  code: w.code,
  province: w.province || '',
  city: w.city || '',
  address: w.address || '',
  postalCode: w.postalCode || '',
  phone: w.phone || '',
  isActive: w.isActive,
});

/** صفحهٔ CRUD انبارها — GET / POST / PATCH / DELETE /admin/warehouses */
export default function AdminWarehousesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<WarehouseForm | null>(null);
  const [deleting, setDeleting] = useState<Warehouse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-warehouses'],
    queryFn: async () => (await api<Warehouse[]>('/admin/warehouses')).data,
  });
  const items: Warehouse[] = data || [];

  // ایجاد یا ویرایش انبار
  const save = useMutation({
    mutationFn: async (f: WarehouseForm) => {
      const payload = {
        name: f.name.trim(),
        code: f.code.trim().toUpperCase(),
        province: f.province || undefined,
        city: f.city || undefined,
        address: f.address || undefined,
        postalCode: f.postalCode || undefined,
        phone: f.phone || undefined,
        isActive: f.isActive,
      };
      return f.id
        ? api(`/admin/warehouses/${f.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : api('/admin/warehouses', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success('انبار ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-warehouses'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // حذف انبار — بک‌اند در صورت وجود ردیف موجودی خطای WAREHOUSE_IN_USE می‌دهد
  const remove = useMutation({
    mutationFn: async (id: number) => api(`/admin/warehouses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('انبار حذف شد');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-warehouses'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="انبارها"
        subtitle="مدیریت مکان‌های انبارش کالا"
        action={<Button size="sm" onClick={() => setForm({ ...emptyForm })}><Plus className="h-4 w-4" /> انبار جدید</Button>}
      />

      {items.length === 0 ? (
        <Empty title="انباری تعریف نشده" />
      ) : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={tableCls.th}>نام</th>
                <th className={tableCls.th}>کد</th>
                <th className={tableCls.th}>استان / شهر</th>
                <th className={tableCls.th}>تلفن</th>
                <th className={tableCls.th}>وضعیت</th>
                <th className={tableCls.th}>ایجاد</th>
                <th className={tableCls.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id} className={tableCls.row}>
                  <td className={tableCls.td}>
                    <p className="font-medium">{w.name}</p>
                    {w.address && <p className="text-2xs text-slate-600 dark:text-slate-200">{w.address}</p>}
                  </td>
                  <td className={tableCls.td}><code className="text-xs text-slate-600 dark:text-slate-200" dir="ltr">{w.code}</code></td>
                  <td className={tableCls.td}>{w.province || w.city ? `${w.province || '—'} / ${w.city || '—'}` : '—'}</td>
                  <td className={tableCls.td}><span dir="ltr">{w.phone || '—'}</span></td>
                  <td className={tableCls.td}><Pill status={w.isActive ? 'active' : 'archived'} label={w.isActive ? 'فعال' : 'غیرفعال'} /></td>
                  <td className={tableCls.td}><span className="text-xs text-slate-600 dark:text-slate-200">{faDateTime(w.createdAt)}</span></td>
                  <td className={`${tableCls.td} text-left`}>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setForm(toForm(w))}
                        className="rounded-lg p-2 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-700 dark:text-slate-200"
                        title="ویرایش"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(w)}
                        className="rounded-lg p-2 text-slate-600 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.id ? 'ویرایش انبار' : 'انبار جدید'}>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="نام انبار" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثلاً: انبار مرکزی تهران" /></Field>
              <Field label="کد (یکتا)" required><Input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} placeholder="WH-01" /></Field>
              <Field label="استان"><Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field>
              <Field label="شهر"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
              <Field label="تلفن"><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="021…" /></Field>
              <Field label="کدپستی"><Input dir="ltr" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></Field>
            </div>
            <Field label="نشانی"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Switch label="فعال" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            <Button className="w-full" loading={save.isPending} disabled={!form.name.trim() || !form.code.trim()} onClick={() => save.mutate(form)}>
              ذخیره انبار
            </Button>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="حذف انبار"
        message={`انبار «${deleting?.name}» حذف شود؟ در صورت وجود ردیف موجودی ثبت‌شده بک‌اند اجازهٔ حذف نخواهد داد.`}
      />
    </div>
  );
}
