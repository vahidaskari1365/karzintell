'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Check, MessageCircleQuestion, Send, Star, X } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faDateTime, faNumber } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Card, PageLoading, Tabs, Textarea, Empty } from '@/components/ui';
import { RatingStars } from '@/components/display';
import { PageHeader, Pill, labelOf } from '../_shared';

function ReviewsContent() {
  const sp = useSearchParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState(sp.get('tab') === 'questions' ? 'questions' : 'reviews');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [replyFor, setReplyFor] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [answerFor, setAnswerFor] = useState<any | null>(null);
  const [answerText, setAnswerText] = useState('');

  const { data: reviews, isLoading: loadingR } = useQuery({
    queryKey: ['admin-reviews', status],
    queryFn: async () => api<any>(`/admin/reviews${qs({ status, limit: 50 })}`),
    enabled: tab === 'reviews',
  });
  const { data: questions, isLoading: loadingQ } = useQuery({
    queryKey: ['admin-questions', status],
    queryFn: async () => api<any>(`/admin/questions${qs({ status, limit: 50 })}`),
    enabled: tab === 'questions',
  });

  const moderate = useMutation({
    mutationFn: async ({ id, action, body }: { id: number; action: string; body?: string }) =>
      api(`/admin/reviews/${id}/moderate`, { method: 'POST', body: JSON.stringify({ action, body }) }),
    onSuccess: () => {
      toast.success('انجام شد');
      setReplyFor(null); setReplyText('');
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const answer = useMutation({
    mutationFn: async ({ id, answer }: { id: number; answer: string }) =>
      api(`/admin/questions/${id}/answer`, { method: 'POST', body: JSON.stringify({ answer }) }),
    onSuccess: () => {
      toast.success('پاسخ ثبت شد');
      setAnswerFor(null); setAnswerText('');
      qc.invalidateQueries({ queryKey: ['admin-questions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewItems: any[] = (() => { const d: any = reviews?.data; return Array.isArray(d) ? d : d?.items || []; })();
  const questionItems: any[] = (() => { const d: any = questions?.data; return Array.isArray(d) ? d : d?.items || []; })();

  return (
    <div>
      <PageHeader title="دیدگاه‌ها و پرسش‌ها" subtitle="مدیریت و پاسخ به بازخورد مشتریان" />
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'reviews', label: 'دیدگاه‌ها' }, { key: 'questions', label: 'پرسش‌ها' }]} />

      <div className="my-4 flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map((st) => (
          <Button key={st} size="sm" variant={status === st ? 'primary' : 'secondary'} onClick={() => setStatus(st)}>
            {{ pending: 'در انتظار', approved: 'تأییدشده', rejected: 'ردشده' }[st]}
          </Button>
        ))}
      </div>

      {tab === 'reviews' ? (
        loadingR ? <PageLoading /> : reviewItems.length === 0 ? <Empty title="دیدگاهی در این وضعیت نیست" /> : (
          <div className="space-y-3">
            {reviewItems.map((r: any) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{r.productName || r.product?.name || `#${r.productId}`}</p>
                    <p className="text-2xs text-slate-400">{r.userName || r.user?.fullName} · {faDateTime(r.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingStars value={r.rating} />
                    <Pill status={r.status} label={labelOf({ pending: 'در انتظار', approved: 'تأیید', rejected: 'رد' }, r.status)} />
                  </div>
                </div>
                {r.title && <p className="mt-2 text-sm font-bold text-slate-700">{r.title}</p>}
                {r.body && <p className="mt-1 text-sm leading-7 text-slate-600">{r.body}</p>}
                {r.sellerReply && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">پاسخ فروشگاه: {r.sellerReply}</p>}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {r.status !== 'approved' && (
                    <Button size="sm" onClick={() => moderate.mutate({ id: r.id, action: 'approve' })}><Check className="h-4 w-4" /> تأیید</Button>
                  )}
                  {r.status !== 'rejected' && (
                    <Button size="sm" variant="secondary" className="text-rose-600" onClick={() => moderate.mutate({ id: r.id, action: 'reject' })}><X className="h-4 w-4" /> رد</Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => { setReplyFor(r); setReplyText(r.sellerReply || ''); }}>پاسخ فروشگاه</Button>
                </div>
                {replyFor?.id === r.id && (
                  <div className="mt-3 space-y-2">
                    <Textarea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="پاسخ فروشگاه به این دیدگاه…" />
                    <Button size="sm" loading={moderate.isPending} disabled={replyText.trim().length < 2} onClick={() => moderate.mutate({ id: r.id, action: 'reply', body: replyText })}>
                      <Send className="h-4 w-4" /> ثبت پاسخ
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      ) : loadingQ ? <PageLoading /> : questionItems.length === 0 ? <Empty title="پرسشی در این وضعیت نیست" /> : (
        <div className="space-y-3">
          {questionItems.map((q: any) => (
            <Card key={q.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-800">{q.productName || q.product?.name || `#${q.productId}`}</p>
                <p className="text-2xs text-slate-400">{q.userName || q.user?.fullName} · {faDateTime(q.createdAt)}</p>
              </div>
              <p className="mt-2 flex items-start gap-2 text-sm leading-7 text-slate-700">
                <MessageCircleQuestion className="mt-1 h-4 w-4 shrink-0 text-sky-500" /> {q.question}
              </p>
              {q.answer && <p className="mt-2 rounded-lg bg-emerald-50 p-2.5 text-xs leading-6 text-emerald-800">پاسخ: {q.answer}</p>}
              <div className="mt-3 border-t border-slate-100 pt-3">
                {answerFor?.id === q.id ? (
                  <div className="space-y-2">
                    <Textarea rows={2} value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="پاسخ تخصصی…" />
                    <Button size="sm" loading={answer.isPending} disabled={answerText.trim().length < 2} onClick={() => answer.mutate({ id: q.id, answer: answerText })}>
                      <Send className="h-4 w-4" /> ثبت پاسخ
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => { setAnswerFor(q); setAnswerText(q.answer || ''); }}>
                    {q.answer ? 'ویرایش پاسخ' : 'پاسخ دادن'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ReviewsContent />
    </Suspense>
  );
}
