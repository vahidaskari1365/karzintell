'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faNumber } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Card, Field, Input, PageLoading, Select, Switch } from '@/components/ui';
import { Dialog } from '@/components/dialog';
import { PageHeader, Pill } from '../_shared';

interface AttrValue { id: number; value: string; sortOrder: number }
interface Attr {
  id: number; name: string; code: string; type: string; unit: string | null;
  groupName?: string | null; isFilterable: boolean; values: AttrValue[];
}

const TYPES = [
  { value: 'select', label: 'انتخابی (لیست مقادیر)' },
  { value: 'text', label: 'متنی' },
  { value: 'number', label: 'عددی' },
  { value: 'multiselect', label: 'چندانتخابی' },
  { value: 'boolean', label: 'بله/خیر' },
];

export default function AdminAttributesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Attr> | null>(null);
  const [valuesFor, setValuesFor] = useState<Attr | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-attributes'],
    queryFn: async () => (await api<Attr[]>('/admin/attributes')).data,
  });

  const save = useMutation({
    mutationFn: async (f: Partial<Attr>) =>
      f.id
        ? api(`/admin/attributes/${f.id}`, { method: 'PATCH', body: JSON.stringify(f) })
        : api('/admin/attributes', { method: 'POST', body: JSON.stringify(f) }),
    onSuccess: () => {
      toast.success('ویژگی ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-attributes'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api(`/admin/attributes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('ویژگی حذف شد');
      qc.invalidateQueries({ queryKey: ['admin-attributes'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="ویژگی‌ها"
        subtitle="صفت‌های فنی و فیلتر محصولات — بعداً به دسته‌ها متصل می‌شوند"
        action={<Button size="sm" onClick={() => setForm({ name: '', code: '', type: 'select', unit: '', groupName: '', isFilterable: true })}><Plus className="h-4 w-4" /> ویژگی جدید</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(items || []).map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-800">{a.name}</p>
                <p className="mt-0.5 text-2xs text-slate-400">
                  <code dir="ltr">{a.code}</code>
                  {a.unit && ` · واحد: ${a.unit}`}
                  {a.groupName && ` · گروه: ${a.groupName}`}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setForm({ ...a, unit: a.unit || '', groupName: a.groupName || '' })} className="rounded-lg px-2 py-1.5 text-2xs text-slate-500 hover:bg-slate-100">ویرایش</button>
                <button onClick={() => remove.mutate(a.id)} className="rounded-lg p-1.5 text-slate-300 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {a.isFilterable && <Pill status="active" label="فیلتر فروشگاه" />}
              <Pill status="draft" label={TYPES.find((t) => t.value === a.type)?.label || a.type} />
              <Pill status="pending" label={`${faNumber(a.values.length)} مقدار`} />
            </div>
            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => setValuesFor(a)}>
              مدیریت مقادیر ({faNumber(a.values.length)})
            </Button>
          </Card>
        ))}
      </div>

      {/* فرم ویژگی */}
      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.id ? 'ویرایش ویژگی' : 'ویژگی جدید'}>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="نام (رنگ)" required><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="کد ماشینی (color)" required><Input dir="ltr" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} /></Field>
              <Field label="نوع">
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="واحد (اختیاری: GB, mAh…)"><Input value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
            </div>
            <Field label="گروه مشخصات (مثلاً: عمومی، نمایشگر)"><Input value={form.groupName || ''} onChange={(e) => setForm({ ...form, groupName: e.target.value })} /></Field>
            <Switch label="در فیلترهای فروشگاه نمایش داده شود" checked={!!form.isFilterable} onChange={(v) => setForm({ ...form, isFilterable: v })} />
            <Button className="w-full" loading={save.isPending} disabled={!form.name || !form.code} onClick={() => save.mutate(form)}>ذخیره ویژگی</Button>
          </div>
        )}
      </Dialog>

      {valuesFor && <ValuesDialog attr={valuesFor} onClose={() => setValuesFor(null)} />}
    </div>
  );
}

function ValuesDialog({ attr, onClose }: { attr: Attr; onClose: () => void }) {
  const qc = useQueryClient();
  const [newValue, setNewValue] = useState('');

  const saveValue = useMutation({
    mutationFn: async (payload: { id?: number; attributeId: number; value: string; sortOrder?: number }) =>
      payload.id
        ? api(`/admin/attributes/values/${payload.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : api('/admin/attributes/values', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-attributes'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeValue = useMutation({
    mutationFn: async (id: number) => api(`/admin/attributes/values/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-attributes'] }),
  });

  return (
    <Dialog open onClose={onClose} title={`مقادیر «${attr.name}»`}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {attr.values.map((v) => (
            <span key={v.id} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700">
              {v.value}
              <button onClick={() => removeValue.mutate(v.id)} className="text-slate-400 hover:text-rose-500"><X className="h-3 w-3" /></button>
            </span>
          ))}
          {attr.values.length === 0 && <p className="text-xs text-slate-400">مقداری تعریف نشده</p>}
        </div>
        <div className="flex gap-2">
          <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="مقدار جدید: مشکی، ۱۲۸ گیگابایت…" />
          <Button
            disabled={!newValue.trim()}
            loading={saveValue.isPending}
            onClick={() => saveValue.mutate({ attributeId: attr.id, value: newValue.trim(), sortOrder: attr.values.length + 1 }, { onSuccess: () => setNewValue('') })}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
