'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Lock, Send } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faDateTime, faNumber } from '@/lib/format';
import { hasPermission, toast, useAuthStore } from '@/lib/auth-store';
import { Button, Card, PageLoading, Select, Textarea, Empty } from '@/components/ui';
import { Dialog } from '@/components/dialog';
import { Pagination } from '@/components/display';
import { PageHeader, tableCls, Pill } from '../_shared';

interface TicketRow {
  id: number; subject: string; department: string; priority: string; status: string;
  createdAt: string; updatedAt: string; userName?: string; user_name?: string; userPhone?: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'باز', pending_support: 'در انتظار پشتیبانی', pending_customer: 'در انتظار مشتری', closed: 'بسته‌شده',
};
const PRIORITY_LABELS: Record<string, string> = { low: 'کم', medium: 'متوسط', high: 'زیاد', urgent: 'فوری' };

export default function AdminTicketsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [openTicket, setOpenTicket] = useState<TicketRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets', page, status],
    queryFn: async () => api<any>(`/admin/tickets${qs({ page, limit: 20, status: status || undefined })}`),
  });

  const raw: any = data?.data;
  const items: TicketRow[] = Array.isArray(raw) ? raw : raw?.items || [];

  return (
    <div>
      <PageHeader title="تیکت‌های پشتیبانی" />
      <div className="mb-4 flex gap-2">
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="max-w-52">
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : items.length === 0 ? (
        <Empty title="تیکتی یافت نشد" />
      ) : (
        <>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>موضوع</th>
                  <th className={tableCls.th}>کاربر</th>
                  <th className={tableCls.th}>اولویت</th>
                  <th className={tableCls.th}>وضعیت</th>
                  <th className={tableCls.th}>به‌روزرسانی</th>
                  <th className={tableCls.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className={tableCls.row}>
                    <td className={tableCls.td}><span className="font-medium">#{t.id} — {t.subject}</span></td>
                    <td className={tableCls.td}><span className="text-xs">{t.userName || t.user_name || '—'}</span></td>
                    <td className={tableCls.td}>
                      <Pill status={t.priority === 'urgent' ? 'rejected' : t.priority === 'high' ? 'pending' : 'draft'} label={PRIORITY_LABELS[t.priority] || t.priority} />
                    </td>
                    <td className={tableCls.td}><Pill status={t.status} label={STATUS_LABELS[t.status] || t.status} /></td>
                    <td className={tableCls.td}><span className="text-xs text-slate-400">{faDateTime(t.updatedAt)}</span></td>
                    <td className={`${tableCls.td} text-left`}>
                      <Button size="sm" variant="secondary" onClick={() => setOpenTicket(t)}>گفتگو</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={data?.meta?.total || 0} onPage={setPage} />
        </>
      )}

      {openTicket && <TicketDialog ticket={openTicket} onClose={() => setOpenTicket(null)} />}
    </div>
  );
}

function TicketDialog({ ticket, onClose }: { ticket: TicketRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canReply = hasPermission(user, 'tickets.reply');
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ticket', ticket.id],
    queryFn: async () => (await api<any>(`/admin/tickets/${ticket.id}`)).data,
    refetchInterval: 15_000,
  });

  const send = useMutation({
    mutationFn: async () =>
      api(`/admin/tickets/${ticket.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: reply, isInternal: internal }),
      }),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['admin-ticket', ticket.id] });
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (st: string) => api(`/admin/tickets/${ticket.id}/status`, { method: 'POST', body: JSON.stringify({ status: st }) }),
    onSuccess: () => {
      toast.success('وضعیت تغییر کرد');
      qc.invalidateQueries({ queryKey: ['admin-ticket', ticket.id] });
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const messages: any[] = data?.messages || [];
  const t = data?.ticket || ticket;

  return (
    <Dialog open onClose={onClose} title={`#${t.id} — ${t.subject}`} size="lg">
      <div className="mb-3 flex items-center justify-between">
        <Pill status={t.status} label={STATUS_LABELS[t.status] || t.status} />
        {t.status !== 'closed' ? (
          <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => setStatus.mutate('closed')}>
            <Lock className="h-3.5 w-3.5" /> بستن تیکت
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setStatus.mutate('pending_customer')}>بازگشایی</Button>
        )}
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3">
        {isLoading ? (
          <PageLoading />
        ) : messages.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-400">پیامی نیست</p>
        ) : (
          messages.map((m: any) => {
            const mine = m.senderId === user?.id || m.isStaff;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${m.isInternal ? 'border border-dashed border-amber-300 bg-amber-50' : mine ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200'}`}>
                  {m.isInternal && <p className="mb-1 text-2xs font-bold text-amber-600">یادداشت داخلی (به کاربر نشان داده نمی‌شود)</p>}
                  <p className="whitespace-pre-wrap leading-7">{m.body}</p>
                  <p className={`mt-1.5 text-2xs ${mine && !m.isInternal ? 'text-slate-400' : 'text-slate-400'}`}>{faDateTime(m.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canReply && t.status !== 'closed' && (
        <div className="mt-3 space-y-2">
          <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="پاسخ به مشتری…" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-amber-500" />
              یادداشت داخلی
            </label>
            <Button size="sm" loading={send.isPending} disabled={reply.trim().length < 2} onClick={() => send.mutate()}>
              <Send className="h-4 w-4" /> ارسال
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
