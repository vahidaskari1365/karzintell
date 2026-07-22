'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HelpCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { faNumber } from '@/lib/format';
import { toast } from '@/lib/auth-store';
import { Button, Field, Input, PageLoading, Switch, Textarea } from '@/components/ui';
import { ConfirmDialog, Dialog } from '@/components/dialog';
import { PageHeader, tableCls, Pill } from '../_shared';

interface Faq {
  id: number; question: string; answer: string; sortOrder: number; isActive: boolean;
}

interface FaqForm {
  id?: number; question: string; answer: string; sortOrder: number; isActive: boolean;
}

const emptyForm: FaqForm = { question: '', answer: '', sortOrder: 0, isActive: true };

export default function AdminFaqsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FaqForm | null>(null);
  const [deleting, setDeleting] = useState<Faq | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: async () => (await api<Faq[]>('/admin/faqs')).data,
  });
  const items = data || [];

  const save = useMutation({
    mutationFn: async (f: FaqForm) =>
      api(f.id ? `/admin/faqs/${f.id}` : '/admin/faqs', {
        method: f.id ? 'PATCH' : 'POST',
        body: { question: f.question, answer: f.answer, sortOrder: f.sortOrder, isActive: f.isActive },
      }),
    onSuccess: () => {
      toast.success('ذخیره شد');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['admin-faqs'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api(`/admin/faqs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('حذف شد');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-faqs'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="سوالات متداول (FAQ)"
        subtitle="پرسش‌های پرتکرار مشتریان — در صفحه عمومی /faq نمایش داده می‌شود"
        action={<Button size="sm" onClick={() => setForm({ ...emptyForm })}><Plus className="h-4 w-4" /> سوال جدید</Button>}
      />

      {isLoading ? <PageLoading /> : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={tableCls.th}>ترتیب</th>
                <th className={tableCls.th}>سوال</th>
                <th className={tableCls.th}>پاسخ</th>
                <th className={tableCls.th}>وضعیت</th>
                <th className={tableCls.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.id} className={tableCls.row}>
                  <td className={tableCls.td}><span className="text-2xs text-slate-400">{faNumber(f.sortOrder)}</span></td>
                  <td className={`${tableCls.td} max-w-64 font-bold`}><span className="line-clamp-2 text-xs">{f.question}</span></td>
                  <td className={`${tableCls.td} max-w-80`}><span className="line-clamp-2 text-2xs text-slate-500">{f.answer}</span></td>
                  <td className={tableCls.td}><Pill status={f.isActive ? 'active' : 'pending'} label={f.isActive ? 'فعال' : 'غیرفعال'} /></td>
                  <td className={`${tableCls.td} text-left`}>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setForm({ id: f.id, question: f.question, answer: f.answer, sortOrder: f.sortOrder, isActive: f.isActive })}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      ><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleting(f)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                  <HelpCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" /> هنوز سوالی ثبت نشده است
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.id ? 'ویرایش سوال' : 'سوال جدید'} size="lg">
        {form && (
          <div className="space-y-4">
            <Field label="سوال" required>
              <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            </Field>
            <Field label="پاسخ" required>
              <Textarea rows={5} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
            </Field>
            <Field label="ترتیب نمایش" hint="عدد کوچک‌تر = بالاتر">
              <Input dir="ltr" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} />
            </Field>
            <Switch label="فعال (نمایش در سایت)" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            <Button className="w-full" loading={save.isPending} disabled={!form.question.trim() || !form.answer.trim()} onClick={() => save.mutate(form)}>
              ذخیره
            </Button>
          </div>
        )}
      </Dialog>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting.id)} loading={remove.isPending} danger
        title="حذف سوال" message={`«${deleting?.question}» حذف شود؟`} />
    </div>
  );
}
