'use client';

/* ==========================================================================
   فرم محصول فروشنده (ایجاد / ویرایش) — نسخه‌ی ساده‌شده
   --------------------------------------------------------------------------
   برخلاف فرم پیچیده‌ی ادمین (چند-تنوعه)، این فرم یک محصول با یک تنوع
   پیش‌فرض می‌سازد که برای اکثر فروشندگان کافی است.
   فیلدها: نام، اسلاگ، توضیح کوتاه/کامل، دسته، برند، قیمت، قیمت قبل تخفیف،
   SKU، موجودی، وزن، گارانتی، ویژگی‌ها (chip)، وضعیت و تصاویر.
   ========================================================================== */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, Plus, Save, Trash2, X } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faNumber, rialToToman, tomanToRial, normalizeDigits } from '@/lib/format';
import { CategoryNode, PRODUCT_STATUS_LABELS } from '@/lib/types';
import { toast } from '@/lib/auth-store';
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { ConfirmDialog } from '@/components/dialog';
import { PageHeader, Pill, VendorImageUpload, VendorGuard, type SellerProduct } from '../_shared';

/* -------------------------------------------------------------------------- */
/* وضعیت فرم                                                                   */
/* -------------------------------------------------------------------------- */

export interface SellerProductFormState {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: number | 0;
  brandId: number | 0;
  status: string;
  // تنوع پیش‌فرض (قیمت/موجودی)
  priceToman: string;
  compareAtToman: string;
  sku: string;
  stockTotal: string;
  // مشخصات فیزیکی
  weightG: string;
  warrantyMonths: string;
  // ویژگی‌های کلیدی
  features: string[];
  featureInput: string;
  // تصاویر
  images: Array<{ path: string; alt: string; isPrimary: boolean }>;
  /** شناسه‌ی تنوع پیش‌فرض (در حالت ویرایش برای به‌روزرسانی تنوع موجود) */
  variantId?: number;
}

/** نوع تنوع پیش‌فرض که از جزئیات عمومی محصول واکشی می‌شود */
export interface ProductVariantLite {
  id: number;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  /** موجودی — ممکن است با کلید stock یا stockTotal در پاسخ بیاید */
  stock?: number;
  stockTotal?: number;
  weightG?: number | null;
  isDefault?: boolean;
}

export interface ProductImageLite {
  id: number;
  url: string | null;
  alt?: string | null;
  isPrimary: boolean;
}

export const emptyForm: SellerProductFormState = {
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  categoryId: 0,
  brandId: 0,
  status: 'draft',
  priceToman: '',
  compareAtToman: '',
  sku: '',
  stockTotal: '0',
  weightG: '',
  warrantyMonths: '',
  features: [],
  featureInput: '',
  images: [],
};

/** ساخت وضعیت اولیه‌ی فرم از روی داده‌ی محصول واکشی‌شده */
export function formFromProduct(p: SellerProduct, opts?: {
  variant?: ProductVariantLite | null;
  images?: Array<{ path: string; alt: string; isPrimary: boolean }>;
}): SellerProductFormState {
  const v = opts?.variant;
  const stockNum =
    v && (typeof v.stock === 'number' ? v.stock : typeof v.stockTotal === 'number' ? v.stockTotal : undefined);
  return {
    name: p.name || '',
    slug: p.slug || '',
    shortDescription: p.shortDescription || '',
    description: p.description || '',
    categoryId: p.categoryId || 0,
    brandId: p.brandId || 0,
    status: p.status || 'draft',
    priceToman: v ? String(rialToToman(v.price)) : (p.minPrice != null ? String(rialToToman(p.minPrice)) : ''),
    compareAtToman: v && v.compareAtPrice ? String(rialToToman(v.compareAtPrice)) : '',
    sku: v?.sku || '',
    stockTotal: stockNum != null ? String(stockNum) : '0',
    weightG: v?.weightG != null ? String(v.weightG) : p.weightG != null ? String(p.weightG) : '',
    warrantyMonths: p.warrantyMonths != null ? String(p.warrantyMonths) : '',
    features: p.features || [],
    featureInput: '',
    images: opts?.images || [],
    variantId: v?.id,
  };
}

