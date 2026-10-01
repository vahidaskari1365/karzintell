'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ChevronDown, Plus, Save, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { rialToToman, tomanToRial } from '@/lib/format';
import { CategoryNode, PRODUCT_STATUS_LABELS } from '@/lib/types';
import { toast, hasPermission, useAuthStore } from '@/lib/auth-store';
import { Button, Card, Field, Input, Select, Textarea } from '@/components/ui';
import { ImageUpload } from '@/components/image-upload';
import { PageHeader } from '../_shared';

/* ------------------------------------------------------------------ */
/* انواع — ساختار اصلی برای سازگاری با API حفظ شده                       */
/* ------------------------------------------------------------------ */

export interface VariantForm {
  id?: number;
  sku: string;
  barcode: string;
  title: string;
  /** نمایش به تومان؛ هنگام ذخیره به ریال تبدیل می‌شود */
  priceToman: string;
  compareAtToman: string;
  costToman: string;
  stock: string;
  weightG: string;
  isDefault: boolean;
  isActive: boolean;
  options: Array<{ attributeId: number; attributeValueId: number }>;
}

interface ImageForm { path: string; alt: string; isPrimary: boolean }
interface VideoForm { title: string; provider: 'upload' | 'youtube' | 'aparat'; sourceUrl: string; posterPath: string }
interface SpecForm { attributeId: number; attributeValueId?: number; customValue?: string }

/** تمام فیلدها نگه داشته شده‌اند تا save همان ساختار payload را بسازد —
 *  فیلدهایی که در UI ساده‌شده نمایش داده نمی‌شوند با مقدار پیش‌فرض ارسال می‌گردند. */
export interface ProductFormState {
  name: string;
  slug: string;
  code: string;
  categoryId: number | 0;
  brandId: number | 0;
  status: string;
  shortDescription: string;
  description: string;
  features: string; // هر خط یک ویژگی
  weightG: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  warrantyMonths: string;
  metaTitle: string;
  metaDescription: string;
  /** ویدیوها به‌صورت متن ساده — هر خط یک URL (YouTube/Aparat) یا مسیر فایل آپلودشده */
  videosInput: string;
  tagsInput: string; // جداشده با ویرگول
  relatedProductIds: number[];
  images: ImageForm[];
  videos: VideoForm[];
  variants: VariantForm[];
  specs: SpecForm[];
}

/** state خالی برای ایجاد محصول جدید — تنها یک تنوع پیش‌فرض */
export const emptyState: ProductFormState = {
  name: '', slug: '', code: '', categoryId: 0, brandId: 0, status: 'draft',
  shortDescription: '', description: '', features: '',
  weightG: '', lengthCm: '', widthCm: '', heightCm: '', warrantyMonths: '',
  metaTitle: '', metaDescription: '', videosInput: '', tagsInput: '', relatedProductIds: [],
  images: [], videos: [], specs: [],
  variants: [{
    sku: '', barcode: '', title: '', priceToman: '', compareAtToman: '', costToman: '',
    stock: '0', weightG: '', isDefault: true, isActive: true, options: [],
  }],
};

/** تنوع خالی (برای سازگاری با کدهای احتمالی دیگر) */
export const blankVariant = (): VariantForm => ({
  sku: '', barcode: '', title: '', priceToman: '', compareAtToman: '', costToman: '',
  stock: '0', weightG: '', isDefault: false, isActive: true, options: [],
});

/** تبدیل URL کامل (محلی /uploads یا S3) به مسیر نسبی برای ویرایش در فرم */
export const pathFromUrl = (url?: string | null): string => {
  if (!url) return '';
  const bases: string[] = [];
  if (process.env.NEXT_PUBLIC_STORAGE_URL) bases.push(process.env.NEXT_PUBLIC_STORAGE_URL);
  if (typeof window !== 'undefined') bases.push(`${window.location.origin}/uploads`);
  bases.push('/uploads');
  for (const raw of bases) {
    const base = String(raw).replace(/\/+$/, '');
    if (url.startsWith(base + '/')) return url.slice(base.length + 1);
  }
  // حالت توسعه: Backend روی پورت/Origin دیگر است (مثلاً http://localhost:4000/uploads/...)
  const m = url.match(/^https?:\/\/[^/]+\/uploads\/(.+)$/);
  if (m) return m[1];
  return url;
};

const num = (s: string): number | undefined => {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return s === '' || !Number.isFinite(n) ? undefined : n;
};

/* ------------------------------------------------------------------ */
/* فرم ساده‌شده — تک‌صفحه‌ای با دو بخش                                     */
/* ------------------------------------------------------------------ */

