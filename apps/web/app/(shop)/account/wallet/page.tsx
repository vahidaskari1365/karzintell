'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api-client';
import { faDateTime, faNumber, toToman } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Card, Input, PageLoading } from '@/components/ui';

interface WalletTx {
  id: number;
  type: 'charge' | 'debit' | 'refund' | 'withdraw';
  amount: number;
  balanceAfter: number;
  description: string | null;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string;
}

const TX_LABELS: Record<string, string> = {
  charge: 'شارژ کیف پول',
  debit: 'پرداخت سفارش',
  refund: 'عودت وجه',
  withdraw: 'برداشت',
};

export default function WalletPage() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => (await api<{ balance: number; transactions: WalletTx[] }>('/me/wallet')).data,
  });

  const charge = useMutation({
    mutationFn: async (rialAmount: number) =>
      api<{ redirectUrl?: string; paymentUrl?: string; url?: string }>('/me/wallet/charge', {
        method: 'POST',
        body: JSON.stringify({ amount: rialAmount }),
      }),
    onSuccess: (res) => {
      const url = res.data?.redirectUrl || res.data?.paymentUrl || res.data?.url;
      if (url) window.location.href = url;
      else {
        toast.success('درخواست شارژ ثبت شد');
        qc.invalidateQueries({ queryKey: ['wallet'] });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;
  const wallet = data || { balance: 0, transactions: [] };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black text-slate-900">کیف پول</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center gap-4 border-emerald-100 bg-gradient-to-bl from-emerald-50 to-white p-5">
          <span className="rounded-2xl bg-emerald-500 p-3 text-white">
            <Wallet className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs text-slate-500">موجودی کیف پول</p>
            <p className="text-2xl font-black text-slate-900">
              {toToman(wallet.balance)} <span className="text-sm font-normal text-slate-400">تومان</span>
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-1 text-sm font-bold text-slate-700">افزایش اعتبار</p>
          <p className="mb-3 text-xs text-slate-400">مبلغ به تومان وارد شود</p>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              placeholder="مثلاً ۱۰۰٬۰۰۰"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            />
            <Button
              disabled={!amount || Number(amount) < 10000}
              loading={charge.isPending}
              onClick={() => charge.mutate(Number(amount) * 10)}
            >
              <CreditCard className="h-4 w-4" /> شارژ
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <p className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-slate-800">تراکنش‌های اخیر</p>
        {wallet.transactions.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">تراکنشی ثبت نشده است.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {wallet.transactions.map((tx) => {
              const positive = tx.type === 'charge' || tx.type === 'refund';
              return (
                <li key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className={`rounded-xl p-2 ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {positive ? <TrendingUp className="h-4.5 w-4.5" /> : <TrendingDown className="h-4.5 w-4.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{tx.description || TX_LABELS[tx.type] || tx.type}</p>
                    <p className="text-xs text-slate-400">{faDateTime(tx.createdAt)}</p>
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold ${positive ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {positive ? '+' : '−'}{toToman(tx.amount)}
                    </p>
                    <p className="text-2xs text-slate-400">مانده: {toToman(tx.balanceAfter)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
