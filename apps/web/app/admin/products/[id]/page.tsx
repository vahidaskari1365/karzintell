'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { api } from '@/lib/api-client';
import { PageLoading } from '@/components/ui';
import { ProductForm, stateFromApi } from '../_form';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => (await api<any>(`/admin/products/${id}`)).data,
  });

  if (isLoading || !data) return <PageLoading />;
  return <ProductForm productId={Number(id)} initial={stateFromApi(data)} />;
}
