'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faDateTime } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Card, Empty, PageLoading } from '@/components/ui';
import { disablePush, enablePush, getPushSubscription, isPushSupported } from '@/lib/push';

interface Notif {
  id: number;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

/** کارت فعال‌سازی اعلان مرورگر (Web Push) */
function PushCard() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    getPushSubscription().then((s) => setActive(!!s));
  }, []);

  if (!supported || active === null) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (active) {
        await disablePush();
        setActive(false);
        toast.success('اعلان مرورگر غیرفعال شد');
      } else {
        const r = await enablePush();
        if (r.enabled) {
          setActive(true);
          toast.success('اعلان مرورگر فعال شد — از این پس وضعیت سفارش‌ها را آنی می‌بینید');
        } else {
          toast.error(r.reason || 'فعال‌سازی ممکن نشد');
        }
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-blue-200 bg-blue-50/50">
      <div className="flex items-center gap-3">
        <BellRing className="h-6 w-6 text-blue-600" />
        <div>
          <div className="text-sm font-bold text-slate-800">اعلان مرورگر (Push Notification)</div>
          <div className="text-xs text-slate-500">وضعیت سفارش و پیام‌های مهم را لحظه‌ای روی گوشی/کامپیوتر خود ببینید.</div>
        </div>
      </div>
      <Button size="sm" variant={active ? 'secondary' : 'primary'} onClick={toggle} loading={busy}>
        {active ? 'غیرفعال کردن' : 'فعال‌سازی'}
      </Button>
    </Card>
  );
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api<Notif[] | { items: Notif[] }>('/me/notifications')).data,
  });

  const readAll = useMutation({
    mutationFn: async () => api('/me/notifications/read', { method: 'POST', body: JSON.stringify({ all: true }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('همه اعلان‌ها خوانده شد');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const readOne = useMutation({
    mutationFn: async (ids: number[]) =>
      api('/me/notifications/read', { method: 'POST', body: JSON.stringify({ ids }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <PageLoading />;
  const items: Notif[] = Array.isArray(data) ? data : data?.items ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-900">اعلان‌ها {unread > 0 && <span className="text-sm font-normal text-orange-500">({unread} خوانده‌نشده)</span>}</h1>
        {unread > 0 && (
          <Button variant="secondary" size="sm" onClick={() => readAll.mutate()} loading={readAll.isPending}>
            <CheckCheck className="h-4 w-4" /> خواندن همه
          </Button>
        )}
      </div>

      <PushCard />

      {items.length === 0 ? (
        <Card className="p-8"><Empty title="اعلانی ندارید" /></Card>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => !n.readAt && readOne.mutate([n.id])}
                className={`w-full rounded-2xl border p-4 text-right transition ${
                  n.readAt ? 'border-slate-100 bg-white' : 'border-orange-200 bg-orange-50/40 hover:bg-orange-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm ${n.readAt ? 'font-medium text-slate-600' : 'font-bold text-slate-900'}`}>{n.title}</p>
                  {!n.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />}
                </div>
                {n.body && <p className="mt-1 text-xs text-slate-500">{n.body}</p>}
                <p className="mt-2 text-2xs text-slate-400">{faDateTime(n.createdAt)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
