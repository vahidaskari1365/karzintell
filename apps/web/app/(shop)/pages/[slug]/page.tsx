'use client';

import { use, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, PageLoading, Empty } from '@/components/ui';
import { ProductGrid } from '@/components/product-card';
import { ProductCardType } from '@/lib/types';
import { Zap, Clock, Tag, Gift } from 'lucide-react';

interface CampaignConfig {
  isCampaign: boolean;
  campaignTitle: string;
  campaignSubtitle?: string;
  bannerUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  countdownDate?: string; // Format: "2026-12-31T23:59:59"
  discountBadge?: string;
  productSlugs?: string[];
  htmlContent?: string;
}

// کامپوننت روزشمار کمپین تفکیک‌شده
function CampaignCountdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <div className="rounded-2xl bg-rose-600/10 p-4 text-center text-sm font-bold text-rose-400">
        ⌛ این جشنواره به پایان رسیده است. منتظر کمپین‌های بعدی کارزینتل باشید!
      </div>
    );
  }

  const fNum = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex justify-center gap-3" dir="ltr">
      {[
        { label: 'روز', val: timeLeft.days },
        { label: 'ساعت', val: timeLeft.hours },
        { label: 'دقیقه', val: timeLeft.minutes },
        { label: 'ثانیه', val: timeLeft.seconds },
      ].map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10130f] text-lg font-black text-emerald-400 shadow-md ring-1 ring-emerald-400/25">
            {fNum(item.val)}
          </div>
          <span className="mt-1 text-[10px] font-bold text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  // ۱. دریافت اطلاعات صفحه از API
  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['page', slug],
    queryFn: async () => (await api<{ title: string; body: string }>(`/pages/${slug}`)).data,
    retry: false,
  });

  // ۲. دریافت کل لیست محصولات منتشر شده (جهت فیلتر برای محصولات جشنواره)
  const { data: productsData } = useQuery({
    queryKey: ['campaign-products'],
    queryFn: async () => (await api<ProductCardType[]>('/products?limit=100&status=published')).data,
    enabled: !!page,
  });

  if (isLoading) return <PageLoading />;
  if (isError || !page) {
    return (
      <div className="py-16">
        <Empty title="صفحه یافت نشد" />
      </div>
    );
  }

  // بررسی اینکه آیا بدنه صفحه حاوی تنظیمات کمپین به صورت JSON است یا خیر
  let campaign: CampaignConfig | null = null;
  const bodyText = page.body.trim();
  if (bodyText.startsWith('{') && bodyText.endsWith('}')) {
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed.isCampaign) {
        campaign = parsed;
      }
    } catch {
      campaign = null;
    }
  }

  // اگر صفحه یک کمپین لندینگ داینامیک بود:
  if (campaign) {
    const campaignProducts = (productsData || []).filter(
      (p) => campaign?.productSlugs?.includes(p.slug)
    );

    return (
      <div
        className="min-h-screen py-8 -mx-4 px-4 sm:-mx-8 sm:px-8 transition-colors duration-500"
        style={{
          backgroundColor: campaign.backgroundColor || '#0c0f10',
          color: campaign.textColor || '#f8fafc',
        }}
      >
        <div className="mx-auto max-w-6xl space-y-8">
          {/* هیرو بنر بزرگ کمپین */}
          {campaign.bannerUrl && (
            <div className="group relative h-48 overflow-hidden rounded-3xl bg-[#10130f] shadow-2xl md:h-72 ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={campaign.bannerUrl}
                alt={campaign.campaignTitle}
                className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              <div className="absolute bottom-6 right-6 left-6 flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-1">
                  {campaign.discountBadge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white shadow-lg animate-pulse">
                      <Tag className="h-3.5 w-3.5" />
                      {campaign.discountBadge}
                    </span>
                  )}
                  <h1 className="text-xl font-black text-white sm:text-3xl mt-1.5">{campaign.campaignTitle}</h1>
                  {campaign.campaignSubtitle && (
                    <p className="text-xs text-slate-300 sm:text-sm">{campaign.campaignSubtitle}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* محتوا + ثانیه‌شمار */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* کارت روزشمار و مارکتینگ */}
            <Card className="flex flex-col justify-center space-y-4 border-2 border-emerald-400/20 bg-emerald-950/10 p-6 md:col-span-1">
              <div className="flex items-center justify-center gap-2 text-center font-black text-emerald-400">
                <Clock className="h-5 w-5 animate-spin" style={{ animationDuration: '6s' }} />
                <span>زمان باقیمانده جشنواره</span>
              </div>
              {campaign.countdownDate && (
                <CampaignCountdown targetDate={campaign.countdownDate} />
              )}
              <div className="border-t border-white/10 pt-4 text-center text-xs leading-6 text-slate-400 space-y-1">
                <div className="flex items-center justify-center gap-1 text-emerald-400"><Zap className="h-3.5 w-3.5" /> ارسال سریع و فوری</div>
                <div className="flex items-center justify-center gap-1 text-emerald-400"><Gift className="h-3.5 w-3.5" /> هدیه ویژه خرید اول</div>
              </div>
            </Card>

            {/* کارت متن معرفی لندینگ */}
            <Card className="p-6 md:col-span-2">
              <div
                className="prose prose-invert prose-emerald text-sm leading-8 text-slate-300"
                dangerouslySetInnerHTML={{ __html: campaign.htmlContent || '' }}
              />
            </Card>
          </div>

          {/* شبکه محصولات جشنواره */}
          {campaign.productSlugs && campaign.productSlugs.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-r-4 border-emerald-500 pr-3">
                <h2 className="text-lg font-black text-white">محصولات منتخب جشنواره</h2>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-2xs font-bold text-emerald-400">ویژه کمپین</span>
              </div>

              {campaignProducts.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">محصولات در حال آماده‌سازی هستند…</p>
              ) : (
                <ProductGrid items={campaignProducts} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // نمایش پیش‌فرض صفحه متنی ثابت
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="mb-6 text-2xl font-black text-slate-100">{page.title}</h1>
      <Card>
        <div className="prose-fa leading-8 text-slate-300" dangerouslySetInnerHTML={{ __html: page.body }} />
      </Card>
    </div>
  );
}
