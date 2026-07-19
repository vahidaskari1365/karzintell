'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Pencil, Star, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { AddressType } from '@/lib/types';
import { toast } from '@/lib/auth-store';
import { Button, Card, Empty, Field, Input, PageLoading } from '@/components/ui';
import { Dialog, ConfirmDialog } from '@/components/dialog';

const EMPTY = { title: 'آدرس من', receiverName: '', receiverPhone: '', province: '', city: '', postalCode: '', address: '', isDefault: false };

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<null | { id?: number; form: any }>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => (await api<AddressType[]>('/me/addresses')).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['addresses'] });

  const save = useMutation({
    mutationFn: async () => {
      if (dialog?.id) return api(`/me/addresses/${dialog.id}`, { method: 'PATCH', body: dialog.form });
      return api('/me/addresses', { method: 'POST', body: dialog!.form });
    },
    onSuccess: () => { toast.success('آدرس ذخیره شد'); setDialog(null); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api(`/me/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('آدرس حذف شد'); setDeleteId(null); invalidate(); },
  });

  const setDefault = useMutation({
    mutationFn: async (id: number) => api(`/me/addresses/${id}/default`, { method: 'POST' }),
    onSuccess: invalidate,
  });

  if (isLoading) return <PageLoading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">آدرس‌های من</h1>
        <Button onClick={() => setDialog({ form: { ...EMPTY } })}>افزودن آدرس</Button>
      </div>

      {(addresses || []).length === 0 && <Empty title="هنوز آدرسی ثبت نکرده‌اید" />}

      <div className="grid gap-3 md:grid-cols-2">
        {(addresses || []).map((a) => (
          <Card key={a.id} className={a.isDefault ? 'border-emerald-300' : ''}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-slate-400" />
                <span className="font-bold">{a.title}</span>
                {a.isDefault && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setDialog({ id: a.id, form: { ...a } })} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-slate-300"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setDeleteId(a.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-400">
              {a.receiverName} — {a.receiverPhone}
              <br />{a.province}، {a.city}، {a.address}
            </p>
            {!a.isDefault && (
              <button onClick={() => setDefault.mutate(a.id)} className="mt-2 text-xs text-slate-400 underline hover:text-slate-300">
                انتخاب به‌عنوان پیش‌فرض
              </button>
            )}
          </Card>
        ))}
      </div>

      <Dialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.id ? 'ویرایش آدرس' : 'آدرس جدید'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>انصراف</Button>
            <Button onClick={() => save.mutate()} loading={save.isPending}>ذخیره</Button>
          </>
        }
      >
        {dialog && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="عنوان"><Input value={dialog.form.title} onChange={(e) => setDialog((d) => d && { ...d, form: { ...d.form, title: e.target.value } })} /></Field>
            <Field label="نام تحویل‌گیرنده" required><Input value={dialog.form.receiverName} onChange={(e) => setDialog((d) => d && { ...d, form: { ...d.form, receiverName: e.target.value } })} /></Field>
            <Field label="موبایل" required><Input dir="ltr" value={dialog.form.receiverPhone} onChange={(e) => setDialog((d) => d && { ...d, form: { ...d.form, receiverPhone: e.target.value } })} /></Field>
            <Field label="کد پستی"><Input dir="ltr" value={dialog.form.postalCode || ''} onChange={(e) => setDialog((d) => d && { ...d, form: { ...d.form, postalCode: e.target.value } })} /></Field>
            <Field label="استان" required><Input value={dialog.form.province} onChange={(e) => setDialog((d) => d && { ...d, form: { ...d.form, province: e.target.value } })} /></Field>
            <Field label="شهر" required><Input value={dialog.form.city} onChange={(e) => setDialog((d) => d && { ...d, form: { ...d.form, city: e.target.value } })} /></Field>
            <Field label="نشانی کامل" required><Input className="sm:col-span-2" value={dialog.form.address} onChange={(e) => setDialog((d) => d && { ...d, form: { ...d.form, address: e.target.value } })} /></Field>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        title="حذف آدرس"
        message="آیا از حذف این آدرس مطمئن هستید؟"
        loading={remove.isPending}
      />
    </div>
  );
}
