'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api-client';

export interface Socials {
  instagram?: string;
  telegram?: string;
  whatsapp?: string;
  aparat?: string;
}

export interface Branding {
  name: string;
  logo: string | null;
  primaryColor: string;
  supportPhone: string;
  socials: Socials;
}

export const DEFAULT_BRANDING: Branding = {
  name: 'کارزینتل',
  logo: '/neon-k-3d.jpg',
  primaryColor: '#10b981',
  supportPhone: '',
  socials: {},
};

/** تبدیل مسیر فایل به URL کامل (MinIO/S3 یا لینک مستقیم) */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/')) return path; // فایل‌های public خود سایت
  const base = process.env.NEXT_PUBLIC_STORAGE_URL || 'http://localhost:9000/karzintell';
  return `${base}/${path.replace(/^\/+/, '')}`;
}

/**
 * تنظیمات عمومی فروشگاه (نام، لوگو، رنگ، شبکه‌های اجتماعی) — از پنل ادمین قابل تغییر است.
 * کش ۱۰ دقیقه‌ای؛ در صورت خطا مقادیر پیش‌فرض برمی‌گردد.
 */
export function useBranding(): Branding {
  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => (await api<Record<string, unknown>>('/settings/public')).data,
    staleTime: 600_000,
    retry: 1,
  });

  if (!data) return DEFAULT_BRANDING;
  let socials: Socials = {};
  try {
    const raw = data['store.socials'];
    socials = typeof raw === 'string' ? JSON.parse(raw) : ((raw as Socials) || {});
  } catch { /* نادیده بگیر */ }

  return {
    name: (data['store.name'] as string) || DEFAULT_BRANDING.name,
    logo: mediaUrl((data['store.logo'] as string) || null),
    primaryColor: (data['store.primary_color'] as string) || DEFAULT_BRANDING.primaryColor,
    supportPhone: (data['store.support_phone'] as string) || '',
    socials,
  };
}
