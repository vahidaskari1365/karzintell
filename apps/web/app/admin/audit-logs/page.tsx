'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, qs } from '@/lib/api-client';
import { faDateTime, faNumber } from '@/lib/format';
import { PageLoading, Empty, Input, Select } from '@/components/ui';
import { Pagination } from '@/components/display';
import { PageHeader, tableCls } from '../_shared';

interface AuditRow {
  id: number; userId: number | null; userName?: string; action: string;
  subjectType: string | null; subjectId: number | null;
  oldValues?: any; newValues?: any;
  ip: string | null; createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, action, userId],
    queryFn: async () =>
      api<any>(`/admin/audit-logs${qs({ page, limit: 25, action: action || undefined, userId: userId || undefined })}`),
  });

  const raw: any = data?.data;
  const items: AuditRow[] = Array.isArray(raw) ? raw : raw?.items || [];

  return (
    <div>
      <PageHeader title="لاگ عملیات" subtitle="ردیابی تمام تغییرات انجام‌شده در پنل مدیریت" />

      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }} className="max-w-56">
          <option value="">همه عملیات</option>
          {['product.create', 'product.update', 'product.delete', 'order.update_status', 'order.cancel', 'user.create', 'user.assign_roles', 'settings.update', 'coupon.create', 'category.update'].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <Input placeholder="شناسه کاربر…" inputMode="numeric" value={userId} onChange={(e) => { setPage(1); setUserId(e.target.value.replace(/[^0-9]/g, '')); }} className="max-w-36" />
      </div>

      {isLoading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <Empty title="رویدادی ثبت نشده" />
      ) : (
        <>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>زمان</th>
                  <th className={tableCls.th}>کاربر</th>
                  <th className={tableCls.th}>عملیات</th>
                  <th className={tableCls.th}>هدف</th>
                  <th className={tableCls.th}>IP</th>
                  <th className={tableCls.th}>جزئیات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l.id} className={tableCls.row}>
                    <td className={tableCls.td}><span className="text-xs text-slate-400">{faDateTime(l.createdAt)}</span></td>
                    <td className={tableCls.td}>{l.userName || (l.userId != null ? `#${faNumber(l.userId)}` : 'سیستم')}</td>
                    <td className={tableCls.td}><code className="rounded bg-slate-100 px-2 py-0.5 text-2xs" dir="ltr">{l.action}</code></td>
                    <td className={tableCls.td}><span className="text-xs text-slate-500" dir="ltr">{l.subjectType || '—'}{l.subjectId != null ? `#${l.subjectId}` : ''}</span></td>
                    <td className={tableCls.td}><span className="text-2xs text-slate-400" dir="ltr">{l.ip || '—'}</span></td>
                    <td className={tableCls.td}>
                      {(l.newValues || l.oldValues) && (
                        <details className="max-w-64">
                          <summary className="cursor-pointer text-2xs text-sky-600">مشاهده</summary>
                          <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-50 p-2 text-2xs" dir="ltr">
                            {JSON.stringify({ before: l.oldValues, after: l.newValues }, null, 1)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={25} total={data?.meta?.total || 0} onPage={setPage} />
        </>
      )}
    </div>
  );
}
