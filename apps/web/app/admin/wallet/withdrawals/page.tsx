'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faDateTime, faNumber, toToman } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Empty, Select } from '@/components/ui';
import { Dialog } from '@/components/dialog';
import { PageHeader, tableCls, Pill } from '../../_shared';

/** یک ردیف تراکنش برداشت از کیف پول — خروجی admin/wallet/withdrawals */
interface Withdrawal {
  id: number;
  walletId: number;
  type: 'withdraw';
  amount: number; // ریال (به‌همراه bigint transformer)
  balanceAfter: number;
  description: string | null;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string;
}

/** استخراج شماره شبا از توضیح تراکنش */
function parseShaba(desc: string | null): string {
  if (!desc) return '—';
  const m = desc.match(/شبا\s+(\S+)/);
  return m ? m[1] : '—';
}

/** استخراج نام دارنده حساب از توضیح */
function parseCardHolder(desc: string | null): string {
  if (!desc) return '—';
  const m = desc.match(/بنام\s+(.+?)\s*\[وضعیت:/);
  return m ? m[1].trim() : '—';
}

/** استخراج کلید و برچسب وضعیت از توضیح */
function parseStatus(desc: string | null): { key: string; label: string } {
  if (!desc) return { key: 'pending', label: 'در انتظار' };
  if (desc.includes('[وضعیت: در انتظار واریز]')) return { key: 'pending', label: 'در انتظار' };
  if (desc.includes('[وضعیت: واریز شد')) return { key: 'approved', label: 'واریز شد' };
  if (desc.includes('[وضعیت: رد شد')) return { key: 'rejected', label: 'رد شد' };
  return { key: 'pending', label: 'در انتظار' };
}

/** صفحهٔ مدیریت درخواست‌های تسویه‌حساب کیف پول مشتریان */
export default function AdminWithdrawalsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejecting, setRejecting] = useState<Withdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-wallet-withdrawals'],
    queryFn: async () => (await api<Withdrawal[]>('/admin/wallet/withdrawals')).data,
  });

  const all = data || [];
  const items = all.filter((w) => {
    if (filter === 'all') return true;
    return parseStatus(w.description).key === filter;
  });
  const pendingCount = all.filter((w) => parseStatus(w.description).key === 'pending').length;

  // تأیید درخواست برداشت — POST /admin/wallet/withdrawals/:id/approve
  const approve = useMutation({
    mutationFn: async (id: number) => api(`/admin/wallet/withdrawals/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('درخواست برداشت تأیید شد');
      qc.invalidateQueries({ queryKey: ['admin-wallet-withdrawals'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // رد درخواست — POST /admin/wallet/withdrawals/:id/reject با body شامل علت
  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      api(`/admin/wallet/withdrawals/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      toast.success('درخواست رد شد و مبلغ به کیف پول بازگشت');
      setRejecting(null);
      setRejectReason('');
      qc.invalidateQueries({ queryKey: ['admin-wallet-withdrawals'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="درخواست‌های برداشت کیف پول"
        subtitle={all.length ? `${faNumber(all.length)} درخواست · ${faNumber(pendingCount)} در انتظار بررسی` : undefined}
      />

      <div className="mb-4 flex gap-2">
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="max-w-56">
          <option value="all">همه ({faNumber(all.length)})</option>
          <option value="pending">در انتظار ({faNumber(pendingCount)})</option>
          <option value="approved">واریزشده</option>
          <option value="rejected">ردشده</option>
        </Select>
      </div>

      {items.length === 0 ? (
        <Empty title="درخواستی یافت نشد" />
      ) : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={tableCls.th}>کیف پول</th>
                <th className={tableCls.th}>مبلغ (تومان)</th>
                <th className={tableCls.th}>شماره شبا</th>
                <th className={tableCls.th}>بنام</th>
                <th className={tableCls.th}>وضعیت</th>
                <th className={tableCls.th}>تاریخ</th>
                <th className={tableCls.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => {
                const st = parseStatus(w.description);
                return (
                  <tr key={w.id} className={tableCls.row}>
                    <td className={tableCls.td}>
                      <p className="font-medium">کیف پول #{faNumber(w.walletId)}</p>
                    </td>
                    <td className={`${tableCls.td} font-bold`}>{toToman(w.amount)}</td>
                    <td className={tableCls.td}><code className="text-xs text-slate-600 dark:text-slate-200" dir="ltr">{parseShaba(w.description)}</code></td>
                    <td className={tableCls.td}>{parseCardHolder(w.description)}</td>
                    <td className={tableCls.td}><Pill status={st.key} label={st.label} /></td>
                    <td className={tableCls.td}><span className="text-xs text-slate-600 dark:text-slate-200">{faDateTime(w.createdAt)}</span></td>
                    <td className={`${tableCls.td} text-left`}>
                      {st.key === 'pending' ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="success" loading={approve.isPending} onClick={() => approve.mutate(w.id)}>
                            <CheckCircle2 className="h-4 w-4" /> تأیید
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => { setRejecting(w); setRejectReason(''); }}>
                            <XCircle className="h-4 w-4" /> رد
                          </Button>
                        </div>
                      ) : (
                        <span className="text-2xs text-slate-600 dark:text-slate-200">پردازش‌شده</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* دیالوگ رد درخواست با علت */}
      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} title="رد درخواست برداشت">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-200">
            مبلغ <b className="text-slate-900 dark:text-slate-100">{rejecting ? toToman(rejecting.amount) : ''}</b> به کیف پول کاربر بازگردانده می‌شود.
          </p>
          <Field label="علت رد" required>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="مثلاً: عدم تطابق نام شبا با مالک کیف پول" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRejecting(null)}>انصراف</Button>
            <Button
              variant="danger"
              loading={reject.isPending}
              disabled={!rejectReason.trim()}
              onClick={() => rejecting && reject.mutate({ id: rejecting.id, reason: rejectReason.trim() })}
            >
              <XCircle className="h-4 w-4" /> رد و عودت وجه
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
