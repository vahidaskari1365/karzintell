'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Smartphone, QrCode } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/auth-store';
import { normalizeDigits } from '@/lib/format';
import { Button, Card, Field, Input } from '@/components/ui';

/** کارت مدیریت ورود دومرحله‌ای (TOTP) با QR Code */
export function TwoFactorCard() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [disableMode, setDisableMode] = useState(false);

  const { data } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => (await api<{ enabled: boolean }>('/me/2fa')).data,
  });
  const enabled = !!data?.enabled;

  const startSetup = async () => {
    setBusy(true);
    try {
      const { data: d } = await api<{ secret: string; otpauthUrl: string; qrDataUrl: string }>('/me/2fa/setup', { method: 'POST', body: {} });
      setSetup(d);
      setDisableMode(false);
      setCode('');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const enable = async () => {
    setBusy(true);
    try {
      await api('/me/2fa/enable', { method: 'POST', body: { code: normalizeDigits(code) } });
      toast.success('ورود دومرحله‌ای فعال شد 🛡️');
      setSetup(null);
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await api('/me/2fa/disable', { method: 'POST', body: { code: normalizeDigits(code) } });
      toast.success('ورود دومرحله‌ای غیرفعال شد');
      setDisableMode(false);
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-bold">
        <ShieldCheck className={`h-5 w-5 ${enabled ? 'text-emerald-500' : 'text-slate-400'}`} /> ورود دومرحله‌ای (2FA)
      </h2>
      <p className="mb-4 text-xs text-slate-400">
        با اپلیکیشن‌هایی مثل Google Authenticator امنیت حساب را چند برابر کنید.
      </p>

      {enabled ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">✅ ورود دومرحله‌ای فعال است</div>
          {disableMode ? (
            <>
              <Field label="کد ۶ رقمی اپلیکیشن" required hint="برای غیرفعال‌سازی، کد فعلی را وارد کنید">
                <Input dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(normalizeDigits(e.target.value))} className="text-center tracking-[0.4em]" />
              </Field>
              <div className="flex gap-2">
                <Button variant="danger" onClick={disable} loading={busy} disabled={code.length !== 6}>غیرفعال‌سازی</Button>
                <Button variant="secondary" onClick={() => setDisableMode(false)}>انصراف</Button>
              </div>
            </>
          ) : (
            <Button variant="secondary" onClick={() => { setDisableMode(true); setSetup(null); }}>غیرفعال کردن</Button>
          )}
        </div>
      ) : setup ? (
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4">
            <QrCode className="h-5 w-5 text-slate-400" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qrDataUrl} alt="QR Code" className="h-44 w-44" />
            <div className="text-center text-xs text-slate-400">
              کد را با Google Authenticator اسکن کنید یا کلید را دستی وارد کنید:
              <div className="mt-1 rounded-lg bg-white/10 px-3 py-1.5 font-mono text-sm font-bold tracking-widest" dir="ltr">{setup.secret}</div>
            </div>
          </div>
          <Field label="کد ۶ رقمی نمایش‌داده‌شده در اپ" required>
            <Input dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(normalizeDigits(e.target.value))} className="text-center tracking-[0.4em]" />
          </Field>
          <div className="flex gap-2">
            <Button onClick={enable} loading={busy} disabled={code.length !== 6}>
              <Smartphone className="h-4 w-4" /> فعال‌سازی
            </Button>
            <Button variant="secondary" onClick={() => setSetup(null)}>انصراف</Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={startSetup} loading={busy}>
          <Smartphone className="h-4 w-4" /> راه‌اندازی ورود دومرحله‌ای
        </Button>
      )}
    </Card>
  );
}
