'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlus, Ticket as TicketIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { faDateTime } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Card, Empty, Field, Input, PageLoading, Select, Textarea } from '@/components/ui';
import { Dialog } from '@/components/dialog';

interface Ticket {
  id: number;
  subject: string;
  department: string;
  priority: string;
  status: 'open' | 'pending_support' | 'pending_customer' | 'closed';
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open: { label: 'باز', cls: 'bg-emerald-500/10 text-emerald-300' },
  pending_support: { label: 'در انتظار پشتیبانی', cls: 'bg-amber-500/10 text-amber-300' },
  pending_customer: { label: 'در انتظار شما', cls: 'bg-orange-500/10 text-orange-300' },
  closed: { label: 'بسته‌شده', cls: 'bg-white/10 text-slate-400' },
};

const DEPARTMENTS = [
  { value: 'support', label: 'پشتیبانی' },
  { value: 'sales', label: 'فروش' },
  { value: 'technical', label: 'فنی' },
  { value: 'financial', label: 'مالی' },
  { value: 'other', label: 'سایر' },
];

export default function TicketsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('support');
  const [priority, setPriority] = useState('medium');
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => (await api<Ticket[] | { items: Ticket[] }>('/me/tickets')).data,
  });

  const create = useMutation({
    mutationFn: async () =>
      api('/me/tickets', {
        method: 'POST',
        body: { subject, department, priority, body: message },
      }),
    onSuccess: () => {
      toast.success('تیکت ایجاد شد');
      setOpen(false);
      setSubject(''); setMessage('');
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;
  const items: Ticket[] = Array.isArray(data) ? data : (data as any)?.items || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-100">تیکت‌های پشتیبانی</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <MessageSquarePlus className="h-4 w-4" /> تیکت جدید
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-8"><Empty title="تیکتی ثبت نکرده‌اید" description="در صورت داشتن سؤال یا مشکل، تیکت جدید ایجاد کنید" /></Card>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => {
            const st = STATUS_LABELS[t.status] || STATUS_LABELS.open;
            return (
              <li key={t.id}>
                <Link href={`/account/tickets/${t.id}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#181c20] p-4 transition hover:border-slate-300">
                  <div>
                    <p className="text-sm font-bold text-slate-100">#{t.id} — {t.subject}</p>
                    <p className="mt-1 text-xs text-slate-400">{DEPARTMENTS.find((d) => d.value === t.department)?.label} · آخرین به‌روزرسانی: {faDateTime(t.updatedAt)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-2xs font-bold ${st.cls}`}>{st.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="ایجاد تیکت جدید">
        <div className="space-y-4">
          <Field label="موضوع">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثلاً: سؤال درباره سفارش" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="دپارتمان">
              <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                {DEPARTMENTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </Select>
            </Field>
            <Field label="اولویت">
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">کم</option>
                <option value="medium">متوسط</option>
                <option value="high">زیاد</option>
                <option value="urgent">فوری</option>
              </Select>
            </Field>
          </div>
          <Field label="متن پیام">
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="شرح مشکل یا سؤال…" />
          </Field>
          <Button
            className="w-full"
            disabled={subject.trim().length < 3 || message.trim().length < 5}
            loading={create.isPending}
            onClick={() => create.mutate()}
          >
            ثبت تیکت
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
