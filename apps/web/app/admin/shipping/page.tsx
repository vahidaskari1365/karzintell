'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/auth-store';
import { Button, Card, Field, Input, PageLoading, Select } from '@/components/ui';
import { ConfirmDialog, Dialog } from '@/components/dialog';
import { PageHeader, tableCls } from '../_shared';
import { tomanToRial, rialToToman } from '@/lib/format';

type Method = {
  id: number; zoneId: number; name: string; type: 'post' | 'tipax' | 'courier' | 'custom';
  cost: number; freeAbove: number | null; eta: string | null; isActive: boolean; sortOrder: number;
};
type Zone = {
  id: number; name: string; provinces: string[] | null; cities: string[] | null;
  isActive: boolean; sortOrder: number; methods: Method[];
};

const TYPE_LABELS: Record<string, string> = { post: 'پست', tipax: 'تیپاکس', courier: 'پیک', custom: 'سفارشی' };

function ZoneDialog({ zone, onClose }: { zone: Partial<Zone> | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: zone?.name || '',
    provinces: (zone?.provinces || []).join(', '),
    cities: (zone?.cities || []).join(', '),
    sortOrder: zone?.sortOrder ?? 0,
    isActive: zone?.isActive !== false,
  });
  const save = useMutation({
    mutationFn: async () =>
      api(zone?.id ? `/admin/shipping/zones/${zone.id}` : '/admin/shipping/zones', {
        method: zone?.id ? 'PATCH' : 'POST',
        body: {
          name: form.name,
          provinces: form.provinces.trim() ? form.provinces.split(/[,،]/).map((s) => s.trim()).filter(Boolean) : null,
          cities: form.cities.trim() ? form.cities.split(/[,،]/).map((s) => s.trim()).filter(Boolean) : null,
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive,
        },
      }),
    onSuccess: () => {
      toast.success(zone?.id ? 'منطقه به‌روز شد' : 'منطقه ساخته شد');
      qc.invalidateQueries({ queryKey: ['admin-shipping-zones'] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onClose={onClose} title={zone?.id ? 'ویرایش منطقه' : 'منطقه جدید'}
      footer={<Button onClick={() => save.mutate()} loading={save.isPending} disabled={!form.name.trim()}>ذخیره</Button>}>
      <div className="space-y-4">
        <Field label="نام منطقه" required>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: سراسر کشور / تهران / شهرستان‌های مرکزی" />
        </Field>
        <Field label="استان‌ها" hint="خالی = همه استان‌ها (منطقه پیش‌فرض). با ویرگول جدا کنید.">
          <Input value={form.provinces} onChange={(e) => setForm((f) => ({ ...f, provinces: e.target.value }))} placeholder="تهران, البرز" />
        </Field>
        <Field label="شهرها (اختیاری)" hint="استان‌ها محدودکننده‌ترند؛ شهرهای خاص را اینجا بنویسید.">
          <Input value={form.cities} onChange={(e) => setForm((f) => ({ ...f, cities: e.target.value }))} placeholder="تهران, کرج" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اولویت تطبیق" hint="عدد کوچک‌تر = مهم‌تر">
            <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
          </Field>
          <Field label="وضعیت">
            <Select value={form.isActive ? '1' : '0'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === '1' }))}>
              <option value="1">فعال</option>
              <option value="0">غیرفعال</option>
            </Select>
          </Field>
        </div>
      </div>
    </Dialog>
  );
}

function MethodDialog({ zoneId, method, onClose }: { zoneId: number; method: Partial<Method> | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: method?.name || '',
    type: (method?.type || 'post') as Method['type'],
    cost: String(rialToToman(method?.cost ?? 0)),
    freeAbove: method?.freeAbove != null ? String(rialToToman(method.freeAbove)) : '',
    eta: method?.eta || '',
    sortOrder: method?.sortOrder ?? 0,
    isActive: method?.isActive !== false,
  });
  const save = useMutation({
    mutationFn: async () =>
      api(method?.id ? `/admin/shipping/methods/${method.id}` : '/admin/shipping/methods', {
        method: method?.id ? 'PATCH' : 'POST',
        body: {
          zoneId,
          name: form.name,
          type: form.type,
          cost: tomanToRial(form.cost),
          freeAbove: form.freeAbove !== '' ? tomanToRial(form.freeAbove) : null,
          eta: form.eta || null,
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive,
        },
      }),
    onSuccess: () => {
      toast.success('روش ارسال ذخیره شد');
      qc.invalidateQueries({ queryKey: ['admin-shipping-zones'] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onClose={onClose} title={method?.id ? 'ویرایش روش ارسال' : 'روش ارسال جدید'}
      footer={<Button onClick={() => save.mutate()} loading={save.isPending} disabled={!form.name.trim()}>ذخیره</Button>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="نام" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="پست پیشتاز" /></Field>
          <Field label="شیوه">
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Method['type'] }))}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="هزینه ارسال (تومان)" required>
            <Input type="number" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} dir="ltr" />
          </Field>
          <Field label="رایگان برای سبد بالای (تومان)" hint="خالی = بدون ارسال رایگان">
            <Input type="number" value={form.freeAbove} onChange={(e) => setForm((f) => ({ ...f, freeAbove: e.target.value }))} dir="ltr" placeholder="مثلا 2,000,000" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="زمان تحویل"><Input value={form.eta} onChange={(e) => setForm((f) => ({ ...f, eta: e.target.value }))} placeholder="۲ تا ۵ روز کاری" /></Field>
          <Field label="ترتیب نمایش"><Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} /></Field>
        </div>
        <Field label="وضعیت">
          <Select value={form.isActive ? '1' : '0'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === '1' }))}>
            <option value="1">فعال</option>
            <option value="0">غیرفعال</option>
          </Select>
        </Field>
      </div>
    </Dialog>
  );
}

