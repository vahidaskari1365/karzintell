'use client';

/* صفحه‌ی ایجاد محصول جدید — فرم خالی */

import { VendorGuard } from '../../_shared';
import { SellerProductForm } from '../_form';

export default function NewVendorProductPage() {
  return (
    <VendorGuard>
      <SellerProductForm />
    </VendorGuard>
  );
}
