'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/auth-store';
import { Button, Card, Field, Input, PageLoading, Switch } from '@/components/ui';
import { PageHeader } from '../_shared';

interface SettingItem { key: string; value: string; type: 'string' | 'number' | 'boolean' | 'json'; isPublic: boolean }
interface SettingGroup { group: string; items: SettingItem[] }

const GROUP_LABELS: Record<string, string> = {
  general: 'عمومی', billing: 'مالی و فاکتور', shipping: 'ارسال', inventory: 'انبار', infra: 'زیرساخت', payment: 'پرداخت',
  sms: 'پیامک', mail: 'ایمیل', security: 'امنیت',
};

const isJsonString = (v: string): boolean => /^[\[{]/.test(v.trim());

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [pubFlags, setPubFlags] = useState<Record<string, boolean>>({});
  const [newKey, setNewKey] = useState({ key: '', value: '', group: 'general' });

  const { data: groups, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api<SettingGroup[]>('/admin/settings')).data,
  });

  useEffect(() => {
    if (!groups) return;
    const d: Record<string, string> = {};
    const pf: Record<string, boolean> = {};
    groups.forEach((g) => g.items.forEach((i) => { d[i.key] = i.value ?? ''; pf[i.key] = i.isPublic; }));
    setDraft(d);
    setPubFlags(pf);
  }, [groups]);

  const save = useMutation({
    mutationFn: async () => {
      const items = Object.entries(draft).map(([key, value]) => ({ key, value, isPublic: !!pubFlags[key] }));
      if (newKey.key.trim()) items.push({ key: newKey.key.trim(), value: newKey.value, isPublic: false });
      return api('/admin/settings', { method: 'PUT', body: JSON.stringify({ items }) });
    },
    onSuccess: () => {
      toast.success('تنظیمات ذخیره شد');
      setNewKey({ key: '', value: '', group: 'general' });
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader
        title="تنظیمات فروشگاه"
        subtitle="تغییرات بلافاصله روی API و کش اعمال می‌شود"
        action={<Button size="sm" onClick={() => save.mutate()} loading={save.isPending}><Save className="h-4 w-4" /> ذخیره همه</Button>}
      />

      <div className="space-y-4">
        {(groups || []).map((g) => (
          <Card key={g.group} className="p-5">
            <p className="mb-4 text-sm font-bold text-slate-800">{GROUP_LABELS[g.group] || g.group}</p>
            <div className="space-y-3">
              {g.items.map((item) => {
                const isBool = item.value === 'true' || item.value === 'false';
                return (
                  <div key={item.key} className="grid items-center gap-2 sm:grid-cols-[220px_1fr_auto]">
                    <div>
                      <p className="text-xs font-medium text-slate-700" dir="ltr">{item.key}</p>
                      <p className="text-2xs text-slate-400">{item.type}</p>
                    </div>
                    {isBool ? (
                      <Switch checked={draft[item.key] === 'true'} onChange={(v) => setDraft({ ...draft, [item.key]: String(v) })} />
                    ) : (
                      <Input
                        value={draft[item.key] ?? ''}
                        onChange={(e) => setDraft({ ...draft, [item.key]: e.target.value })}
                        dir={isJsonString(draft[item.key] || '') ? 'ltr' : 'rtl'}
                        className="text-sm"
                      />
                    )}
                    <label className="flex items-center gap-1.5 text-2xs text-slate-400" title="قابل خواندن از API عمومی">
                      <input
                        type="checkbox"
                        checked={!!pubFlags[item.key]}
                        onChange={(e) => setPubFlags({ ...pubFlags, [item.key]: e.target.checked })}
                        className="accent-orange-500"
                      />
                      عمومی
                    </label>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <Card className="p-5">
          <p className="mb-3 text-sm font-bold text-slate-800">افزودن کلید جدید</p>
          <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto]">
            <Input dir="ltr" placeholder="store.custom_key" value={newKey.key} onChange={(e) => setNewKey({ ...newKey, key: e.target.value })} />
            <Input placeholder="مقدار" value={newKey.value} onChange={(e) => setNewKey({ ...newKey, value: e.target.value })} />
            <Button variant="secondary" disabled={!newKey.key.trim()} loading={save.isPending} onClick={() => save.mutate()}>ایجاد</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
