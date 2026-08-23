'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Select, Textarea, Empty } from '@/components/ui';
import { Dialog, ConfirmDialog } from '@/components/dialog';
import { PageHeader, tableCls, Pill } from '../_shared';

interface PageRow {
  id: number; title: string; slug: string; status: string; updatedAt: string;
  body?: string; metaTitle?: string | null; metaDescription?: string | null;
}

interface PageForm {
  id?: number; title: string; slug: string; body: string; status: string;
  metaTitle: string; metaDescription: string;
}

const emptyForm: PageForm = { title: '', slug: '', body: '', status: 'draft', metaTitle: '', metaDescription: '' };

export default function AdminPagesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<PageForm | null>(null);
  const [deleting, setDeleting] = useState<PageRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => (await api<PageRow[] | { items: PageRow[] }>('/admin/pages')).data,
  });
  const items: PageRow[] = Array.isArray(data) ? data : (data as any)?.items || [];

  const save = useMutation({
    mutationFn: async (f: PageForm) =>
      f.id
        ? api(`/admin/pages/${f.id}`, { method: 'PATCH', body: JSON.stringify(f) })
        : api('/admin/pages', { method: 'POST', body: JSON.stringify(f) }),
    onSuccess: () => {
      toast.success('صفحه ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-pages'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api(`/admin/pages/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('صفحه حذف شد');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-pages'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (row: PageRow) => {
    setForm({
      id: row.id, title: row.title, slug: row.slug, body: row.body || '',
      status: row.status, metaTitle: row.metaTitle || '', metaDescription: row.metaDescription || '',
    });
  };

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="صفحات سایت" subtitle="درباره ما، تماس با ما، شرایط و قوانین و…" action={<Button size="sm" onClick={() => setForm({ ...emptyForm })}><Plus className="h-4 w-4" /> صفحه جدید</Button>} />

      {items.length === 0 ? (
        <Empty title="صفحه‌ای ساخته نشده" />
      ) : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={tableCls.th}>عنوان</th>
                <th className={tableCls.th}>آدرس</th>
                <th className={tableCls.th}>وضعیت</th>
                <th className={tableCls.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className={tableCls.row}>
                  <td className={tableCls.td}><span className="font-medium">{p.title}</span></td>
                  <td className={tableCls.td}>
                    <a href={`/pages/${p.slug}`} target="_blank" className="flex items-center gap-1 text-xs text-sky-600" dir="ltr" rel="noreferrer">
                      /pages/{p.slug} <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className={tableCls.td}><Pill status={p.status} label={p.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'} /></td>
                  <td className={`${tableCls.td} text-left`}>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleting(p)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.id ? 'ویرایش صفحه' : 'صفحه جدید'} size="xl">
        {form && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="عنوان" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="اسلاگ"><Input dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} placeholder="خودکار" /></Field>
              <Field label="وضعیت">
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">پیش‌نویس</option>
                  <option value="published">منتشرشده</option>
                </Select>
              </Field>
            </div>
            <Field label="محتوا (HTML)" hint="تگ‌های مجاز: p, h2, ul, table, img و…" required>
              <Textarea rows={14} dir="rtl" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="<h2>درباره کارزینتل</h2><p>…</p>" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="عنوان متا"><Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} /></Field>
              <Field label="توضیح متا"><Input value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} /></Field>
            </div>
            <Button className="w-full" loading={save.isPending} disabled={!form.title.trim() || !form.body.trim()} onClick={() => save.mutate(form)}>
              ذخیره صفحه
            </Button>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending}
        title="حذف صفحه" message={`«${deleting?.title}» حذف شود؟`}
      />
    </div>
  );
}
