'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { Button, Card, Field, Input, Badge } from '@/components/ui';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/types';
import { faDateTime, toToman } from '@/lib/format';

export default function TrackPage() {
  const [form, setForm] = useState({ code: '', phone: '' });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api('/orders/track-guest', { method: 'POST', body: form, auth: false });
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-10">
      <h1 className="mb-2 text-2xl font-black">پیگیری سفارش</h1>
      <p className="mb-6 text-sm text-slate-400">کد سفارش و شماره موبایل تحویل‌گیرنده را وارد کنید.</p>
      <Card className="space-y-4">
        <Field label="کد سفارش" required>
          <Input dir="ltr" placeholder="KRZ-2026-000001" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
        </Field>
        <Field label="موبایل تحویل‌گیرنده" required>
          <Input dir="ltr" placeholder="09xxxxxxxxx" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </Field>
        <Button className="w-full" onClick={search} loading={loading} disabled={!form.code || !form.phone}>
          پیگیری
        </Button>
        {error && <p className="text-center text-sm text-rose-400">{error}</p>}
      </Card>

      {result && (
        <Card className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold" dir="ltr">{result.code}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${ORDER_STATUS_COLORS[result.status]}`}>
              {ORDER_STATUS_LABELS[result.status] || result.statusLabel}
            </span>
          </div>
          <div className="text-sm text-slate-400">ثبت: {faDateTime(result.createdAt)}</div>
          <div className="border-t border-white/10 pt-3 text-sm font-bold">
            مبلغ: {toToman(result.grandTotal)}
          </div>
        </Card>
      )}
    </div>
  );
}
