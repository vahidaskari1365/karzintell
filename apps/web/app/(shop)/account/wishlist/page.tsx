'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from '@/lib/auth-store';
import { Empty, PageLoading } from '@/components/ui';
import { ProductGrid } from '@/components/product-card';
import Link from 'next/link';

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => api<any[]>('/me/wishlist'),
  });

  const remove = useMutation({
    mutationFn: async (productId: number) => api(`/me/wishlist/${productId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('از علاقه‌مندی‌ها حذف شد');
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  if (isLoading) return <PageLoading />;
  const items = data?.data || [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">علاقه‌مندی‌ها</h1>
      {items.length === 0 && <Empty title="لیست علاقه‌مندی‌ها خالی است" action={<Link href="/search" className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">دیدن محصولات</Link>} />}
      <ProductGrid items={items} />
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((p: any) => (
            <button key={p.id} onClick={() => remove.mutate(p.id)} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs text-rose-500 hover:bg-rose-50">
              <Trash2 className="h-3.5 w-3.5" /> حذف «{p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name}»
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
