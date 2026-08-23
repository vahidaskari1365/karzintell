'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { CategoryNode } from '@/lib/types';
import { toast } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Select, Switch, Textarea, Card, Empty } from '@/components/ui';
import { Dialog, ConfirmDialog } from '@/components/dialog';
import { PageHeader, tableCls, Pill } from '../_shared';

interface CategoryForm {
  id?: number;
  name: string;
  slug: string;
  parentId: number | 0;
  description: string;
  sortOrder: string;
  isActive: boolean;
}

const emptyForm: CategoryForm = { name: '', slug: '', parentId: 0, description: '', sortOrder: '0', isActive: true };

function flatten(nodes: CategoryNode[], depth = 0): Array<CategoryNode & { depth: number }> {
  return nodes.flatMap((n) => [{ ...n, depth }, ...flatten(n.children || [], depth + 1)]);
}

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<CategoryForm | null>(null);
  const [deleting, setDeleting] = useState<CategoryNode | null>(null);
  const [linking, setLinking] = useState<CategoryNode | null>(null);

  const { data: tree, isLoading } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: async () => (await api<CategoryNode[]>('/categories')).data,
  });

  const save = useMutation({
    mutationFn: async (f: CategoryForm) =>
      f.id
        ? api(`/admin/categories/${f.id}`, { method: 'PATCH', body: JSON.stringify(f) })
        : api('/admin/categories', { method: 'POST', body: JSON.stringify(f) }),
    onSuccess: () => {
      toast.success('دسته ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['categories-tree'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api(`/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('دسته حذف شد');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['categories-tree'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;
  const flat = flatten(tree || []);

  return (
    <div>
      <PageHeader
        title="دسته‌بندی‌ها"
        subtitle="ساختار درختی فروشگاه — مثل: دیجیتال ← موبایل ← سامسونگ ← سری S"
        action={<Button size="sm" onClick={() => setForm({ ...emptyForm })}><Plus className="h-4 w-4" /> دسته جدید</Button>}
      />

      {flat.length === 0 ? (
        <Empty title="دسته‌ای ساخته نشده" />
      ) : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={tableCls.th}>نام دسته</th>
                <th className={tableCls.th}>اسلاگ</th>
                <th className={tableCls.th}>وضعیت</th>
                <th className={tableCls.th}>ویژگی‌ها</th>
                <th className={tableCls.th}></th>
              </tr>
            </thead>
            <tbody>
              {flat.map((c) => (
                <tr key={c.id} className={tableCls.row}>
                  <td className={tableCls.td}>
                    <span style={{ paddingInlineStart: c.depth * 22 }} className="flex items-center gap-1.5 font-medium">
                      {c.depth > 0 && <span className="text-slate-300">└</span>}
                      {c.name}
                    </span>
                  </td>
                  <td className={tableCls.td}><code className="text-xs text-slate-400" dir="ltr">{c.slug}</code></td>
                  <td className={tableCls.td}><Pill status={(c as any).isActive === false ? 'archived' : 'active'} label={(c as any).isActive === false ? 'غیرفعال' : 'فعال'} /></td>
                  <td className={tableCls.td}>
                    <button onClick={() => setLinking(c)} className="flex items-center gap-1 text-xs text-sky-600 hover:underline">
                      <Link2 className="h-3.5 w-3.5" /> اتصال ویژگی
                    </button>
                  </td>
                  <td className={`${tableCls.td} text-left`}>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setForm({ id: c.id, name: c.name, slug: c.slug, parentId: (c as any).parentId || 0, description: (c as any).description || '', sortOrder: String((c as any).sortOrder ?? 0), isActive: (c as any).isActive !== false })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleting(c)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
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

      {/* فرم دسته */}
      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.id ? 'ویرایش دسته' : 'دسته جدید'}>
        {form && (
          <div className="space-y-4">
            <Field label="نام دسته" required>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="اسلاگ (اختیاری)">
                <Input dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} placeholder="خودکار" />
              </Field>
              <Field label="ترتیب نمایش">
                <Input inputMode="numeric" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value.replace(/[^0-9]/g, '') })} />
              </Field>
            </div>
            <Field label="دسته والد">
              <Select value={form.parentId || ''} onChange={(e) => setForm({ ...form, parentId: Number(e.target.value) || 0 })}>
                <option value="">— ریشه (بدون والد) —</option>
                {flat.filter((c) => c.id !== form.id).map((c) => (
                  <option key={c.id} value={c.id}>{'— '.repeat(c.depth)}{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="توضیح">
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Switch label="فعال (نمایش در فروشگاه)" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            <Button className="w-full" loading={save.isPending} disabled={!form.name.trim()} onClick={() => save.mutate(form)}>
              ذخیره دسته
            </Button>
          </div>
        )}
      </Dialog>

      {/* اتصال ویژگی‌ها به دسته */}
      {linking && <LinkAttributesDialog category={linking} onClose={() => setLinking(null)} />}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="حذف دسته"
        message={`«${deleting?.name}» حذف شود؟ (اگر محصول یا زیردسته داشته باشد خطا می‌گیرید)`}
      />
    </div>
  );
}

/** مدیریت ویژگی‌های متصل به دسته (سازنده تنوع / فیلتر) */
function LinkAttributesDialog({ category, onClose }: { category: CategoryNode; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: all } = useQuery({
    queryKey: ['admin-attributes'],
    queryFn: async () => (await api<Array<{ id: number; name: string; code: string }>>('/admin/attributes')).data,
  });
  const { data: linked, isLoading } = useQuery({
    queryKey: ['cat-attrs', category.id],
    queryFn: async () =>
      (await api<Array<{ id: number; isVariant?: boolean; isRequired?: boolean }>>(`/admin/categories/${category.id}/attributes`)).data,
  });

  const [items, setItems] = useState<Record<number, { isVariant: boolean; isRequired: boolean }> | null>(null);
  const state = items ?? Object.fromEntries(
    (linked || []).map((l) => [l.id, { isVariant: !!l.isVariant, isRequired: !!l.isRequired }]),
  );

  const save = useMutation({
    mutationFn: async () =>
      api(`/admin/categories/${category.id}/attributes`, {
        method: 'PUT',
        body: JSON.stringify({
          items: Object.entries(state).map(([attrId, v], idx) => ({
            attributeId: Number(attrId), isVariant: v.isVariant, isRequired: v.isRequired, sortOrder: idx,
          })),
        }),
      }),
    onSuccess: () => {
      toast.success('ویژگی‌های دسته به‌روزرسانی شد');
      qc.invalidateQueries({ queryKey: ['cat-attrs', category.id] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onClose={onClose} title={`ویژگی‌های «${category.name}»`}>
      {isLoading || !all ? (
        <PageLoading />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">ویژگی‌های انتخاب‌شده در فیلتر فروشگاه می‌آیند؛ «سازنده تنوع» یعنی از آن برای ساخت تنوع محصول (مثل رنگ/حافظه) استفاده می‌شود.</p>
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {all.map((a) => {
              const cur = state[a.id];
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                  <input
                    type="checkbox"
                    checked={!!cur}
                    onChange={(e) => {
                      const next = { ...state };
                      if (e.target.checked) next[a.id] = { isVariant: false, isRequired: false };
                      else delete next[a.id];
                      setItems(next);
                    }}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span className="flex-1 text-sm font-medium text-slate-700">{a.name} <code className="text-2xs text-slate-400" dir="ltr">({a.code})</code></span>
                  {cur && (
                    <>
                      <label className="flex items-center gap-1 text-2xs text-slate-500">
                        <input type="checkbox" checked={cur.isVariant} onChange={(e) => setItems({ ...state, [a.id]: { ...cur, isVariant: e.target.checked } })} className="accent-sky-500" />
                        سازنده تنوع
                      </label>
                      <label className="flex items-center gap-1 text-2xs text-slate-500">
                        <input type="checkbox" checked={cur.isRequired} onChange={(e) => setItems({ ...state, [a.id]: { ...cur, isRequired: e.target.checked } })} className="accent-emerald-500" />
                        اجباری
                      </label>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <Button className="w-full" loading={save.isPending} onClick={() => save.mutate()}>ذخیره اتصالات</Button>
        </div>
      )}
    </Dialog>
  );
}
