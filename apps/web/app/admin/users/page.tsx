'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Copy, KeyRound, Pencil, Plus, Search, ShieldCheck, UserPlus } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faNumber } from '@/lib/format';
import { hasPermission, toast, useAuthStore } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Select, Empty } from '@/components/ui';
import { Dialog } from '@/components/dialog';
import { Pagination } from '@/components/display';
import { PageHeader, tableCls, Pill, labelOf } from '../_shared';

interface UserRow {
  id: number; fullName: string; phone: string; email: string | null;
  status: string; roleNames?: string; roleIds?: string; createdAt: string;
}

interface RoleLite { id: number; name: string; title: string }

const ROLE_TITLES: Record<string, string> = {
  super_admin: 'مدیر ارشد', product_manager: 'مدیر محصول', order_manager: 'مدیر سفارش',
  support: 'پشتیبانی', content_manager: 'مدیر محتوا', warehouse: 'انباردار', customer: 'مشتری',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const canCreate = hasPermission(me, 'users.create');
  const canAssign = hasPermission(me, 'users.assign_role');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: async () => api<UserRow[] | { items: UserRow[] }>(`/admin/users${qs({ page, limit: 20, q: search || undefined })}`),
  });

  const raw: any = data?.data;
  const items: UserRow[] = Array.isArray(raw) ? raw : raw?.items || [];

  return (
    <div>
      <PageHeader
        title="کاربران"
        action={canCreate ? <Button size="sm" onClick={() => setCreating(true)}><UserPlus className="h-4 w-4" /> کاربر جدید</Button> : undefined}
      />

      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }} className="relative mb-4 max-w-md">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام، موبایل یا ایمیل…" className="ps-9" />
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </form>

      {isLoading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <Empty title="کاربری یافت نشد" />
      ) : (
        <>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>کاربر</th>
                  <th className={tableCls.th}>تماس</th>
                  <th className={tableCls.th}>نقش‌ها</th>
                  <th className={tableCls.th}>وضعیت</th>
                  <th className={tableCls.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className={tableCls.row}>
                    <td className={tableCls.td}><span className="font-medium">{u.fullName}</span></td>
                    <td className={tableCls.td}>
                      <p className="text-xs" dir="ltr">{u.phone}</p>
                      {u.email && <p className="text-2xs text-slate-400" dir="ltr">{u.email}</p>}
                    </td>
                    <td className={tableCls.td}>
                      <div className="flex flex-wrap gap-1">
                        {(u.roleNames || '').split(',').filter(Boolean).map((r) => (
                          <Pill key={r} status={r === 'super_admin' ? 'rejected' : 'draft'} label={ROLE_TITLES[r] || r} />
                        ))}
                      </div>
                    </td>
                    <td className={tableCls.td}><Pill status={u.status} label={labelOf({ active: 'فعال', pending: 'در انتظار', suspended: 'معلق' }, u.status)} /></td>
                    <td className={`${tableCls.td} text-left`}>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(u)}>
                        <Pencil className="h-3.5 w-3.5" /> مدیریت
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={data?.meta?.total || 0} onPage={setPage} />
        </>
      )}

      {creating && <CreateUserDialog onClose={() => setCreating(false)} />}
      {editing && <EditUserDialog user={editing} canAssign={canAssign} onClose={() => setEditing(null)} />}
    </div>
  );
}

/* ---------------------------------------------------------------- ساخت کاربر */
function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '', roleIds: [] as number[] });
  const [created, setCreated] = useState<{ id: number; temporaryPassword?: string } | null>(null);

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => (await api<any[]>('/admin/roles')).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      api<{ id: number; temporaryPassword?: string }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          fullName: form.fullName, phone: form.phone,
          email: form.email || undefined,
          password: form.password || undefined,
          roleIds: form.roleIds,
        }),
      }),
    onSuccess: (res) => {
      setCreated(res.data);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onClose={onClose} title="ایجاد کاربر جدید">
      {created ? (
        <div className="space-y-4 text-center">
          <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">کاربر با موفقیت ساخته شد ✅</p>
          {created.temporaryPassword && (
            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4">
              <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700"><KeyRound className="h-4 w-4" /> رمز موقت — فقط همین یک بار نمایش داده می‌شود!</p>
              <p className="flex items-center justify-center gap-2 font-mono text-lg font-black text-slate-900" dir="ltr">
                {created.temporaryPassword}
                <button
                  onClick={() => { navigator.clipboard.writeText(created.temporaryPassword!); toast.success('کپی شد'); }}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </p>
              <p className="mt-2 text-2xs text-amber-600">کاربر در اولین ورود موظف به تغییر رمز است.</p>
            </div>
          )}
          <Button className="w-full" onClick={onClose}>بستن</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="نام و نام خانوادگی" required><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="موبایل" required><Input dir="ltr" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '') })} placeholder="09…" /></Field>
            <Field label="ایمیل (اختیاری)"><Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <Field label="رمز عبور (خالی = تولید رمز موقت خودکار)">
            <Input dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="حداقل ۸ کاراکتر" />
          </Field>
          <Field label="نقش‌ها">
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 p-3">
              {(roles || []).map((r) => (
                <label key={r.id} className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${form.roleIds.includes(r.id) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <input
                    type="checkbox" className="hidden"
                    checked={form.roleIds.includes(r.id)}
                    onChange={(e) => setForm({ ...form, roleIds: e.target.checked ? [...form.roleIds, r.id] : form.roleIds.filter((x) => x !== r.id) })}
                  />
                  {r.title}
                </label>
              ))}
            </div>
          </Field>
          <Button className="w-full" loading={create.isPending} disabled={!form.fullName.trim() || form.phone.length !== 11} onClick={() => create.mutate()}>
            ایجاد کاربر
          </Button>
        </div>
      )}
    </Dialog>
  );
}

