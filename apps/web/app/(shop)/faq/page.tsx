'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { PageLoading, Empty, Card } from '@/components/ui';

interface Faq {
  id: number;
  question: string;
  answer: string;
}

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);
  const { data, isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => (await api<Faq[]>('/faqs')).data,
  });

  if (isLoading) return <PageLoading />;
  const items = data || [];

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="mb-2 flex items-center gap-2 text-2xl font-black"><HelpCircle className="h-6 w-6" /> سوالات متداول</h1>
      <p className="mb-6 text-sm text-slate-400">پاسخ پرتکرارترین پرسش‌های مشتریان کارزینتل</p>

      {items.length === 0 && <Empty title="هنوز سؤالی ثبت نشده است" />}
      <div className="space-y-3">
        {items.map((f, i) => (
          <Card key={f.id} className="!p-0 overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-3 p-4 text-right"
            >
              <span className="text-sm font-bold text-slate-100">{f.question}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && (
              <div className="border-t border-white/10 p-4 text-sm leading-7 text-slate-400">{f.answer}</div>
            )}
          </Card>
        ))}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }) }} />
    </div>
  );
}