export default function AdminShippingPage() {
  const qc = useQueryClient();
  const { data: zones, isLoading } = useQuery({
    queryKey: ['admin-shipping-zones'],
    queryFn: async () => (await api<Zone[]>('/admin/shipping/zones')).data,
  });
  const [zoneDialog, setZoneDialog] = useState<Partial<Zone> | null>(null);
  const [methodDialog, setMethodDialog] = useState<{ zoneId: number; method: Partial<Method> | null } | null>(null);
  const [removeZone, setRemoveZone] = useState<Zone | null>(null);
  const [removeMethod, setRemoveMethod] = useState<Method | null>(null);

  const delZone = useMutation({
    mutationFn: async (id: number) => api(`/admin/shipping/zones/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('منطقه حذف شد'); qc.invalidateQueries({ queryKey: ['admin-shipping-zones'] }); setRemoveZone(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMethod = useMutation({
    mutationFn: async (id: number) => api(`/admin/shipping/methods/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('روش ارسال حذف شد'); qc.invalidateQueries({ queryKey: ['admin-shipping-zones'] }); setRemoveMethod(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="حمل‌ونقل"
        subtitle="تعریف مناطق ارسال و روش‌های تحویل (پست، تیپاکس، پیک) با محاسبه خودکار هزینه"
        action={<Button onClick={() => setZoneDialog({})}><Plus className="h-4 w-4" /> منطقه جدید</Button>}
      />

      <div className="space-y-5">
        {(zones || []).length === 0 && (
          <Card className="p-8 text-center text-sm text-slate-400">
            <Truck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            هنوز منطقه ارسالی تعریف نشده است. اولین منطقه را بسازید (مثلاً «سراسر کشور» با استان خالی).
          </Card>
        )}
        {(zones || []).map((z) => (
          <Card key={z.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <h2 className="font-black text-slate-900">{z.name}</h2>
                {!z.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">غیرفعال</span>}
                <span className="text-xs text-slate-400">
                  {z.provinces?.length ? z.provinces.join('، ') : 'همه استان‌ها (پیش‌فرض)'}
                  {z.cities?.length ? ` — شهرها: ${z.cities.join('، ')}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setMethodDialog({ zoneId: z.id, method: null })}>
                  <Plus className="h-4 w-4" /> روش ارسال
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setZoneDialog(z)}><Pencil className="h-4 w-4" /> ویرایش</Button>
                <Button size="sm" variant="ghost" onClick={() => setRemoveZone(z)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
              </div>
            </div>
            {z.methods.length === 0 && <p className="text-xs text-slate-400">هنوز روشی برای این منطقه تعریف نشده است.</p>}
            {z.methods.length > 0 && (
              <div className={tableCls.wrap}>
                <table className={tableCls.table}>
                  <thead className={tableCls.thead}>
                    <tr>
                      <th className={tableCls.th}>نام</th>
                      <th className={tableCls.th}>شیوه</th>
                      <th className={tableCls.th}>هزینه</th>
                      <th className={tableCls.th}>رایگان بالای</th>
                      <th className={tableCls.th}>زمان تحویل</th>
                      <th className={tableCls.th}>وضعیت</th>
                      <th className={tableCls.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {z.methods.map((m) => (
                      <tr key={m.id} className={tableCls.row}>
                        <td className={`${tableCls.td} font-bold`}>{m.name}</td>
                        <td className={tableCls.td}>{TYPE_LABELS[m.type] || m.type}</td>
                        <td className={tableCls.td}>{m.cost ? rialToToman(m.cost) : <span className="font-bold text-emerald-600">رایگان</span>}</td>
                        <td className={tableCls.td}>{m.freeAbove != null ? rialToToman(m.freeAbove) : '—'}</td>
                        <td className={tableCls.td}>{m.eta || '—'}</td>
                        <td className={tableCls.td}>
                          {m.isActive
                            ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">فعال</span>
                            : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">غیرفعال</span>}
                        </td>
                        <td className={tableCls.td}>
                          <div className="flex gap-1">
                            <button onClick={() => setMethodDialog({ zoneId: z.id, method: m })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setRemoveMethod(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}
      </div>

      {zoneDialog && <ZoneDialog zone={zoneDialog} onClose={() => setZoneDialog(null)} />}
      {methodDialog && <MethodDialog zoneId={methodDialog.zoneId} method={methodDialog.method} onClose={() => setMethodDialog(null)} />}
      <ConfirmDialog open={!!removeZone} onClose={() => setRemoveZone(null)} onConfirm={() => removeZone && delZone.mutate(removeZone.id)}
        title="حذف منطقه" message={`منطقه «${removeZone?.name}» و همه روش‌های ارسالش حذف می‌شود. مطمئنید؟`} danger loading={delZone.isPending} />
      <ConfirmDialog open={!!removeMethod} onClose={() => setRemoveMethod(null)} onConfirm={() => removeMethod && delMethod.mutate(removeMethod.id)}
        title="حذف روش ارسال" message={`روش «${removeMethod?.name}» حذف می‌شود. مطمئنید؟`} danger loading={delMethod.isPending} />
    </div>
  );
}
