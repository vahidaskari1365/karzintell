'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { GripVertical, Plus, Save, Trash2, X } from 'lucide-react';
import { api, qs } from '@/lib/api-client';
import { faNumber, rialToToman, tomanToRial } from '@/lib/format';
import { CategoryNode, PRODUCT_STATUS_LABELS } from '@/lib/types';
import { toast, hasPermission, useAuthStore } from '@/lib/auth-store';
import { Button, Card, Field, Input, Select, Tabs, Textarea, Switch } from '@/components/ui';
import { ImageUpload } from '@/components/image-upload';
import { PageHeader } from '../_shared';

/* ------------------------------------------------------------------ */
/* انواع                                                                */
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
  tagsInput: string; // جداشده با ویرگول
  relatedProductIds: number[];
  images: ImageForm[];
  videos: VideoForm[];
  variants: VariantForm[];
  specs: SpecForm[];
}

export const emptyState: ProductFormState = {
  name: '', slug: '', code: '', categoryId: 0, brandId: 0, status: 'draft',
  shortDescription: '', description: '', features: '',
  weightG: '', lengthCm: '', widthCm: '', heightCm: '', warrantyMonths: '',
  metaTitle: '', metaDescription: '', tagsInput: '', relatedProductIds: [],
  images: [], videos: [], specs: [],
  variants: [{
    sku: '', barcode: '', title: '', priceToman: '', compareAtToman: '', costToman: '',
    stock: '0', weightG: '', isDefault: true, isActive: true, options: [],
  }],
};

export const blankVariant = (): VariantForm => ({
  sku: '', barcode: '', title: '', priceToman: '', compareAtToman: '', costToman: '',
  stock: '0', weightG: '', isDefault: false, isActive: true, options: [],
});

interface AttrLite {
  id: number; name: string; code: string; type: string; unit: string | null;
  values?: Array<{ id: number; value: string }>;
}

const num = (s: string): number | undefined => {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return s === '' || !Number.isFinite(n) ? undefined : n;
};

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

/* ------------------------------------------------------------------ */
/* فرم اصلی                                                             */
/* ------------------------------------------------------------------ */

