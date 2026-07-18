'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Send } from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { api } from '@/lib/api-client';
import { faDateTime } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Card, PageLoading, Textarea } from '@/components/ui';

interface TicketMessage {
  id: number;
  senderId: number;
  senderName?: string;
  isStaff?: boolean;
  body: string;
  createdAt: string;
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [reply, setReply] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () =>
      (await api<{ ticket: { id: number; subject: string; status: string; department: string }; messages: TicketMessage[] }>(`/me/tickets/${id}`)).data,
  });

  const send = useMutation({
    mutationFn: async () =>
      api(`/me/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: reply }) }),
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['ticket', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;
  if (!data) return null;
  const { ticket, messages } = data;
  const closed = ticket.status === 'closed';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/account/tickets" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:text-slate-900">
          <ArrowRight className="h-4.5 w-4.5" />
        </Link>
        <div>
          <h1 className="text-lg font-black text-slate-900">#{ticket.id} — {ticket.subject}</h1>
          <p className="text-xs text-slate-400">وضعیت: {closed ? 'بسته‌شده' : 'باز'} </p>
        </div>
      </div>

      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.isStaff ? 'justify-start' : 'justify-end'}`}>
            <Card className={`max-w-[80%] p-4 ${m.isStaff ? 'border-slate-200 bg-slate-50' : 'border-orange-100 bg-orange-50/50'}`}>
              {m.isStaff && <p className="mb-1 text-2xs font-bold text-orange-600">پشتیبانی کارزینتل</p>}
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{m.body}</p>
              <p className="mt-2 text-left text-2xs text-slate-400">{faDateTime(m.createdAt)}</p>
            </Card>
          </div>
        ))}
      </div>

      {closed ? (
        <p className="rounded-2xl bg-slate-100 p-4 text-center text-sm text-slate-500">این تیکت بسته شده است. در صورت نیاز تیکت جدید ایجاد کنید.</p>
      ) : (
        <Card className="p-4">
          <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="پاسخ شما…" />
          <div className="mt-3 flex justify-end">
            <Button size="sm" disabled={reply.trim().length < 2} loading={send.isPending} onClick={() => send.mutate()}>
              <Send className="h-4 w-4" /> ارسال پاسخ
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