export function ProductForm({ productId, initial }: { productId?: number; initial?: ProductFormState }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [s, setS] = useState<ProductFormState>(initial || emptyState);
  // بخش‌های «جزئیات محصول» و «سئو و متادیتا» به‌صورت پیش‌فرض جمع هستند
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);

  const set = <K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  // کوئری دسته‌ها و برندها (سازگار با فرم قبلی)
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

  /** دسته‌های صاف‌شده برای select (با تورفتگی) */
  const flatCats = useMemo(() => {
    const out: Array<{ id: number; name: string; depth: number; slug: string }> = [];
    const walk = (nodes: CategoryNode[], depth: number) => {
      for (const n of nodes) {
        out.push({ id: n.id, name: n.name, depth, slug: n.slug });
        if (n.children?.length) walk(n.children, depth + 1);
      }
    };
    walk(catTree || [], 0);
    return out;
  }, [catTree]);

  // گزینه‌های وضعیت — فقط پیش‌نویس / منتشر شده + وضعیت فعلی (در صورت غیرمعروف بودن)
  const statusOptions = useMemo(() => {
    const base: Array<{ value: string; label: string }> = [
      { value: 'draft', label: PRODUCT_STATUS_LABELS.draft },
      { value: 'published', label: PRODUCT_STATUS_LABELS.published },
    ];
    if (s.status && !['draft', 'published'].includes(s.status)) {
      base.push({ value: s.status, label: PRODUCT_STATUS_LABELS[s.status] || s.status });
    }
    return base;
  }, [s.status]);

  // تنوع پیش‌فرض — تنها تنوعی که در فرم ساده مدیریت می‌شود
  const defaultVariantIdx = s.variants.findIndex((v) => v.isDefault);
  const dvIdx = defaultVariantIdx === -1 ? 0 : defaultVariantIdx;
  const defaultVariant = s.variants[dvIdx];
  const updateDefaultVariant = (patch: Partial<VariantForm>) =>
    set('variants', s.variants.map((v, i) => (i === dvIdx ? { ...v, ...patch } : v)));

  // مقدار «کد محصول/SKU» هم به code و هم به sku تنوع پیش‌فرض ست می‌شود
  const setCodeAndSku = (val: string) => {
    setS((p) => {
      const idx = p.variants.findIndex((v) => v.isDefault);
      const i = idx === -1 ? 0 : idx;
      return {
        ...p,
        code: val,
        variants: p.variants.map((v, k) => (k === i ? { ...v, sku: val } : v)),
      };
    });
  };

  // تصویر اصلی = اولین عضو images (که با isPrimary=true علامت‌گذاری می‌شود)
  const primaryImage = s.images[0]?.path || '';
  const setPrimaryImage = (path: string) => {
    setS((p) => {
      if (p.images.length === 0) {
        return { ...p, images: [{ path, alt: '', isPrimary: true }] };
      }
      return { ...p, images: p.images.map((img, i) => (i === 0 ? { ...img, path, isPrimary: true } : { ...img, isPrimary: false })) };
    });
  };

  // تصاویر بیشتر = همه تصاویر به‌جز اولی
  const extraImages = s.images.slice(1);
  const addExtraImage = () =>
    set('images', [...s.images, { path: '', alt: '', isPrimary: false }]);
  const updateExtraImage = (idx: number, path: string) =>
    set('images', s.images.map((img, i) => (i === idx + 1 ? { ...img, path } : img)));
  const removeExtraImage = (idx: number) =>
    set('images', s.images.filter((_, i) => i !== idx + 1));

  // ذخیره — همان endpoint و همان ساختار payload فرم قبلی
  const save = useMutation({
    mutationFn: async () => {
      // اگر کد/SKU خالی بود، یک SKU پیش‌فرض تولید کن تا اعتبارسنجی backend رد نشود
      const skuVal = (defaultVariant.sku || '').trim();
      const finalSku = skuVal || `prod-${Date.now()}`;

      const payload = {
        name: s.name.trim(),
        slug: s.slug.trim() || undefined,
        code: s.code.trim() || undefined,
        categoryId: s.categoryId || undefined,
        brandId: s.brandId || undefined,
        status: s.status,
        shortDescription: s.shortDescription || undefined,
        description: s.description || undefined,
        features: s.features.split('\n').map((f) => f.trim()).filter(Boolean),
        weightG: num(s.weightG),
        lengthCm: num(s.lengthCm), widthCm: num(s.widthCm), heightCm: num(s.heightCm),
        warrantyMonths: num(s.warrantyMonths),
        metaTitle: s.metaTitle || undefined,
        metaDescription: s.metaDescription || undefined,
        tags: s.tagsInput.split(/[,،]/).map((t) => t.trim()).filter(Boolean),
        relatedProductIds: s.relatedProductIds,
        // اولین تصویر معتبر به‌عنوان تصویر اصلی در نظر گرفته می‌شود
        images: s.images
          .filter((i) => i.path)
          .map((i, idx) => ({ path: i.path, alt: i.alt || undefined, sortOrder: idx, isPrimary: idx === 0 })),
        // ویدیوها از فیلد متنی ساده (هر خط یک URL) ساخته می‌شوند.
        // Provider بر اساس دامنه URL تشخیص داده می‌شود؛ در غیر این صورت upload فرض می‌شود.
        videos: s.videosInput
          .split('\n')
          .map((u) => u.trim())
          .filter(Boolean)
          .map((url, idx) => {
            const isYouTube = /youtube\.com|youtu\.be/i.test(url);
            const isAparat = /aparat\.com/i.test(url);
            const provider: 'youtube' | 'aparat' | 'upload' =
              isYouTube ? 'youtube' : isAparat ? 'aparat' : 'upload';
            return {
              title: undefined,
              provider,
              sourceUrl: url,
              posterPath: undefined,
              sortOrder: idx,
            };
          }),
        specs: s.specs.filter((sp) => sp.attributeId),
        // فقط تنوع پیش‌فرض را با مقادیر فیلدهای ساده‌شده ذخیره کن
        variants: [{
          id: defaultVariant.id,
          sku: finalSku,
          barcode: defaultVariant.barcode || undefined,
          title: defaultVariant.title || undefined,
          price: tomanToRial(Number(defaultVariant.priceToman || 0)),
          compareAtPrice: defaultVariant.compareAtToman ? tomanToRial(Number(defaultVariant.compareAtToman)) : undefined,
          costPrice: defaultVariant.costToman ? tomanToRial(Number(defaultVariant.costToman)) : undefined,
          stock: Number(defaultVariant.stock || 0),
          weightG: num(defaultVariant.weightG),
          isDefault: true,
          isActive: true,
          options: defaultVariant.options,
        }],
      };
      if (!payload.name.trim()) throw new Error('نام محصول الزامی است');
      if (!payload.categoryId) throw new Error('دسته‌بندی را انتخاب کنید');
      if (!payload.variants[0].price || payload.variants[0].price <= 0) {
        throw new Error('قیمت را وارد کنید');
      }
      return productId
        ? api(`/admin/products/${productId}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : api('/admin/products', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(productId ? 'محصول به‌روزرسانی شد' : 'محصول ایجاد شد');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      router.push('/admin/products');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title={productId ? 'ویرایش محصول' : 'محصول جدید'} />

      {/* ----------------------- بخش ۱: اطلاعات اصلی ----------------------- */}
      <Card className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-600 dark:text-emerald-300">۱</span>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">اطلاعات اصلی</h2>
          <span className="text-xs text-rose-500 dark:text-rose-400">*</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نام محصول" required>
            <Input
              value={s.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="مثلاً: گوشی سامسونگ گلکسی S25"
            />
          </Field>
          <Field label="کد محصول / SKU">
            <Input
              dir="ltr"
              value={s.code}
              onChange={(e) => setCodeAndSku(e.target.value)}
              placeholder="P-1001 (اختیاری — خودکار ساخته می‌شود)"
            />
          </Field>
          <Field label="دسته‌بندی" required>
            <Select value={s.categoryId || ''} onChange={(e) => set('categoryId', Number(e.target.value) || 0)}>
              <option value="">انتخاب کنید…</option>
              {flatCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {'— '.repeat(c.depth)}
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="برند">
            <Select value={s.brandId || ''} onChange={(e) => set('brandId', Number(e.target.value) || 0)}>
              <option value="">بدون برند</option>
              {(brands || []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        {/* قیمت / قیمت قبل تخفیف / موجودی — شبکه‌ای ۳‌ستونه روی دسکتاپ */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="قیمت (تومان)" required>
            <Input
              inputMode="numeric"
              dir="ltr"
              value={defaultVariant.priceToman}
              onChange={(e) => updateDefaultVariant({ priceToman: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="0"
            />
          </Field>
          <Field
            label="قیمت قبل تخفیف (تومان)"
            hint="قیمت قبل از تخفیف — برای نمایش درصد تخفیف"
          >
            <Input
              inputMode="numeric"
              dir="ltr"
              value={defaultVariant.compareAtToman}
              onChange={(e) => updateDefaultVariant({ compareAtToman: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="0 (اختیاری)"
            />
          </Field>
          <Field label="موجودی">
            <Input
              inputMode="numeric"
              dir="ltr"
              value={defaultVariant.stock}
              onChange={(e) => updateDefaultVariant({ stock: e.target.value.replace(/[^0-9]/g, '') || '0' })}
              placeholder="0"
            />
          </Field>
        </div>

        {/* تصویر اصلی — آپلود تک‌تکی */}
        <Field label="تصویر اصلی">
          <ImageUpload value={primaryImage} onChange={setPrimaryImage} />
        </Field>

        <Field label="توضیحات کوتاه">
          <Textarea
            rows={2}
            value={s.shortDescription}
            onChange={(e) => set('shortDescription', e.target.value)}
            placeholder="معرفی کوتاه محصول که در کارت محصول نمایش داده می‌شود"
          />
        </Field>

        <Field label="وضعیت">
          <Select
            value={s.status}
            onChange={(e) => set('status', e.target.value)}
            disabled={!hasPermission(user, 'products.publish') && s.status !== 'published'}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
      </Card>

      {/* ----------------------- بخش ۲: جزئیات محصول ----------------------- */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-slate-800/40"
          aria-expanded={detailsOpen}
        >
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">۲</span>
            جزئیات محصول (اختیاری)
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform dark:text-slate-300 ${detailsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {detailsOpen && (
          <Card className="mt-3 space-y-5 p-5 sm:p-6">
            <Field label="توضیحات کامل (HTML مجاز)">
              <Textarea
                rows={6}
                dir="rtl"
                value={s.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="<p>توضیحات کامل محصول…</p>"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="مدت گارانتی (ماه)">
                <Input
                  inputMode="numeric"
                  dir="ltr"
                  value={s.warrantyMonths}
                  onChange={(e) => set('warrantyMonths', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="مثلاً ۱۸"
                />
              </Field>
              <Field label="وزن (گرم)">
                <Input
                  inputMode="numeric"
                  dir="ltr"
                  value={s.weightG}
                  onChange={(e) => set('weightG', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="مثلاً 450"
                />
              </Field>
              <Field label="طول (سانتی‌متر)">
                <Input
                  inputMode="numeric"
                  dir="ltr"
                  value={s.lengthCm}
                  onChange={(e) => set('lengthCm', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="مثلاً 15"
                />
              </Field>
              <Field label="عرض (سانتی‌متر)">
                <Input
                  inputMode="numeric"
                  dir="ltr"
                  value={s.widthCm}
                  onChange={(e) => set('widthCm', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="مثلاً 7"
                />
              </Field>
              <Field label="ارتفاع (سانتی‌متر)">
                <Input
                  inputMode="numeric"
                  dir="ltr"
                  value={s.heightCm}
                  onChange={(e) => set('heightCm', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="مثلاً 1"
                />
              </Field>
            </div>

            <Field label="تگ‌ها / ویژگی‌ها (هر خط یک مورد)" hint="در بخش ویژگی‌های صفحه محصول نمایش داده می‌شود">
              <Textarea
                rows={4}
                value={s.features}
                onChange={(e) => set('features', e.target.value)}
                placeholder={'گارانتی ۱۸ ماهه\nارسال سریع\nاصالت کالا'}
              />
            </Field>

            {/* تصاویر بیشتر — آپلود چندتایی (اختیاری) */}
            <Field label="تصاویر بیشتر">
              <div className="space-y-2">
                {extraImages.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                    <ImageUpload
                      value={img.path}
                      onChange={(p) => updateExtraImage(idx, p)}
                    />
                    <button
                      type="button"
                      onClick={() => removeExtraImage(idx)}
                      className="p-1.5 text-slate-700 hover:text-rose-500 dark:text-slate-200"
                      aria-label="حذف تصویر"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addExtraImage}>
                  <Plus className="h-4 w-4" /> افزودن تصویر
                </Button>
              </div>
            </Field>
          </Card>
        )}
      </div>

      {/* ----------------------- بخش ۳: سئو و متادیتا ----------------------- */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setSeoOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100 dark:hover:bg-slate-800/40"
          aria-expanded={seoOpen}
        >
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">۳</span>
            سئو و متادیتا (اختیاری)
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform dark:text-slate-300 ${seoOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {seoOpen && (
          <Card className="mt-3 space-y-5 p-5 sm:p-6">
            <Field label="عنوان سئو" hint="اختیاری — در صورت خالی بودن، نام محصول استفاده می‌شود">
              <Input
                dir="rtl"
                value={s.metaTitle}
                onChange={(e) => set('metaTitle', e.target.value)}
                placeholder="عنوان برای موتورهای جستجو"
              />
            </Field>

            <Field label="توضیحات سئو" hint="اختیاری — توضیح کوتاه برای موتورهای جستجو (تا ۱۶۰ کاراکتر)">
              <Textarea
                rows={3}
                dir="rtl"
                value={s.metaDescription}
                onChange={(e) => set('metaDescription', e.target.value)}
                placeholder="توضیح متا برای موتورهای جستجو"
              />
            </Field>

            <Field
              label="ویدیوها"
              hint="هر خط یک URL از YouTube یا Aparat (یا مسیر فایل آپلودشده)"
            >
              <Textarea
                rows={4}
                dir="ltr"
                value={s.videosInput}
                onChange={(e) => set('videosInput', e.target.value)}
                placeholder={'https://www.youtube.com/watch?v=...\nhttps://www.aparat.com/v/...'}
              />
            </Field>
          </Card>
        )}
      </div>

      {/* دکمه ذخیره — استیکی در پایین صفحه */}
      <div className="sticky bottom-4 mt-6">
        <Button
          className="w-full shadow-lg"
          size="lg"
          onClick={() => save.mutate()}
          loading={save.isPending}
        >
          <Save className="h-5 w-5" />
          {productId ? 'ذخیره تغییرات' : 'ایجاد محصول'}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* تبدیل محصول موجود (خروجی assemble ادمین) به state فرم                  */
/* تمام فیلدها نگه داشته شده‌اند تا ویرایش محصولات قدیمی بدون از دست دادن  */
/* داده‌ها (ویدئوها، specs، تنوع‌های بیشتر، تگ‌ها و …) کار کند.            */
/* ------------------------------------------------------------------ */
export function stateFromApi(p: any): ProductFormState {
  return {
    name: p.name || '',
    slug: p.slug || '',
    code: p.code || '',
    categoryId: p.category?.id || 0,
    brandId: p.brand?.id || 0,
    status: p.status || 'draft',
    shortDescription: p.shortDescription || '',
    description: p.description || '',
    features: (p.features || []).join('\n'),
    weightG: p.weightG != null ? String(p.weightG) : '',
    lengthCm: p.dimensions?.length != null ? String(p.dimensions.length) : '',
    widthCm: p.dimensions?.width != null ? String(p.dimensions.width) : '',
    heightCm: p.dimensions?.height != null ? String(p.dimensions.height) : '',
    warrantyMonths: p.warrantyMonths != null ? String(p.warrantyMonths) : '',
    metaTitle: p.metaTitle || '',
    metaDescription: p.metaDescription || '',
    // ویدیوها به‌صورت متن ساده برای ویرایش — هر خط یک URL
    videosInput: (p.videos || [])
      .map((v: any) => (v.provider === 'upload' ? pathFromUrl(v.url) : v.url || ''))
      .filter(Boolean)
      .join('\n'),
    tagsInput: (p.tags || []).map((t: any) => t.name).join('، '),
    relatedProductIds: (p.related || []).map((r: any) => r.id),
    images: (p.images || []).map((i: any) => ({ path: pathFromUrl(i.url), alt: i.alt || '', isPrimary: !!i.isPrimary })),
    videos: (p.videos || []).map((v: any) => ({
      title: v.title || '', provider: v.provider || 'upload',
      sourceUrl: v.provider === 'upload' ? pathFromUrl(v.url) : v.url || '',
      posterPath: pathFromUrl(v.poster),
    })),
    specs: (p.specsRaw || []) as SpecForm[],
    variants: (p.variants || []).map((v: any) => ({
      id: v.id,
      sku: v.sku || '', barcode: v.barcode || '', title: v.title || '',
      priceToman: v.price != null ? String(rialToToman(v.price)) : '',
      compareAtToman: v.compareAtPrice != null ? String(rialToToman(v.compareAtPrice)) : '',
      costToman: v.costPrice != null ? String(rialToToman(v.costPrice)) : '',
      stock: v.stock != null ? String(v.stock) : '0',
      weightG: v.weightG != null ? String(v.weightG) : '',
      isDefault: !!v.isDefault, isActive: !!v.isActive,
      options: (v.options || []).map((o: any) => ({ attributeId: o.attributeId, attributeValueId: o.attributeValueId })),
    })),
  };
}