export function ProductForm({ productId, initial }: { productId?: number; initial?: ProductFormState }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState('general');
  const [s, setS] = useState<ProductFormState>(initial || emptyState);
  const set = <K extends keyof ProductFormState>(k: K, v: ProductFormState[K]) => setS((p) => ({ ...p, [k]: v }));

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
  const { data: allAttrs } = useQuery({
    queryKey: ['admin-attributes'],
    queryFn: async () => (await api<AttrLite[]>('/admin/attributes')).data,
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

  const selectedCatSlug = flatCats.find((c) => c.id === s.categoryId)?.slug;

  /** ویژگی‌های دسته انتخابی (از endpoint عمومی دسته) */
  const { data: catFilters } = useQuery({
    queryKey: ['category-filters', selectedCatSlug],
    queryFn: async () =>
      (await api<{ filters: Array<{ id: number; name: string; code: string; type: string; isVariant: boolean; values: Array<{ id: number; value: string }> }> }>(`/categories/${selectedCatSlug}`)).data.filters,
    enabled: !!selectedCatSlug,
  });
  const variantAttrs = (catFilters || []).filter((a) => a.isVariant);

  /* جستجوی محصول مرتبط */
  const [relQ, setRelQ] = useState('');
  const { data: relResults } = useQuery({
    queryKey: ['related-search', relQ],
    queryFn: async () =>
      (await api<{ items: Array<{ id: number; name: string }> }>(`/admin/products${qs({ q: relQ, limit: 6 })}`)).data.items,
    enabled: relQ.trim().length >= 2,
  });

  const save = useMutation({
    mutationFn: async () => {
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
        images: s.images.filter((i) => i.path).map((i, idx) => ({ path: i.path, alt: i.alt || undefined, sortOrder: idx, isPrimary: i.isPrimary })),
        videos: s.videos.filter((v) => v.sourceUrl).map((v, idx) => ({
          title: v.title || undefined, provider: v.provider, sourceUrl: v.sourceUrl,
          posterPath: v.posterPath || undefined, sortOrder: idx,
        })),
        specs: s.specs.filter((sp) => sp.attributeId),
        variants: s.variants.map((v) => ({
          id: v.id,
          sku: v.sku.trim(),
          barcode: v.barcode || undefined,
          title: v.title || undefined,
          price: tomanToRial(Number(v.priceToman || 0)),
          compareAtPrice: v.compareAtToman ? tomanToRial(Number(v.compareAtToman)) : undefined,
          costPrice: v.costToman ? tomanToRial(Number(v.costToman)) : undefined,
          stock: Number(v.stock || 0),
          weightG: num(v.weightG),
          isDefault: v.isDefault,
          isActive: v.isActive,
          options: v.options,
        })),
      };
      if (!payload.categoryId) throw new Error('دسته‌بندی را انتخاب کنید');
      if (!payload.variants.length || payload.variants.some((v) => !v.sku || !v.price)) {
        throw new Error('برای هر تنوع، SKU و قیمت الزامی است');
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

  const updateVariant = (idx: number, patch: Partial<VariantForm>) =>
    set('variants', s.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)));

  return (
    <div>
      <PageHeader
        title={productId ? 'ویرایش محصول' : 'محصول جدید'}
        action={
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            <Save className="h-4 w-4" /> ذخیره محصول
          </Button>
        }
      />

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'general', label: 'اطلاعات اصلی' },
          { key: 'media', label: `تصاویر و ویدئو (${s.images.length + s.videos.length})` },
          { key: 'variants', label: `تنوع‌ها و قیمت (${s.variants.length})` },
          { key: 'specs', label: `مشخصات فنی (${s.specs.length})` },
          { key: 'seo', label: 'سئو، تگ و مرتبط' },
        ]}
      />

      <div className="mt-5">
        {/* ------------------------------ عمومی ------------------------------ */}
        {tab === 'general' && (
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="نام محصول" required>
                <Input value={s.name} onChange={(e) => set('name', e.target.value)} placeholder="مثلاً: گوشی سامسونگ گلکسی S25" />
              </Field>
              <Field label="اسلاگ (اختیاری — خودکار ساخته می‌شود)">
                <Input dir="ltr" value={s.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} placeholder="galaxy-s25" />
              </Field>
              <Field label="کد محصول">
                <Input dir="ltr" value={s.code} onChange={(e) => set('code', e.target.value)} placeholder="P-1001" />
              </Field>
              <Field label="وضعیت انتشار">
                <Select value={s.status} onChange={(e) => set('status', e.target.value)} disabled={!hasPermission(user, 'products.publish') && s.status !== 'published'}>
                  {Object.entries(PRODUCT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="دسته‌بندی" required>
                <Select value={s.categoryId || ''} onChange={(e) => set('categoryId', Number(e.target.value) || 0)}>
                  <option value="">انتخاب کنید…</option>
                  {flatCats.map((c) => (
                    <option key={c.id} value={c.id}>{'— '.repeat(c.depth)}{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="برند">
                <Select value={s.brandId || ''} onChange={(e) => set('brandId', Number(e.target.value) || 0)}>
                  <option value="">بدون برند</option>
                  {(brands || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="توضیح کوتاه">
              <Textarea rows={2} value={s.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} />
            </Field>
            <Field label="توضیحات کامل (HTML مجاز)">
              <Textarea rows={8} dir="rtl" value={s.description} onChange={(e) => set('description', e.target.value)} placeholder="<p>توضیحات کامل محصول…</p>" />
            </Field>
            <Field label="ویژگی‌های کلیدی (هر خط یک مورد)" hint="در کارت ویژگی‌های صفحه محصول نمایش داده می‌شود">
              <Textarea rows={4} value={s.features} onChange={(e) => set('features', e.target.value)} placeholder={'گارانتی ۱۸ ماهه\nارسال سریع\nاصالت کالا'} />
            </Field>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Field label="وزن (گرم)"><Input inputMode="numeric" value={s.weightG} onChange={(e) => set('weightG', e.target.value)} /></Field>
              <Field label="طول (cm)"><Input inputMode="decimal" value={s.lengthCm} onChange={(e) => set('lengthCm', e.target.value)} /></Field>
              <Field label="عرض (cm)"><Input inputMode="decimal" value={s.widthCm} onChange={(e) => set('widthCm', e.target.value)} /></Field>
              <Field label="ارتفاع (cm)"><Input inputMode="decimal" value={s.heightCm} onChange={(e) => set('heightCm', e.target.value)} /></Field>
              <Field label="گارانتی (ماه)"><Input inputMode="numeric" value={s.warrantyMonths} onChange={(e) => set('warrantyMonths', e.target.value)} /></Field>
            </div>
          </Card>
        )}

        {/* ------------------------------ رسانه ------------------------------ */}
        {tab === 'media' && (
          <Card className="space-y-5 p-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">تصاویر ({faNumber(s.images.length)})</p>
                <Button size="sm" variant="secondary" onClick={() => set('images', [...s.images, { path: '', alt: '', isPrimary: s.images.length === 0 }])}>
                  <Plus className="h-4 w-4" /> افزودن تصویر
                </Button>
              </div>
              <div className="space-y-2">
                {s.images.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2">
                    <GripVertical className="h-4 w-4 text-slate-300" />
                    <ImageUpload value={img.path} onChange={(p) => set('images', s.images.map((x, i) => (i === idx ? { ...x, path: p } : x)))} />
                    <Input placeholder="متن alt (سئو)" value={img.alt} onChange={(e) => set('images', s.images.map((x, i) => (i === idx ? { ...x, alt: e.target.value } : x)))} className="text-xs" />
                    <label className="flex shrink-0 items-center gap-1.5 text-2xs text-slate-500">
                      <input
                        type="radio"
                        name="primary-image"
                        checked={img.isPrimary}
                        onChange={() => set('images', s.images.map((x, i) => ({ ...x, isPrimary: i === idx })))}
                        className="accent-orange-500"
                      />
                      اصلی
                    </label>
                    <button onClick={() => set('images', s.images.filter((_, i) => i !== idx))} className="p-1.5 text-slate-300 hover:text-rose-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {s.images.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">تصویری اضافه نشده — اولین تصویر، تصویر اصلی می‌شود</p>}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">ویدئوها ({faNumber(s.videos.length)})</p>
                <Button size="sm" variant="secondary" onClick={() => set('videos', [...s.videos, { title: '', provider: 'upload', sourceUrl: '', posterPath: '' }])}>
                  <Plus className="h-4 w-4" /> افزودن ویدئو
                </Button>
              </div>
              <div className="space-y-3">
                {s.videos.map((v, idx) => (
                  <div key={idx} className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-[1fr_140px_2fr_auto]">
                    <Input placeholder="عنوان ویدئو" value={v.title} onChange={(e) => set('videos', s.videos.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))} />
                    <Select value={v.provider} onChange={(e) => set('videos', s.videos.map((x, i) => (i === idx ? { ...x, provider: e.target.value as VideoForm['provider'] } : x)))}>
                      <option value="upload">آپلود</option>
                      <option value="youtube">یوتیوب</option>
                      <option value="aparat">آپارات</option>
                    </Select>
                    {v.provider === 'upload' ? (
                      <div className="flex items-center gap-2">
                        <ImageUpload kind="video" value={v.sourceUrl} onChange={(p) => set('videos', s.videos.map((x, i) => (i === idx ? { ...x, sourceUrl: p } : x)))} />
                        <Input dir="ltr" placeholder="یا مسیر فایل" value={v.sourceUrl} onChange={(e) => set('videos', s.videos.map((x, i) => (i === idx ? { ...x, sourceUrl: e.target.value } : x)))} className="text-xs" />
                      </div>
                    ) : (
                      <Input dir="ltr" placeholder="https://…" value={v.sourceUrl} onChange={(e) => set('videos', s.videos.map((x, i) => (i === idx ? { ...x, sourceUrl: e.target.value } : x)))} />
                    )}
                    <button onClick={() => set('videos', s.videos.filter((_, i) => i !== idx))} className="self-center p-1.5 text-slate-300 hover:text-rose-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* ------------------------------ تنوع‌ها ------------------------------ */}
        {tab === 'variants' && (
          <div className="space-y-4">
            {variantAttrs.length > 0 && (
              <p className="rounded-xl bg-sky-50 px-4 py-2.5 text-xs text-sky-700">
                ویژگی‌های سازنده تنوع برای این دسته: {variantAttrs.map((a) => a.name).join('، ')} — برای هر تنوع مقدارشان را انتخاب کنید.
              </p>
            )}
            {s.variants.map((v, idx) => (
              <Card key={idx} className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-700">تنوع {faNumber(idx + 1)} {v.isDefault && <span className="ms-1 rounded bg-emerald-50 px-1.5 py-0.5 text-2xs text-emerald-600">پیش‌فرض</span>}</p>
                  <div className="flex items-center gap-3">
                    <Switch label="فعال" checked={v.isActive} onChange={(b) => updateVariant(idx, { isActive: b })} />
                    {s.variants.length > 1 && (
                      <button onClick={() => set('variants', s.variants.filter((_, i) => i !== idx))} className="p-1.5 text-slate-300 hover:text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Field label="SKU" required><Input dir="ltr" value={v.sku} onChange={(e) => updateVariant(idx, { sku: e.target.value })} placeholder="S25-BLK-128" /></Field>
                  <Field label="بارکد"><Input dir="ltr" value={v.barcode} onChange={(e) => updateVariant(idx, { barcode: e.target.value })} /></Field>
                  <Field label="عنوان"><Input value={v.title} onChange={(e) => updateVariant(idx, { title: e.target.value })} placeholder="مشکی / ۱۲۸ گیگ" /></Field>
                  <Field label="قیمت (تومان)" required><Input inputMode="numeric" value={v.priceToman} onChange={(e) => updateVariant(idx, { priceToman: e.target.value.replace(/[^0-9]/g, '') })} /></Field>
                  <Field label="قیمت قبل از تخفیف"><Input inputMode="numeric" value={v.compareAtToman} onChange={(e) => updateVariant(idx, { compareAtToman: e.target.value.replace(/[^0-9]/g, '') })} /></Field>
                  <Field label="موجودی"><Input inputMode="numeric" value={v.stock} onChange={(e) => updateVariant(idx, { stock: e.target.value.replace(/[^0-9]/g, '') })} /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="قیمت تمام‌شده (تومان)"><Input inputMode="numeric" value={v.costToman} onChange={(e) => updateVariant(idx, { costToman: e.target.value.replace(/[^0-9]/g, '') })} /></Field>
                  <Field label="وزن تنوع (گرم)"><Input inputMode="numeric" value={v.weightG} onChange={(e) => updateVariant(idx, { weightG: e.target.value.replace(/[^0-9]/g, '') })} /></Field>
                  <Field label="تنوع پیش‌فرض">
                    <label className="flex h-11 items-center gap-2 text-sm text-slate-600">
                      <input
                        type="radio" name="default-variant" checked={v.isDefault}
                        onChange={() => set('variants', s.variants.map((x, i) => ({ ...x, isDefault: i === idx })))}
                        className="accent-orange-500"
                      />
                      پیش‌فرض فروشگاه
                    </label>
                  </Field>
                </div>
                {variantAttrs.length > 0 && (
                  <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
                    {variantAttrs.map((attr) => {
                      const opt = v.options.find((o) => o.attributeId === attr.id);
                      return (
                        <Field key={attr.id} label={attr.name}>
                          <Select
                            value={opt?.attributeValueId || ''}
                            onChange={(e) => {
                              const valId = Number(e.target.value) || 0;
                              const rest = v.options.filter((o) => o.attributeId !== attr.id);
                              updateVariant(idx, { options: valId ? [...rest, { attributeId: attr.id, attributeValueId: valId }] : rest });
                            }}
                          >
                            <option value="">انتخاب…</option>
                            {(attr.values || []).map((val) => <option key={val.id} value={val.id}>{val.value}</option>)}
                          </Select>
                        </Field>
                      );
                    })}
                  </div>
                )}
              </Card>
            ))}
            <Button variant="secondary" onClick={() => set('variants', [...s.variants, blankVariant()])}>
              <Plus className="h-4 w-4" /> افزودن تنوع
            </Button>
          </div>
        )}

        {/* ------------------------------ مشخصات ------------------------------ */}
        {tab === 'specs' && (
          <Card className="space-y-3 p-5">
            <p className="text-xs text-slate-400">مشخصات فنی محصول — در تب «مشخصات» صفحه محصول به‌صورت گروه‌بندی‌شده نمایش داده می‌شود.</p>
            {s.specs.map((sp, idx) => {
              const attr = (allAttrs || []).find((a) => a.id === sp.attributeId);
              const isSelect = attr?.type === 'select' || (attr?.values?.length || 0) > 0;
              return (
                <div key={idx} className="grid gap-2 sm:grid-cols-[240px_1fr_auto]">
                  <Select
                    value={sp.attributeId || ''}
                    onChange={(e) => set('specs', s.specs.map((x, i) => (i === idx ? { attributeId: Number(e.target.value) } : x)))}
                  >
                    <option value="">انتخاب ویژگی…</option>
                    {(allAttrs || []).map((a) => <option key={a.id} value={a.id}>{a.name}{a.unit ? ` (${a.unit})` : ''}</option>)}
                  </Select>
                  {isSelect ? (
                    <Select
                      value={sp.attributeValueId || ''}
                      onChange={(e) => set('specs', s.specs.map((x, i) => (i === idx ? { ...x, attributeValueId: Number(e.target.value) || undefined, customValue: undefined } : x)))}
                    >
                      <option value="">انتخاب مقدار…</option>
                      {(attr?.values || []).map((val) => <option key={val.id} value={val.id}>{val.value}</option>)}
                    </Select>
                  ) : (
                    <Input
                      placeholder="مقدار (متن آزاد)"
                      value={sp.customValue || ''}
                      onChange={(e) => set('specs', s.specs.map((x, i) => (i === idx ? { ...x, customValue: e.target.value, attributeValueId: undefined } : x)))}
                    />
                  )}
                  <button onClick={() => set('specs', s.specs.filter((_, i) => i !== idx))} className="self-center p-1.5 text-slate-300 hover:text-rose-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            <Button variant="secondary" size="sm" onClick={() => set('specs', [...s.specs, { attributeId: 0 }])}>
              <Plus className="h-4 w-4" /> افزودن مشخصه
            </Button>
          </Card>
        )}

        {/* ------------------------------ سئو/تگ/مرتبط ------------------------------ */}
        {tab === 'seo' && (
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="عنوان متا (SEO)"><Input value={s.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} /></Field>
              <Field label="توضیح متا"><Input value={s.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} /></Field>
            </div>
            <Field label="تگ‌ها (با ویرگول جدا کنید)" hint="مثلاً: گوشی، سامسونگ، پرچمدار">
              <Input value={s.tagsInput} onChange={(e) => set('tagsInput', e.target.value)} />
            </Field>
            <Field label="محصولات مرتبط" hint="در بخش «محصولات مرتبط» صفحه محصول نمایش داده می‌شوند">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {s.relatedProductIds.map((id) => (
                    <RelatedChip key={id} id={id} onRemove={() => set('relatedProductIds', s.relatedProductIds.filter((x) => x !== id))} />
                  ))}
                </div>
                <Input value={relQ} onChange={(e) => setRelQ(e.target.value)} placeholder="جستجوی نام محصول برای افزودن…" />
                {!!relResults?.length && (
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {relResults.filter((r) => r.id !== productId && !s.relatedProductIds.includes(r.id)).map((r) => (
                      <li key={r.id}>
                        <button
                          onClick={() => { set('relatedProductIds', [...s.relatedProductIds, r.id]); setRelQ(''); }}
                          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-50"
                        >
                          {r.name}
                          <Plus className="h-3.5 w-3.5 text-emerald-500" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Field>
          </Card>
        )}
      </div>

      <div className="sticky bottom-4 mt-6">
        <Button className="w-full shadow-lg" size="lg" onClick={() => save.mutate()} loading={save.isPending}>
          <Save className="h-4.5 w-4.5" /> {productId ? 'ذخیره تغییرات' : 'ایجاد محصول'}
        </Button>
      </div>
    </div>
  );
}

function RelatedChip({ id, onRemove }: { id: number; onRemove: () => void }) {
  const { data } = useQuery({
    queryKey: ['product-mini', id],
    queryFn: async () => (await api<{ name: string }>(`/admin/products/${id}`)).data,
    staleTime: 300_000,
  });
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
      {data?.name || `#${id}`}
      <button onClick={onRemove} className="text-slate-400 hover:text-rose-500"><X className="h-3 w-3" /></button>
    </span>
  );
}

/** تبدیل محصول موجود (خروجی assemble ادمین) به state فرم */
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
