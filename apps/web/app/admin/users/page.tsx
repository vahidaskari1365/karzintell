'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Copy, KeyRound, Pencil, Plus, Search, ShieldCheck, UserPlus, Trash2,
  Mail, MessageSquare, CheckCircle, XCircle, Eye, X,
} from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faNumber } from '@/lib/format';
import { hasPermission, toast, useAuthStore } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Select } from '@/components/ui';
import { Dialog } from '@/components/dialog';
import { Pagination } from '@/components/display';
import { PageHeader, Pill, labelOf } from '../_shared';

interface UserRow {
  id: number; fullName: string; phone: string; email: string | null;
  status: string; roleNames?: string; roleIds?: string; createdAt: string;
}

interface RoleLite { id: number; name: string; title: string }

const ROLE_TITLES: Record<string, string> = {
  super_admin: 'مدیر ارشد', product_manager: 'مدیر محصول', order_manager: 'مدیر سفارش',
  support: 'پشتیبانی', content_manager: 'مدیر محتوا', warehouse: 'انباردار', customer: 'مشتری',
};

const STATUS_TONES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  suspended: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'فعال', pending: 'در انتظار تأیید', suspended: 'معلق',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const canCreate = hasPermission(me, 'users.create');
  const canDelete = hasPermission(me, 'users.delete');
  const canUpdate = hasPermission(me, 'users.update');
  const canAssign = hasPermission(me, 'users.assign_role');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [detail, setDetail] = useState<UserRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: async () => api<UserRow[] | { items: UserRow[] }>(`/admin/users${qs({ page, limit: 20, q: search || undefined })}`),
  });

  const raw: any = data?.data;
  const items: UserRow[] = Array.isArray(raw) ? raw : raw?.items || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api(`/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('کاربر حذف شد');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirmDelete(null);
    },
    onError: (e: any) => toast.error(e?.message || 'خطا در حذف کاربر'),
  });

  return (
    <div className="text-slate-800 dark:text-slate-200">
      <PageHeader
        title="کاربران"
        action={canCreate ? <Button size="sm" onClick={() => setCreating(true)}><UserPlus className="h-4 w-4" /> کاربر جدید</Button> : undefined}
      />

      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q); }} className="relative mb-4 max-w-md">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام، موبایل یا ایمیل…" className="ps-9 bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-600 dark:text-slate-300" />
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-300" />
      </form>

      {isLoading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-12 text-center text-slate-600 dark:text-slate-300">
          کاربری یافت نشد
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-100 dark:bg-slate-900/80 text-xs text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-start font-bold">کاربر</th>
                  <th className="px-4 py-3 text-start font-bold">تماس</th>
                  <th className="px-4 py-3 text-start font-bold">نقش‌ها</th>
                  <th className="px-4 py-3 text-start font-bold">وضعیت</th>
                  <th className="px-4 py-3 text-start font-bold">تاریخ ثبت‌نام</th>
                  <th className="px-4 py-3 text-start font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-slate-200 dark:border-slate-800 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/40 cursor-pointer"
                    onClick={() => setDetail(u)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{u.fullName}</div>
                          <div className="text-2xs text-slate-600 dark:text-slate-300">شناسه: {faNumber(String(u.id))}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-700 dark:text-slate-300" dir="ltr">{faNumber(u.phone)}</p>
                      {u.email && <p className="text-2xs text-slate-600 dark:text-slate-300" dir="ltr">{u.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(u.roleNames || '').split(',').filter(Boolean).map((r) => (
                          <span key={r} className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                            r === 'super_admin' ? 'bg-rose-500/20 text-rose-300' :
                            r === 'customer' ? 'bg-slate-500/20 text-slate-700 dark:text-slate-300' :
                            'bg-indigo-500/20 text-indigo-300'
                          }`}>
                            {ROLE_TITLES[r] || r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-1 text-2xs font-bold ${STATUS_TONES[u.status] || 'bg-slate-500/20 text-slate-700 dark:text-slate-300'}`}>
                        {STATUS_LABELS[u.status] || u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {new Date(u.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setDetail(u)}
                          className="rounded-lg p-1.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-700 hover:text-slate-800 dark:text-slate-200"
                          title="مشاهده و ارسال پیام"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canUpdate && (
                          <button
                            onClick={() => setEditing(u)}
                            className="rounded-lg p-1.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-700 hover:text-blue-300"
                            title="ویرایش"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setConfirmDelete(u)}
                            className="rounded-lg p-1.5 text-slate-600 dark:text-slate-300 transition hover:bg-rose-900/40 hover:text-rose-300"
                            title="حذف کاربر"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
      {detail && <UserDetailDrawer user={detail} onClose={() => setDetail(null)} />}
      {confirmDelete && (
        <Dialog open onClose={() => setConfirmDelete(null)} title="حذف کاربر" size="sm">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-900/40">
              <Trash2 className="h-6 w-6 text-rose-400" />
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              آیا از حذف <span className="font-bold text-rose-300">{confirmDelete.fullName}</span> مطمئن هستید؟
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              این عملیات قابل بازگشت نیست. همه داده‌های کاربر (سفارش‌ها، آدرس‌ها، کیف پول و ...) آرشیو می‌شوند.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" className="flex-1" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(confirmDelete.id)}>
                بله، حذف کن
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>انصراف</Button>
            </div>
          </div>
        </Dialog>
      )}
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
          <p className="rounded-xl bg-emerald-900/40 p-4 text-sm text-emerald-300">کاربر با موفقیت ساخته شد ✅</p>
          {created.temporaryPassword && (
            <div className="rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-900/20 p-4">
              <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300"><KeyRound className="h-4 w-4" /> رمز موقت — فقط همین یک بار نمایش داده می‌شود!</p>
              <p className="flex items-center justify-center gap-2 font-mono text-lg font-black text-slate-900 dark:text-slate-100" dir="ltr">
                {created.temporaryPassword}
                <button
                  onClick={() => { navigator.clipboard.writeText(created.temporaryPassword!); toast.success('کپی شد'); }}
                  className="rounded-lg p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-700"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </p>
              <p className="mt-2 text-2xs text-amber-500/80">کاربر در اولین ورود موظف به تغییر رمز است.</p>
            </div>
          )}
          <Button className="w-full" onClick={onClose}>بستن</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="نام و نام خانوادگی" required><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="موبایل" required><Input dir="ltr" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '') })} placeholder="09…" className="bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" /></Field>
            <Field label="ایمیل (اختیاری)"><Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" /></Field>
          </div>
          <Field label="رمز عبور (خالی = تولید رمز موقت خودکار)">
            <Input dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="حداقل ۸ کاراکتر" className="bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
          </Field>
          <Field label="نقش‌ها">
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-3">
              {(roles || []).map((r) => (
                <label key={r.id} className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${form.roleIds.includes(r.id) ? 'bg-slate-200 text-slate-900 dark:text-slate-100' : 'bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-600'}`}>
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
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              <option value="active">فعال</option>
              <option value="pending">در انتظار</option>
              <option value="suspended">معلق</option>
            </Select>
          </Field>
          <Field label="بازنشانی رمز (اختیاری)">
            <Input dir="ltr" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="رمز جدید…" className="bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" />
          </Field>
        </div>

        {canAssign && (
          <>
          <Field label="نقش‌ها">
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-3">
              {(roles || []).map((r) => (
                <label key={r.id} className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${selRoles.includes(r.id) ? 'bg-slate-200 text-slate-900 dark:text-slate-100' : 'bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-600'}`}>
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
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-200"><ShieldCheck className="h-4 w-4" /> override دسترسی برای همین کاربر</p>
            <p className="mb-3 text-2xs text-slate-600 dark:text-slate-300">پیش‌فرض = بر اساس نقش‌ها · «اجازه» دسترسی اضافه می‌کند · «ممنوع» حتی با داشتن نقش هم دسترسی را می‌گیرد.</p>
            <div className="max-h-64 space-y-3 overflow-y-auto pe-1">
              {[...groups.entries()].map(([g, list]) => (
                <div key={g}>
                  <p className="mb-1.5 text-2xs font-bold text-slate-600 dark:text-slate-300">{g}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {list.map((p) => {
                      const cur = selOverrides[p.key];
                      return (
                        <div key={p.key} className="flex items-center justify-between rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-2.5 py-1.5">
                          <span className="text-2xs text-slate-700 dark:text-slate-300">{p.title}</span>
                          <Select
                            value={cur || ''}
                            onChange={(e) => {
                              const v = e.target.value as '' | 'allow' | 'deny';
                              const next = { ...selOverrides };
                              if (v) next[p.key] = v; else delete next[p.key];
                              setOverrides(next);
                            }}
                            className={`w-24 py-1 text-2xs bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 ${cur === 'allow' ? 'border-emerald-500 text-emerald-300' : cur === 'deny' ? 'border-rose-500 text-rose-300' : ''}`}
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

/* ----------------------------------------------- جزئیات کاربر + ارسال پیام */
function UserDetailDrawer({ user: u, onClose }: { user: UserRow; onClose: () => void }) {
  const [showMessage, setShowMessage] = useState(false);
  const [msg, setMsg] = useState({ title: '', body: '' });

  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin-user', u.id],
    queryFn: async () => (await api<any>(`/admin/users/${u.id}`)).data,
  });

  const sendMsg = useMutation({
    mutationFn: async () =>
      api(`/admin/users/${u.id}/message`, {
        method: 'POST',
        body: JSON.stringify({ title: msg.title, body: msg.body || undefined }),
      }),
    onSuccess: () => {
      toast.success('پیام ارسال شد ✅ کاربر پیام را در بخش اعلان‌های خود می‌بیند');
      setMsg({ title: '', body: '' });
      setShowMessage(false);
    },
    onError: (e: any) => toast.error(e?.message || 'خطا در ارسال پیام'),
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* drawer */}
      <aside className="w-full max-w-md overflow-y-auto bg-[#121518] border-slate-200 dark:border-slate-800 shadow-2xl" dir="rtl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-[#121518]/95 px-5 py-4 backdrop-blur">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <Eye className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            جزئیات کاربر
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-800 hover:text-slate-800 dark:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 p-5">
          {/* Avatar + name */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/40 to-emerald-500/40 text-2xl font-black text-slate-900 dark:text-slate-100">
              {u.fullName.charAt(0)}
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{u.fullName}</h4>
            <span className={`mt-1.5 inline-block rounded-full border px-2.5 py-1 text-2xs font-bold ${STATUS_TONES[u.status] || 'bg-slate-500/20 text-slate-700 dark:text-slate-300'}`}>
              {STATUS_LABELS[u.status] || u.status}
            </span>
          </div>

          {/* Contact info */}
          <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300">موبایل</span>
              <span className="text-sm text-slate-800 dark:text-slate-200" dir="ltr">{faNumber(u.phone)}</span>
            </div>
            {u.email && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300">ایمیل</span>
                <span className="text-sm text-slate-800 dark:text-slate-200" dir="ltr">{u.email}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300">شناسه</span>
              <span className="text-sm text-slate-800 dark:text-slate-200">#{faNumber(String(u.id))}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300">تاریخ ثبت‌نام</span>
              <span className="text-sm text-slate-800 dark:text-slate-200">{new Date(u.createdAt).toLocaleDateString('fa-IR')}</span>
            </div>
          </div>

          {/* Roles */}
          {(u.roleNames || detail?.roles) && (
            <div>
              <p className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300">نقش‌ها</p>
              <div className="flex flex-wrap gap-1.5">
                {(u.roleNames || detail?.roles?.map((r: any) => r.name).join(',') || '').split(',').filter(Boolean).map((r: string) => (
                  <span key={r} className={`rounded-full px-2.5 py-1 text-2xs font-bold ${
                    r === 'super_admin' ? 'bg-rose-500/20 text-rose-300' :
                    r === 'customer' ? 'bg-slate-500/20 text-slate-700 dark:text-slate-300' :
                    'bg-indigo-500/20 text-indigo-300'
                  }`}>
                    {ROLE_TITLES[r] || r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Loading more details */}
          {isLoading && (
            <div className="py-4 text-center text-xs text-slate-600 dark:text-slate-300">در حال بارگذاری...</div>
          )}

          {/* Order stats (if detail loaded) */}
          {detail && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-3 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-300">سفارش‌ها</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{faNumber(String(detail.orderCount || 0))}</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-3 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-300">موجودی کیف پول</p>
                <p className="mt-1 text-lg font-bold text-emerald-300">{faNumber(String(detail.walletBalance || 0))}</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-3 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-300">آخرین ورود</p>
                <p className="mt-1 text-xs text-slate-800 dark:text-slate-200">
                  {detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleDateString('fa-IR') : '—'}
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <Button
              className="w-full"
              variant={showMessage ? 'secondary' : 'primary'}
              onClick={() => setShowMessage(!showMessage)}
            >
              <MessageSquare className="h-4 w-4" />
              {showMessage ? 'بستن فرم پیام' : 'ارسال پیام به کاربر'}
            </Button>

            {showMessage && (
              <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                <Field label="عنوان پیام" required>
                  <Input
                    value={msg.title}
                    onChange={(e) => setMsg({ ...msg, title: e.target.value })}
                    placeholder="مثلاً: سفارش شما ارسال شد"
                    className="bg-slate-100 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-600 dark:text-slate-300"
                  />
                </Field>
                <Field label="متن پیام (اختیاری)">
                  <textarea
                    value={msg.body}
                    onChange={(e) => setMsg({ ...msg, body: e.target.value })}
                    placeholder="متن کامل پیام..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/80 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-600 dark:text-slate-300 focus:border-indigo-500 focus:outline-none"
                  />
                </Field>
                <Button
                  className="w-full"
                  variant="success"
                  loading={sendMsg.isPending}
                  disabled={!msg.title.trim()}
                  onClick={() => sendMsg.mutate()}
                >
                  <Mail className="h-4 w-4" />
                  ارسال پیام
                </Button>
                <p className="text-2xs text-slate-600 dark:text-slate-300">
                  پیام در بخش «اعلان‌های» کاربر نمایش داده می‌شود.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
