'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faDate, faNumber, toToman } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Select, Switch, Empty } from '@/components/ui';
import { Dialog, ConfirmDialog } from '@/components/dialog';
import { PageHeader, tableCls, Pill } from '../_shared';

interface Coupon {
  id: number; code: string; title: string | null; type: 'percent' | 'fixed'; value: number;
  maxDiscount: number | null; minCartAmount: number; usageLimit: number | null; perUserLimit: number;
  usedCount: number; startsAt: string | null; expiresAt: string | null; isActive: boolean;
  campaign?: string | null; productIds?: number[] | null; categoryIds?: number[] | null;
}

interface CouponForm {
  id?: number; code: string; title: string; type: 'percent' | 'fixed';
  valueToman: string; maxDiscountToman: string; minCartToman: string;
  usageLimit: string; perUserLimit: string; startsAt: string; expiresAt: string; isActive: boolean;
  campaign: string; productIds: number[]; categoryIds: number[];
}

const emptyForm: CouponForm = {
  code: '', title: '', type: 'percent', valueToman: '', maxDiscountToman: '', minCartToman: '0',
  usageLimit: '', perUserLimit: '1', startsAt: '', expiresAt: '', isActive: true,
  campaign: '', productIds: [], categoryIds: [],
};

const toForm = (c: Coupon): CouponForm => ({
  id: c.id, code: c.code, title: c.title || '', type: c.type,
  valueToman: c.type === 'fixed' ? String(Math.round(c.value / 10)) : String(c.value),
  maxDiscountToman: c.maxDiscount ? String(Math.round(c.maxDiscount / 10)) : '',
  minCartToman: c.minCartAmount ? String(Math.round(c.minCartAmount / 10)) : '0',
  usageLimit: c.usageLimit ? String(c.usageLimit) : '',
  perUserLimit: String(c.perUserLimit || 1),
  startsAt: c.startsAt ? c.startsAt.slice(0, 10) : '',
  expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
  isActive: c.isActive,
  campaign: c.campaign || '',
  productIds: c.productIds || [],
  categoryIds: c.categoryIds || [],
});

/** انتخابگر محصول (جستجو + چیپ) */
function ProductPicker({ value, onChange }: { value: number[]; onChange: (ids: number[]) => void }) {
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [selected, setSelected] = useState<Record<number, string>>({});

  useEffect(() => {
    const t = setTimeout(() => {
      if (!q.trim()) { setOptions([]); return; }
      api<any>(`/admin/products?q=${encodeURIComponent(q)}&limit=8`)
        .then((r) => {
          const list = Array.isArray(r.data) ? r.data : r.data?.items || [];
          setOptions(list.map((p: any) => ({ id: p.id, name: p.name })));
        })
        .catch(() => setOptions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // نام محصولات انتخاب‌شده را بیار (در حالت ویرایش)
  useEffect(() => {
    const missing = value.filter((id) => !selected[id]);
    if (!missing.length) return;
    api<any>(`/admin/products?ids=${missing.join(',')}&limit=50`)
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.items || [];
        const map: Record<number, string> = { ...selected };
        for (const p of list) map[p.id] = p.name;
        for (const id of missing) if (!map[id]) map[id] = `#${id}`;
        setSelected(map);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join(',')]);

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700">
              {selected[id] || `#${id}`}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} className="text-blue-400 hover:text-blue-800">✕</button>
            </span>
          ))}
        </div>
      )}
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی محصول برای افزودن…" />
      {options.length > 0 && (
        <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200">
          {options.filter((o) => !value.includes(o.id)).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange([...value, o.id]); setSelected((s) => ({ ...s, [o.id]: o.name })); setQ(''); setOptions([]); }}
              className="block w-full px-3 py-2 text-right text-xs hover:bg-slate-50"
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** چک‌باکس درخت دسته‌ها */
function CategoryPicker({ value, onChange }: { value: number[]; onChange: (ids: number[]) => void }) {
  const { data } = useQuery({
    queryKey: ['admin-categories-flat'],
    queryFn: async () => (await api<any>('/admin/categories')).data,
  });
  const flat: Array<{ id: number; name: string; depth?: number; children?: any[] }> = [];
  const walk = (nodes: any[], depth = 0) => {
    const list = Array.isArray(nodes) ? nodes : [];
    for (const n of list) {
      flat.push({ id: n.id, name: n.name, depth });
      if (n.children?.length) walk(n.children, depth + 1);
    }
  };
  walk(Array.isArray(data) ? data : (data as any)?.items || []);

  return (
    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-2">
      {flat.length === 0 && <p className="p-2 text-xs text-slate-400">دسته‌ای یافت نشد</p>}
      {flat.map((c) => (
        <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50" style={{ paddingRight: `${(c.depth || 0) * 14 + 8}px` }}>
          <input
            type="checkbox"
            checked={value.includes(c.id)}
            onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((x) => x !== c.id))}
            className="h-3.5 w-3.5 accent-slate-900"
          />
          {c.name}
        </label>
      ))}
    </div>
  );
}

