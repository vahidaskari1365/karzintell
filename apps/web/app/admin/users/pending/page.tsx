'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faNumber } from '@/lib/format';
import { hasPermission, toast, useAuthStore } from '@/lib/auth-store';
import { Button, PageLoading } from '@/components/ui';
import { Pagination } from '@/components/display';
import { PageHeader } from '../../_shared';

interface UserRow {
  id: number;
  fullName: string;
  phone: string;
  email: string | null;
  status: string;
  roleNames?: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'در انتظار تأیید', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  active: { label: 'فعال', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  suspended: { label: 'معلق', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

export default function AdminPendingUsersPage() {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const canApprove = hasPermission(me, 'users.update');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pending-users', page],
    queryFn: async () =>
      api<UserRow[] | { items: UserRow[] }>(`/admin/users${qs({ page, limit: 20, status: 'pending' })}`),
  });

  const raw: any = data?.data;
  const items: UserRow[] = Array.isArray(raw) ? raw : raw?.items || [];
  const total: number = (raw as any)?.meta?.total ?? items.length;

  const approveMutation = useMutation({
    mutationFn: async (id: number) => api(`/admin/users/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('کاربر تأیید شد و حالا می‌تواند وارد شود');
      qc.invalidateQueries({ queryKey: ['admin-pending-users'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: any) => toast.error(e?.message || 'خطا در تأیید کاربر'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) =>
      api(`/admin/users/${id}/reject`, { method: 'POST', body: { reason } }),
    onSuccess: () => {
      toast.success('کاربر رد شد');
      qc.invalidateQueries({ queryKey: ['admin-pending-users'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: any) => toast.error(e?.message || 'خطا در رد کاربر'),
  });

  return (
    <div className="text-slate-800 dark:text-slate-200">
      <PageHeader
        title="کاربران در انتظار تأیید"
        subtitle="کاربرانی که ثبت‌نام کرده‌اند ولی ادمین باید تأییدشان کند"
        action={
          <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
            <Clock className="h-4 w-4" />
            <span>{faNumber(total)} کاربر در انتظار</span>
          </div>
        }
      />

      {isLoading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-6 py-14 text-center">
          <UserCheck className="h-12 w-12 text-slate-600 dark:text-slate-400" />
          <span className="text-base font-semibold text-slate-700 dark:text-slate-300">هیچ کاربر pending‌ای وجود ندارد</span>
          <span className="text-sm text-slate-600 dark:text-slate-400">همه کاربران تأیید شده‌اند یا در انتظار ثبت‌نام هستند</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-xs text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-start font-bold">نام</th>
                <th className="px-4 py-3 text-start font-bold">موبایل</th>
                <th className="px-4 py-3 text-start font-bold">ایمیل</th>
                <th className="px-4 py-3 text-start font-bold">تاریخ ثبت‌نام</th>
                <th className="px-4 py-3 text-start font-bold">وضعیت</th>
                {canApprove && <th className="px-4 py-3 text-start font-bold">عملیات</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t border-slate-200 dark:border-slate-800 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-rose-500/30 text-xs font-bold text-amber-200">
                        {u.fullName.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300" dir="ltr">{faNumber(u.phone)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{u.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-1 text-2xs font-bold ${STATUS_LABELS[u.status]?.color || STATUS_LABELS.pending.color}`}>
                      {STATUS_LABELS[u.status]?.label || u.status}
                    </span>
                  </td>
                  {canApprove && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(u.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          تأیید
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={rejectMutation.isPending}
                          onClick={() => {
                            const reason = prompt('دلیل رد کاربر (اختیاری):');
                            rejectMutation.mutate({ id: u.id, reason: reason || undefined });
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                          رد
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <Pagination
          page={page}
          total={total}
          limit={20}
          onPage={(p: number) => setPage(p)}
        />
      )}
    </div>
  );
}
