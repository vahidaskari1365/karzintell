'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { mediaUrl } from '@/lib/branding';
import { faNumber } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Select, Switch, Empty } from '@/components/ui';
import { Dialog, ConfirmDialog } from '@/components/dialog';
import { ImageUpload } from '@/components/image-upload';
import { PageHeader, tableCls, Pill } from '../_shared';

const POSITIONS = [
  { value: 'home_hero', label: 'اسلایدر اصلی صفحه خانه' },
  { value: 'home_middle', label: 'میانه صفحه خانه' },
  { value: 'home_bottom', label: 'پایین صفحه خانه' },
  { value: 'category_top', label: 'بالای صفحه دسته' },
  { value: 'sidebar', label: 'سایدبار' },
];

interface Banner {
  id: number; title: string; subtitle: string | null; imagePath: string; mobileImagePath: string | null;
  linkUrl: string | null; position: string; sortOrder: number; isActive: boolean;
  startsAt: string | null; endsAt: string | null;
}

interface BannerForm {
  id?: number; title: string; subtitle: string; imagePath: string; mobileImagePath: string;
  linkUrl: string; position: string; sortOrder: string; isActive: boolean; startsAt: string; endsAt: string;
}

const emptyForm: BannerForm = {
  title: '', subtitle: '', imagePath: '', mobileImagePath: '', linkUrl: '',
  position: 'home_hero', sortOrder: '0', isActive: true, startsAt: '', endsAt: '',
};

const toForm = (b: Banner): BannerForm => ({
  id: b.id, title: b.title, subtitle: b.subtitle || '', imagePath: b.imagePath,
  mobileImagePath: b.mobileImagePath || '', linkUrl: b.linkUrl || '', position: b.position,
  sortOrder: String(b.sortOrder), isActive: b.isActive,
  startsAt: b.startsAt ? b.startsAt.slice(0, 10) : '', endsAt: b.endsAt ? b.endsAt.slice(0, 10) : '',
});

export default function AdminBannersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<BannerForm | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => (await api<Banner[] | { items: Banner[] }>('/admin/banners')).data,
  });
  const items: Banner[] = Array.isArray(data) ? data : (data as any)?.items || [];

  const save = useMutation({
    mutationFn: async (f: BannerForm) => {
      const payload = {
        title: f.title, subtitle: f.subtitle || undefined, imagePath: f.imagePath,
        mobileImagePath: f.mobileImagePath || undefined, linkUrl: f.linkUrl || undefined,
        position: f.position, sortOrder: Number(f.sortOrder) || 0, isActive: f.isActive,
        startsAt: f.startsAt || null, endsAt: f.endsAt || null,
      };
      return f.id
        ? api(`/admin/banners/${f.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : api('/admin/banners', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success('بنر ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api(`/admin/banners/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('بنر حذف شد');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="بنرها و اسلایدرها" action={<Button size="sm" onClick={() => setForm({ ...emptyForm })}><Plus className="h-4 w-4" /> بنر جدید</Button>} />

      {items.length === 0 ? (
        <Empty title="بنری ساخته نشده" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="relative h-32 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(b.imagePath) || undefined} alt="" className="h-full w-full object-cover" />
                <span className="absolute end-2 top-2"><Pill status={b.isActive ? 'active' : 'archived'} label={b.isActive ? 'فعال' : 'غیرفعال'} /></span>
              </div>
              <div className="p-3.5">
                <p className="font-bold text-slate-800">{b.title}</p>
                <p className="mt-0.5 text-2xs text-slate-400">
                  {POSITIONS.find((p) => p.value === b.position)?.label} · ترتیب {faNumber(b.sortOrder)}
                </p>
                <div className="mt-3 flex gap-1.5">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => setForm(toForm(b))}><Pencil className="h-3.5 w-3.5" /> ویرایش</Button>
                  <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => setDeleting(b)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.id ? 'ویرایش بنر' : 'بنر جدید'} size="lg">
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="تصویر دسکتاپ" required>
                <div className="flex items-center gap-2">
                  <ImageUpload value={form.imagePath} onChange={(p) => setForm({ ...form, imagePath: p })} purpose="banner" />
                  <Input dir="ltr" value={form.imagePath} onChange={(e) => setForm({ ...form, imagePath: e.target.value })} placeholder="banners/hero.jpg" className="text-xs" />
                </div>
              </Field>
              <Field label="تصویر موبایل (اختیاری)">
                <div className="flex items-center gap-2">
                  <ImageUpload value={form.mobileImagePath} onChange={(p) => setForm({ ...form, mobileImagePath: p })} purpose="banner" />
                  <Input dir="ltr" value={form.mobileImagePath} onChange={(e) => setForm({ ...form, mobileImagePath: e.target.value })} className="text-xs" />
                </div>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="عنوان" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="زیرعنوان"><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field>
              <Field label="لینک مقصد"><Input dir="ltr" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="/categories/mobile" /></Field>
              <Field label="جایگاه نمایش">
                <Select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
                  {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
              </Field>
              <Field label="ترتیب"><Input inputMode="numeric" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value.replace(/[^0-9]/g, '') })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="شروع نمایش"><Input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
                <Field label="پایان نمایش"><Input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></Field>
              </div>
            </div>
            <Switch label="فعال" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            <Button className="w-full" loading={save.isPending} disabled={!form.title.trim() || !form.imagePath} onClick={() => save.mutate(form)}>
              ذخیره بنر
            </Button>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending}
        title="حذف بنر" message={`«${deleting?.title}» حذف شود؟`}
      />
    </div>
  );
}