export default function AdminCouponsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<CouponForm | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => (await api<Coupon[] | { items: Coupon[] }>('/admin/coupons')).data,
  });
  const items: Coupon[] = Array.isArray(data) ? data : (data as any)?.items || [];

  const save = useMutation({
    mutationFn: async (f: CouponForm) => {
      const payload = {
        code: f.code.trim().toUpperCase(), title: f.title || undefined, type: f.type,
        value: f.type === 'fixed' ? Number(f.valueToman || 0) * 10 : Number(f.valueToman || 0),
        maxDiscount: f.type === 'percent' && f.maxDiscountToman ? Number(f.maxDiscountToman) * 10 : null,
        minCartAmount: Number(f.minCartToman || 0) * 10,
        usageLimit: f.usageLimit ? Number(f.usageLimit) : null,
        perUserLimit: Number(f.perUserLimit || 1),
        campaign: f.campaign.trim() || null,
        productIds: f.productIds,
        categoryIds: f.categoryIds,
        startsAt: f.startsAt || null, expiresAt: f.expiresAt || null, isActive: f.isActive,
      };
      return f.id
        ? api(`/admin/coupons/${f.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : api('/admin/coupons', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success('کد تخفیف ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api(`/admin/coupons/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('کد تخفیف حذف شد');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="کدهای تخفیف" action={<Button size="sm" onClick={() => setForm({ ...emptyForm })}><Plus className="h-4 w-4" /> کد جدید</Button>} />

      {items.length === 0 ? (
        <Empty title="کد تخفیفی ساخته نشده" />
      ) : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={tableCls.th}>کد</th>
                <th className={tableCls.th}>مقدار</th>
                <th className={tableCls.th}>استفاده</th>
                <th className={tableCls.th}>انقضا</th>
                <th className={tableCls.th}>وضعیت</th>
                <th className={tableCls.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className={tableCls.row}>
                  <td className={tableCls.td}>
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs font-black" dir="ltr">{c.code}</code>
                    {c.title && <p className="mt-0.5 text-2xs text-slate-400">{c.title}</p>}
                    {c.campaign && <p className="mt-0.5 text-2xs font-bold text-fuchsia-600">کمپین: {c.campaign}</p>}
                    {(c.productIds?.length || c.categoryIds?.length) ? (
                      <p className="mt-0.5 text-2xs text-blue-600">
                        محدود به: {[c.productIds?.length ? `${faNumber(c.productIds.length)} محصول` : '', c.categoryIds?.length ? `${faNumber(c.categoryIds.length)} دسته` : ''].filter(Boolean).join(' + ')}
                      </p>
                    ) : null}
                  </td>
                  <td className={tableCls.td}>
                    {c.type === 'percent' ? `${faNumber(c.value)}٪` : `${toToman(c.value)} تومان`}
                    {c.type === 'percent' && c.maxDiscount ? <p className="text-2xs text-slate-400">سقف {toToman(c.maxDiscount)} تومان</p> : null}
                  </td>
                  <td className={tableCls.td}>{faNumber(c.usedCount)}{c.usageLimit ? ` / ${faNumber(c.usageLimit)}` : ''}</td>
                  <td className={tableCls.td}><span className="text-xs text-slate-400">{c.expiresAt ? faDate(c.expiresAt) : 'بدون انقضا'}</span></td>
                  <td className={tableCls.td}><Pill status={c.isActive ? 'active' : 'archived'} label={c.isActive ? 'فعال' : 'غیرفعال'} /></td>
                  <td className={`${tableCls.td} text-left`}>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setForm(toForm(c))} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleting(c)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.id ? 'ویرایش کد تخفیف' : 'کد تخفیف جدید'}>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="کد (انگلیسی)" required><Input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} placeholder="WELCOME10" /></Field>
              <Field label="عنوان"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="نوع تخفیف">
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })}>
                  <option value="percent">درصدی (٪)</option>
                  <option value="fixed">مبلغ ثابت (تومان)</option>
                </Select>
              </Field>
              <Field label={form.type === 'percent' ? 'درصد' : 'مبلغ (تومان)'} required>
                <Input inputMode="numeric" value={form.valueToman} onChange={(e) => setForm({ ...form, valueToman: e.target.value.replace(/[^0-9]/g, '') })} />
              </Field>
              {form.type === 'percent' && (
                <Field label="سقف تخفیف (تومان)"><Input inputMode="numeric" value={form.maxDiscountToman} onChange={(e) => setForm({ ...form, maxDiscountToman: e.target.value.replace(/[^0-9]/g, '') })} /></Field>
              )}
              <Field label="حداقل سبد (تومان)"><Input inputMode="numeric" value={form.minCartToman} onChange={(e) => setForm({ ...form, minCartToman: e.target.value.replace(/[^0-9]/g, '') })} /></Field>
              <Field label="حداکثر استفاده کل"><Input inputMode="numeric" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value.replace(/[^0-9]/g, '') })} placeholder="نامحدود" /></Field>
              <Field label="حد استفاده هر کاربر"><Input inputMode="numeric" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value.replace(/[^0-9]/g, '') })} /></Field>
              <Field label="شروع"><Input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
              <Field label="انقضا"><Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></Field>
              <Field label="نام کمپین (اختیاری)" hint="کوپن‌های هم‌کمپین گروه‌بندی می‌شوند">
                <Input value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="مثلا: جشنواره تابستانه" />
              </Field>
            </div>
            <Field label="فقط روی محصول‌های خاص (اختیاری)" hint="خالی = همه محصول‌ها">
              <ProductPicker value={form.productIds} onChange={(ids) => setForm({ ...form, productIds: ids })} />
            </Field>
            <Field label="فقط روی دسته‌های خاص (اختیاری)" hint="خالی = همه دسته‌ها">
              <CategoryPicker value={form.categoryIds} onChange={(ids) => setForm({ ...form, categoryIds: ids })} />
            </Field>
            <Switch label="فعال" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            <Button className="w-full" loading={save.isPending} disabled={!form.code || !form.valueToman} onClick={() => save.mutate(form)}>
              ذخیره کد تخفیف
            </Button>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending}
        title="حذف کد تخفیف" message={`کد «${deleting?.code}» حذف شود؟`}
      />
    </div>
  );
}