/* ------------------------------------------------------------- مدیریت کاربر */
function EditUserDialog({ user: u, canAssign, onClose }: { user: UserRow; canAssign: boolean; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: detail } = useQuery({
    queryKey: ['admin-user', u.id],
    queryFn: async () => (await api<any>(`/admin/users/${u.id}`)).data,
  });
  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => (await api<any[]>('/admin/roles')).data,
  });
  const { data: perms } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => (await api<{ permissions: Array<{ key: string; title: string; group: string }> }>('/admin/permissions')).data,
  });

  const currentRoleIds: number[] = detail?.roles
    ? detail.roles.map((r: any) => r.id)
    : (u.roleIds || '').split(',').filter(Boolean).map(Number);

  const [roleIds, setRoleIds] = useState<number[] | null>(null);
  const [overrides, setOverrides] = useState<Record<string, 'allow' | 'deny'> | null>(null);
  const [status, setStatus] = useState(u.status);
  const [newPassword, setNewPassword] = useState('');

  const selRoles = roleIds ?? currentRoleIds;
  const selOverrides = overrides ?? Object.fromEntries(
    (detail?.permissionOverrides || detail?.overrides || []).map((o: any) => [o.permission || o.name, o.type]),
  );

  const save = useMutation({
    mutationFn: async () => {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ status, newPassword: newPassword || undefined }) });
      if (canAssign) {
        await api(`/admin/users/${u.id}/roles`, { method: 'PUT', body: JSON.stringify({ roleIds: selRoles }) });
        await api(`/admin/users/${u.id}/permissions`, {
          method: 'PUT',
          body: JSON.stringify({ items: Object.entries(selOverrides).map(([permission, type]) => ({ permission, type })) }),
        });
      }
    },
    onSuccess: () => {
      toast.success('کاربر به‌روزرسانی شد');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-user', u.id] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // گروه‌بندی مجوزها برای نمایش تمیز
  const groups = new Map<string, Array<{ key: string; title: string }>>();
  (perms?.permissions || []).forEach((p) => {
    if (!groups.has(p.group)) groups.set(p.group, []);
    groups.get(p.group)!.push(p);
  });

  return (
    <Dialog open onClose={onClose} title={`مدیریت «${u.fullName}»`} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="وضعیت حساب">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">فعال</option>
              <option value="pending">در انتظار</option>
              <option value="suspended">معلق</option>
            </Select>
          </Field>
          <Field label="بازنشانی رمز (اختیاری)">
            <Input dir="ltr" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="رمز جدید…" />
          </Field>
        </div>

        {canAssign && (
          <>
          <Field label="نقش‌ها">
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 p-3">
              {(roles || []).map((r) => (
                <label key={r.id} className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${selRoles.includes(r.id) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <input
                    type="checkbox" className="hidden"
                    checked={selRoles.includes(r.id)}
                    onChange={(e) => setRoleIds(e.target.checked ? [...selRoles, r.id] : selRoles.filter((x) => x !== r.id))}
                  />
                  {r.title}
                </label>
              ))}
            </div>
          </Field>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-700"><ShieldCheck className="h-4 w-4" /> override دسترسی برای همین کاربر</p>
            <p className="mb-3 text-2xs text-slate-400">پیش‌فرض = بر اساس نقش‌ها · «اجازه» دسترسی اضافه می‌کند · «ممنوع» حتی با داشتن نقش هم دسترسی را می‌گیرد.</p>
            <div className="max-h-64 space-y-3 overflow-y-auto pe-1">
              {[...groups.entries()].map(([g, list]) => (
                <div key={g}>
                  <p className="mb-1.5 text-2xs font-bold text-slate-400">{g}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {list.map((p) => {
                      const cur = selOverrides[p.key];
                      return (
                        <div key={p.key} className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-1.5">
                          <span className="text-2xs text-slate-600">{p.title}</span>
                          <Select
                            value={cur || ''}
                            onChange={(e) => {
                              const v = e.target.value as '' | 'allow' | 'deny';
                              const next = { ...selOverrides };
                              if (v) next[p.key] = v; else delete next[p.key];
                              setOverrides(next);
                            }}
                            className={`w-24 py-1 text-2xs ${cur === 'allow' ? 'border-emerald-300 text-emerald-700' : cur === 'deny' ? 'border-rose-300 text-rose-600' : ''}`}
                          >
                            <option value="">پیش‌فرض</option>
                            <option value="allow">اجازه ✅</option>
                            <option value="deny">ممنوع ⛔</option>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
        )}

        <Button className="w-full" loading={save.isPending} onClick={() => save.mutate()}>ذخیره تغییرات</Button>
      </div>
    </Dialog>
  );
}
