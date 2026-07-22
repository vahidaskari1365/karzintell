'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Switch, Textarea, Empty } from '@/components/ui';
import { Dialog, ConfirmDialog } from '@/components/dialog';
import { ImageUpload } from '@/components/image-upload';
import { PageHeader, tableCls, Pill } from '../_shared';

interface Brand {
  id: number; name: string; slug: string; logoPath: string | null;
  description: string | null; website: string | null; isActive: boolean; sortOrder: number;
}

interface BrandForm {
  id?: number; name: string; slug: string; logoPath: string;
  website: string; description: string; sortOrder: string; isActive: boolean;
}

const emptyForm: BrandForm = { name: '', slug: '', logoPath: '', website: '', description: '', sortOrder: '0', isActive: true };

export default function AdminBrandsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<BrandForm | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: async () => (await api<Brand[]>('/admin/brands')).data,
  });

  const save = useMutation({
    mutationFn: async (f: BrandForm) =>
      f.id
        ? api(`/admin/brands/${f.id}`, { method: 'PATCH', body: JSON.stringify({ ...f, sortOrder: Number(f.sortOrder) || 0 }) })
        : api('/admin/brands', { method: 'POST', body: JSON.stringify({ ...f, sortOrder: Number(f.sortOrder) || 0 }) }),
    onSuccess: () => {
      toast.success('برند ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-brands'] });
      qc.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api(`/admin/brands/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('برند حذف شد');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-brands'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="برندها" action={<Button size="sm" onClick={() => setForm({ ...emptyForm })}><Plus className="h-4 w-4" /> برند جدید</Button>} />

      {(items || []).length === 0 ? (
        <Empty title="برندی ثبت نشده" />
      ) : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={tableCls.th}>برند</th>
                <th className={tableCls.th}>اسلاگ</th>
                <th className={tableCls.th}>وب‌سایت</th>
                <th className={tableCls.th}>وضعیت</th>
                <th className={tableCls.th}></th>
              </tr>
            </thead>
            <tbody>
              {(items || []).map((b) => (
                <tr key={b.id} className={tableCls.row}>
                  <td className={tableCls.td}>
                    <span className="font-medium">{b.name}</span>
                  </td>
                  <td className={tableCls.td}><code className="text-xs text-slate-400" dir="ltr">{b.slug}</code></td>
                  <td className={tableCls.td}>{b.website ? <a href={b.website} target="_blank" className="text-xs text-sky-600" rel="noreferrer">لینک</a> : '—'}</td>
                  <td className={tableCls.td}><Pill status={b.isActive ? 'active' : 'archived'} label={b.isActive ? 'فعال' : 'غیرفعال'} /></td>
                  <td className={`${tableCls.td} text-left`}>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setForm({ id: b.id, name: b.name, slug: b.slug, logoPath: b.logoPath || '', website: b.website || '', description: b.description || '', sortOrder: String(b.sortOrder), isActive: b.isActive })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleting(b)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
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

      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.id ? 'ویرایش برند' : 'برند جدید'}>
        {form && (
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <Field label="لوگو"><ImageUpload value={form.logoPath} onChange={(p) => setForm({ ...form, logoPath: p })} purpose="brand_logo" /></Field>
              <div className="flex-1">
                <Field label="نام برند" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="اسلاگ"><Input dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} placeholder="خودکار" /></Field>
              <Field label="ترتیب"><Input inputMode="numeric" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value.replace(/[^0-9]/g, '') })} /></Field>
            </div>
            <Field label="وب‌سایت"><Input dir="ltr" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" /></Field>
            <Field label="توضیح"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Switch label="فعال" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            <Button className="w-full" loading={save.isPending} disabled={!form.name.trim()} onClick={() => save.mutate(form)}>ذخیره برند</Button>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="حذف برند"
        message={`«${deleting?.name}» حذف شود؟`}
      />
    </div>
  );
}