/** تبدیل رشته‌ی ورودی به عدد (در صورت خالی → undefined) */
const num = (s: string): number | undefined => {
  const n = Number(normalizeDigits(s).replace(/[^0-9.]/g, ''));
  return s === '' || !Number.isFinite(n) ? undefined : n;
};

/* -------------------------------------------------------------------------- */
/* فرم اصلی                                                                     */
/* -------------------------------------------------------------------------- */

export function SellerProductForm({
  productId, initial,
}: {
  productId?: number;
  initial?: SellerProductFormState;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [s, setS] = useState<SellerProductFormState>(initial || emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof SellerProductFormState>(k: K, v: SellerProductFormState[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  // واکشی دسته‌بندی‌ها و برندها (عمومی)
  const { data: catTree } = useQuery({
    queryKey: ['categories-tree'],
    queryFn: async () => (await api<CategoryNode[]>('/categories')).data,
    staleTime: 300_000,
  });
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => (await api<Array<{ id: number; name: string }>>('/brands')).data,
    staleTime: 300_000,
  });

  /** فلات کردن درخت دسته‌بندی برای select (با تورفتگی) */
  const flatCats = useMemo(() => {
    const out: Array<{ id: number; name: string; depth: number }> = [];
    const walk = (nodes: CategoryNode[], depth: number) => {
      for (const n of nodes) {
        out.push({ id: n.id, name: n.name, depth });
        if (n.children?.length) walk(n.children, depth + 1);
      }
    };
    walk(catTree || [], 0);
    return out;
  }, [catTree]);

  /* --------------------------- ذخیره محصول --------------------------- */
  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: s.name.trim(),
        slug: s.slug.trim() || undefined,
        categoryId: s.categoryId || undefined,
        brandId: s.brandId || undefined,
        status: s.status,
        shortDescription: s.shortDescription || undefined,
        description: s.description || undefined,
        features: s.features,
        weightG: num(s.weightG),
        warrantyMonths: num(s.warrantyMonths),
        images: s.images
          .filter((i) => i.path)
          .map((i, idx) => ({
            path: i.path,
            alt: i.alt || undefined,
            sortOrder: idx,
            isPrimary: i.isPrimary,
          })),
        variants: [
          {
            ...(s.variantId ? { id: s.variantId } : {}),
            sku: s.sku.trim(),
            price: tomanToRial(Number(s.priceToman || 0)),
            compareAtPrice: s.compareAtToman ? tomanToRial(Number(s.compareAtToman)) : undefined,
            stock: Number(s.stockTotal || 0),
            weightG: num(s.weightG),
            isDefault: true,
            isActive: true,
            options: [],
          },
        ],
      };

      if (!payload.categoryId) throw new Error('دسته‌بندی را انتخاب کنید');
      if (!payload.name.trim()) throw new Error('نام محصول الزامی است');
      if (!payload.variants[0].sku) throw new Error('کد SKU الزامی است');
      if (!payload.variants[0].price) throw new Error('قیمت محصول الزامی است');

      // sellerId از طرف backend (بر اساس auth context) تنظیم می‌شود
      return productId
        ? api(`/products/${productId}`, { method: 'PATCH', body: payload })
        : api('/products', { method: 'POST', body: payload });
    },
    onSuccess: () => {
      toast.success(productId ? 'محصول به‌روزرسانی شد' : 'محصول ایجاد شد');
      qc.invalidateQueries({ queryKey: ['seller-products'] });
      qc.invalidateQueries({ queryKey: ['seller-dashboard'] });
      router.push('/vendor/products');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* --------------------------- حذف محصول --------------------------- */
  const remove = useMutation({
    mutationFn: async () => api(`/products/${productId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('محصول حذف شد');
      qc.invalidateQueries({ queryKey: ['seller-products'] });
      router.push('/vendor/products');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* --------------------------- ویژگی‌ها (chip) --------------------------- */
  const addFeature = () => {
    const v = s.featureInput.trim();
    if (!v) return;
    if (s.features.includes(v)) { set('featureInput', ''); return; }
    set('features', [...s.features, v]);
    set('featureInput', '');
  };
  const removeFeature = (idx: number) =>
    set('features', s.features.filter((_, i) => i !== idx));

  return (
    <div>
      <PageHeader
        title={productId ? 'ویرایش محصول' : 'محصول جدید'}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.push('/vendor/products')}>انصراف</Button>
            {productId && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> حذف
              </Button>
            )}
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              <Save className="h-4 w-4" /> ذخیره
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ستون اصلی */}
        <div className="space-y-4 lg:col-span-2">
          {/* اطلاعات اصلی */}
          <Card className="space-y-4 p-5">
            <p className="text-sm font-bold text-slate-100">اطلاعات اصلی</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="نام محصول" required>
                <Input
                  value={s.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="مثلاً: هدفون بی‌سیم مدل X"
                />
              </Field>
              <Field label="اسلاگ (اختیاری)" hint="خودکار ساخته می‌شود">
                <Input
                  dir="ltr"
                  value={s.slug}
                  onChange={(e) => set('slug', e.target.value.toLowerCase())}
                  placeholder="wireless-headphone-x"
                />
              </Field>
              <Field label="دسته‌بندی" required>
                <Select
                  value={s.categoryId || ''}
                  onChange={(e) => set('categoryId', Number(e.target.value) || 0)}
                >
                  <option value="">انتخاب کنید…</option>
                  {flatCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {'— '.repeat(c.depth)}{c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="برند">
                <Select
                  value={s.brandId || ''}
                  onChange={(e) => set('brandId', Number(e.target.value) || 0)}
                >
                  <option value="">بدون برند</option>
                  {(brands || []).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="توضیح کوتاه">
              <Textarea
                rows={2}
                value={s.shortDescription}
                onChange={(e) => set('shortDescription', e.target.value)}
                placeholder="خلاصه‌ای یک‌دو خطی از محصول…"
              />
            </Field>
            <Field label="توضیحات کامل" hint="HTML مجاز است">
              <Textarea
                rows={6}
                dir="rtl"
                value={s.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="<p>توضیحات کامل محصول…</p>"
              />
            </Field>
          </Card>

          {/* قیمت و موجودی */}
          <Card className="space-y-4 p-5">
            <p className="text-sm font-bold text-slate-100">قیمت و موجودی</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="قیمت (تومان)" required>
                <Input
                  inputMode="numeric"
                  value={s.priceToman}
                  onChange={(e) => set('priceToman', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="2500000"
                />
              </Field>
              <Field label="قیمت قبل از تخفیف (تومان)" hint="اختیاری — برای نشان‌دادن تخفیف">
                <Input
                  inputMode="numeric"
                  value={s.compareAtToman}
                  onChange={(e) => set('compareAtToman', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="3000000"
                />
              </Field>
              <Field label="کد SKU" required hint="کد یکتای تنوع محصول">
                <Input
                  dir="ltr"
                  value={s.sku}
                  onChange={(e) => set('sku', e.target.value)}
                  placeholder="WH-X-BLK"
                />
              </Field>
              <Field label="موجودی">
                <Input
                  inputMode="numeric"
                  value={s.stockTotal}
                  onChange={(e) => set('stockTotal', e.target.value.replace(/[^0-9]/g, ''))}
                />
              </Field>
            </div>
          </Card>

          {/* ویژگی‌های کلیدی (chip input) */}
          <Card className="space-y-3 p-5">
            <p className="text-sm font-bold text-slate-100">ویژگی‌های کلیدی</p>
            <p className="text-xs text-slate-400">هر ویژگی را بنویسید و Enter بزنید</p>
            <div className="flex gap-2">
              <Input
                value={s.featureInput}
                onChange={(e) => set('featureInput', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addFeature(); }
                }}
                placeholder="مثلاً: گارانتی ۱۸ ماهه"
              />
              <Button type="button" variant="secondary" onClick={addFeature}>
                <Plus className="h-4 w-4" /> افزودن
              </Button>
            </div>
            {s.features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {s.features.map((f, idx) => (
                  <motion.span
                    key={f + idx}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300"
                  >
                    {f}
                    <button
                      type="button"
                      onClick={() => removeFeature(idx)}
                      className="text-emerald-400 hover:text-rose-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.span>
                ))}
              </div>
            )}
          </Card>

          {/* تصاویر */}
          <Card className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-100">
                تصاویر محصول ({faNumber(s.images.length)})
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  set('images', [
                    ...s.images,
                    { path: '', alt: '', isPrimary: s.images.length === 0 },
                  ])
                }
              >
                <Plus className="h-4 w-4" /> افزودن تصویر
              </Button>
            </div>
            <div className="space-y-3">
              {s.images.map((img, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 p-3">
                  <div className="flex items-center gap-3">
                    <VendorImageUpload
                      value={img.path}
                      onChange={(p) =>
                        set('images', s.images.map((x, i) => (i === idx ? { ...x, path: p } : x)))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => set('images', s.images.filter((_, i) => i !== idx))}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Input
                      placeholder="متن alt (توضیح تصویر برای سئو)"
                      value={img.alt}
                      onChange={(e) =>
                        set('images', s.images.map((x, i) => (i === idx ? { ...x, alt: e.target.value } : x)))
                      }
                      className="text-xs"
                    />
                    <label className="flex shrink-0 items-center gap-1.5 text-2xs text-slate-400">
                      <input
                        type="radio"
                        name="primary-image"
                        checked={img.isPrimary}
                        onChange={() =>
                          set('images', s.images.map((x, i) => ({ ...x, isPrimary: i === idx })))
                        }
                        className="accent-emerald-500"
                      />
                      اصلی
                    </label>
                  </div>
                </div>
              ))}
              {s.images.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-8 text-center">
                  <ImagePlus className="h-7 w-7 text-slate-500" />
                  <p className="text-xs text-slate-400">هنوز تصویری اضافه نشده — اولین تصویر به‌صورت خودکار اصلی می‌شود</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ستون کناری */}
        <div className="space-y-4">
          {/* وضعیت انتشار */}
          <Card className="space-y-3 p-5">
            <p className="text-sm font-bold text-slate-100">وضعیت</p>
            <Select value={s.status} onChange={(e) => set('status', e.target.value)}>
              {Object.entries(PRODUCT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span className="text-2xs text-slate-400">پیش‌نمایش برچسب</span>
              <Pill status={s.status} label={PRODUCT_STATUS_LABELS[s.status] || s.status} />
            </div>
            <p className="text-2xs leading-5 text-slate-400">
              برای انتشار محصول، وضعیت را روی «منتشرشده» قرار دهید. پیش‌نویس‌ها در
              فروشگاه نمایش داده نمی‌شوند.
            </p>
          </Card>

          {/* مشخصات فیزیکی */}
          <Card className="space-y-3 p-5">
            <p className="text-sm font-bold text-slate-100">مشخصات ارسال</p>
            <Field label="وزن (گرم)">
              <Input
                inputMode="numeric"
                value={s.weightG}
                onChange={(e) => set('weightG', e.target.value)}
                placeholder="350"
              />
            </Field>
            <Field label="گارانتی (ماه)">
              <Input
                inputMode="numeric"
                value={s.warrantyMonths}
                onChange={(e) => set('warrantyMonths', e.target.value)}
                placeholder="18"
              />
            </Field>
          </Card>

          {/* راهنما */}
          <Card className="space-y-2 p-5">
            <p className="text-sm font-bold text-slate-100">نکات</p>
            <ul className="space-y-1.5 text-2xs leading-5 text-slate-400">
              <li>• نام و کد SKU باید یکتا باشند.</li>
              <li>• قیمت‌ها به تومان وارد می‌شوند.</li>
              <li>• دسته‌بندی برای نمایش در فروشگاه الزامی است.</li>
              <li>• اولین تصویر به‌عنوان تصویر اصلی درج می‌شود.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* مودال تأیید حذف */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
        title="حذف محصول"
        message={`«${s.name || 'این محصول'}» برای همیشه حذف می‌شود. مطمئن هستید؟`}
      />
    </div>
  );
}

/** صادرات کمکی برای صفحات new و [id] */
export { qs };
