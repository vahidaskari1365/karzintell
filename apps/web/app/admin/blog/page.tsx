'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Newspaper, Pencil, PenLine, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faDate, faNumber } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Select, Switch, Tabs, Textarea } from '@/components/ui';
import { ConfirmDialog, Dialog } from '@/components/dialog';
import { ImageUpload } from '@/components/image-upload';
import { PageHeader, tableCls, Pill } from '../_shared';

interface Post {
  id: number; title: string; slug: string; excerpt: string | null; body: string;
  coverPath: string | null; kind: 'post' | 'news'; status: 'draft' | 'published';
  metaTitle: string | null; metaDescription: string | null; publishedAt: string | null;
}

interface PostForm {
  id?: number; title: string; slug: string; excerpt: string; body: string;
  coverPath: string; status: 'draft' | 'published'; metaTitle: string; metaDescription: string;
}

const emptyForm: PostForm = { title: '', slug: '', excerpt: '', body: '', coverPath: '', status: 'draft', metaTitle: '', metaDescription: '' };

export default function AdminBlogPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<'post' | 'news'>('post');
  const [form, setForm] = useState<PostForm | null>(null);
  const [deleting, setDeleting] = useState<Post | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-blog', kind],
    queryFn: async () => (await api<Post[]>(`/admin/blog?kind=${kind}&limit=100`)).data,
  });
  const items = data || [];

  const save = useMutation({
    mutationFn: async (f: PostForm) =>
      api(f.id ? `/admin/blog/${f.id}` : '/admin/blog', {
        method: f.id ? 'PATCH' : 'POST',
        body: {
          title: f.title, slug: f.slug || undefined, excerpt: f.excerpt || null,
          body: f.body, coverPath: f.coverPath || null, kind,
          status: f.status, metaTitle: f.metaTitle || null, metaDescription: f.metaDescription || null,
        },
      }),
    onSuccess: () => {
      toast.success('ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-blog'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api(`/admin/blog/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('حذف شد');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-blog'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title={kind === 'news' ? 'اخبار' : 'وبلاگ'}
        subtitle="مقالات راهنما، نقد و بررسی و اطلاعیه‌های فروشگاه"
        action={<Button size="sm" onClick={() => setForm({ ...emptyForm })}><Plus className="h-4 w-4" /> {kind === 'news' ? 'خبر جدید' : 'مقاله جدید'}</Button>}
      />

      <div className="mb-4 max-w-md">
        <Tabs
          tabs={[{ key: 'post', label: 'مقالات وبلاگ' }, { key: 'news', label: 'اخبار و اطلاعیه‌ها' }]}
          active={kind}
          onChange={(k) => setKind(k as 'post' | 'news')}
        />
      </div>

      {isLoading ? <PageLoading /> : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={tableCls.th}>عنوان</th>
                <th className={tableCls.th}>اسلاگ</th>
                <th className={tableCls.th}>وضعیت</th>
                <th className={tableCls.th}>انتشار</th>
                <th className={tableCls.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className={tableCls.row}>
                  <td className={`${tableCls.td} font-bold`}>{p.title}</td>
                  <td className={tableCls.td}><code className="text-2xs text-slate-400" dir="ltr">{p.slug}</code></td>
                  <td className={tableCls.td}><Pill status={p.status === 'published' ? 'active' : 'pending'} label={p.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'} /></td>
                  <td className={tableCls.td}><span className="text-2xs text-slate-400">{p.publishedAt ? faDate(p.publishedAt) : '—'}</span></td>
                  <td className={`${tableCls.td} text-left`}>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setForm({
                          id: p.id, title: p.title, slug: p.slug, excerpt: p.excerpt || '', body: p.body,
                          coverPath: p.coverPath || '', status: p.status, metaTitle: p.metaTitle || '', metaDescription: p.metaDescription || '',
                        })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      ><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleting(p)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-xs text-slate-400">هنوز چیزی ثبت نشده است</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.id ? 'ویرایش' : kind === 'news' ? 'خبر جدید' : 'مقاله جدید'} size="lg">
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="عنوان" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="اسلاگ (URL)" hint="خالی = از روی عنوان ساخته می‌شود"><Input dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
            </div>
            <Field label="خلاصه"><Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></Field>
            <Field label="متن (HTML ساده مجاز است)" required>
              <Textarea rows={10} dir="rtl" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="font-mono text-xs" />
            </Field>
            <Field label="تصویر کاور">
              <ImageUpload value={form.coverPath} onChange={(v) => setForm({ ...form, coverPath: v })} purpose="blog" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Meta Title (سئو)"><Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} /></Field>
              <Field label="Meta Description (سئو)"><Input value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} /></Field>
            </div>
            <Switch label="انتشار" checked={form.status === 'published'} onChange={(v) => setForm({ ...form, status: v ? 'published' : 'draft' })} />
            <Button className="w-full" loading={save.isPending} disabled={!form.title.trim() || !form.body.trim()} onClick={() => save.mutate(form)}>ذخیره</Button>
          </div>
        )}
      </Dialog>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending} danger
        title="حذف" message={`«${deleting?.title}» حذف شود؟`} />
    </div>
  );
}
