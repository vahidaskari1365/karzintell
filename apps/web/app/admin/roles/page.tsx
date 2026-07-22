'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faNumber } from '@/lib/format';
import { hasPermission, toast, useAuthStore } from '@/lib/auth-store';
import { Button, Card, Field, Input, PageLoading, Empty } from '@/components/ui';
import { Dialog, ConfirmDialog } from '@/components/dialog';
import { PageHeader, Pill, tableCls } from '../_shared';

interface Role {
  id: number; name: string; title: string; description: string | null;
  isSystem: boolean; userCount: number; permissions: string[] | '*';
}

interface Perm { key: string; title: string; group: string }

const GROUP_LABELS: Record<string, string> = {
  dashboard: 'داشبورد', users: 'کاربران', roles: 'نقش‌ها', products: 'محصولات', catalog: 'کاتالوگ',
  inventory: 'انبار', orders: 'سفارش‌ها', payments: 'پرداخت‌ها', customers: 'مشتریان',
  moderation: 'نظارت محتوا', marketing: 'بازاریابی', tickets: 'تیکت‌ها', settings: 'تنظیمات', reports: 'گزارش‌ها',
};

export default function AdminRolesPage() {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const canEdit = hasPermission(me, 'roles.update');
  const canCreate = hasPermission(me, 'roles.create');
  const canDelete = hasPermission(me, 'roles.delete');
  const [selected, setSelected] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Role | null>(null);

  const { data: roles, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => (await api<Role[]>('/admin/roles')).data,
  });
  const { data: permsData } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => (await api<{ permissions: Perm[]; groups: Record<string, string> }>('/admin/permissions')).data,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api(`/admin/roles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('نقش حذف شد');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="نقش‌ها و سطوح دسترسی"
        subtitle="هر نقش مجموعه‌ای از مجوزهاست؛ مجوزها دانه‌دانه روی API اعمال می‌شوند"
        action={canCreate ? <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> نقش جدید</Button> : undefined}
      />

      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead className={tableCls.thead}>
            <tr>
              <th className={tableCls.th}>نقش</th>
              <th className={tableCls.th}>نام ماشینی</th>
              <th className={tableCls.th}>کاربران</th>
              <th className={tableCls.th}>سطح دسترسی</th>
              <th className={tableCls.th}></th>
            </tr>
          </thead>
          <tbody>
            {(roles || []).map((r) => (
              <tr key={r.id} className={tableCls.row}>
                <td className={tableCls.td}>
                  <p className="flex items-center gap-2 font-bold">
                    <ShieldCheck className={`h-4 w-4 ${r.name === 'super_admin' ? 'text-rose-500' : 'text-slate-300'}`} />
                    {r.title}
                    {r.isSystem && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs text-slate-500">سیستمی</span>}
                  </p>
                  {r.description && <p className="mt-0.5 text-2xs text-slate-400">{r.description}</p>}
                </td>
                <td className={tableCls.td}><code className="text-xs text-slate-400" dir="ltr">{r.name}</code></td>
                <td className={tableCls.td}>{faNumber(r.userCount)}</td>
                <td className={tableCls.td}>
                  {r.permissions === '*' ? (
                    <Pill status="rejected" label="همه دسترسی‌ها (کامل)" />
                  ) : (
                    <span className="text-xs text-slate-500">{faNumber(r.permissions.length)} مجوز</span>
                  )}
                </td>
                <td className={`${tableCls.td} text-left`}>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setSelected(r)} disabled={!canEdit && r.name !== 'super_admin'}>
                      ماتریس دسترسی
                    </Button>
                    {canDelete && !r.isSystem && (
                      <button onClick={() => setDeleting(r)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
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

      {selected && (
        <RoleMatrixDialog
          role={selected}
          allPerms={permsData?.permissions || []}
          groupLabels={{ ...GROUP_LABELS, ...(permsData?.groups || {}) }}
          canEdit={canEdit && selected.name !== 'super_admin'}
          onClose={() => setSelected(null)}
        />
      )}
      {creating && (
        <RoleMatrixDialog
          role={null}
          allPerms={permsData?.permissions || []}
          groupLabels={{ ...GROUP_LABELS, ...(permsData?.groups || {}) }}
          canEdit
          onClose={() => setCreating(false)}
        />
      )}

      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending}
        title="حذف نقش" message={`«${deleting?.title}» حذف شود؟`}
      />
    </div>
  );
}

/** ماتریس مجوزها — برای نقش جدید یا ویرایش نقش موجود */
function RoleMatrixDialog({
  role, allPerms, groupLabels, canEdit, onClose,
}: {
  role: Role | null; allPerms: Perm[]; groupLabels: Record<string, string>; canEdit: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(role?.title || '');
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [checked, setChecked] = useState<Set<string>>(
    new Set(role?.permissions === '*' ? allPerms.map((p) => p.key) : role?.permissions || []),
  );

  const groups = new Map<string, Perm[]>();
  allPerms.forEach((p) => {
    if (!groups.has(p.group)) groups.set(p.group, []);
    groups.get(p.group)!.push(p);
  });

  const toggle = (key: string) => {
    const next = new Set(checked);
    if (next.has(key)) next.delete(key); else next.add(key);
    setChecked(next);
  };

  const toggleGroup = (g: string, perms: Perm[]) => {
    const allSelected = perms.every((p) => checked.has(p.key));
    const next = new Set(checked);
    perms.forEach((p) => { if (allSelected) next.delete(p.key); else next.add(p.key); });
    setChecked(next);
  };

  const save = useMutation({
    mutationFn: async () =>
      role
        ? api(`/admin/roles/${role.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ title, description, permissions: [...checked] }),
          })
        : api('/admin/roles', {
            method: 'POST',
            body: JSON.stringify({ name, title, permissions: [...checked] }),
          }),
    onSuccess: () => {
      toast.success(role ? 'نقش به‌روزرسانی شد' : 'نقش ایجاد شد');
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onClose={onClose} title={role ? `ماتریس دسترسی «${role.title}»` : 'نقش جدید'} size="xl">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="عنوان نقش" required><Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} /></Field>
          <Field label="نام ماشینی (انگلیسی)" required><Input dir="ltr" value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} disabled={!!role || !canEdit} placeholder="accountant" /></Field>
          <Field label="توضیح"><Input value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} /></Field>
        </div>

        {role?.name === 'super_admin' && (
          <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-600">نقش مدیر ارشد همیشه همه دسترسی‌ها را دارد و قابل محدود کردن نیست.</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...groups.entries()].map(([g, perms]) => {
            const selectedCount = perms.filter((p) => checked.has(p.key)).length;
            return (
              <Card key={g} className="p-3.5">
                <button onClick={() => canEdit && toggleGroup(g, perms)} className="mb-2 flex w-full items-center justify-between text-sm font-bold text-slate-700">
                  {groupLabels[g] || g}
                  <span className={`text-2xs ${selectedCount === perms.length ? 'text-emerald-600' : selectedCount > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                    {faNumber(selectedCount)}/{faNumber(perms.length)}
                  </span>
                </button>
                <div className="space-y-1.5">
                  {perms.map((p) => (
                    <label key={p.key} className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={checked.has(p.key)}
                        disabled={!canEdit}
                        onChange={() => toggle(p.key)}
                        className="h-3.5 w-3.5 accent-orange-500"
                      />
                      {p.title}
                    </label>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {canEdit && (
          <Button
            className="w-full"
            loading={save.isPending}
            disabled={!title.trim() || (!role && !name.trim())}
            onClick={() => save.mutate()}
          >
            {role ? 'ذخیره مجوزها' : 'ایجاد نقش'}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
