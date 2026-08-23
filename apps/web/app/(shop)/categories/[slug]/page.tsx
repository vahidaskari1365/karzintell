import type { Metadata } from 'next';
import { CategoryDetail } from './category-detail';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/categories/${slug}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      const p = json?.data?.category;
      if (p) {
        const title = `${p.name} | دسته‌بندی قطعات و گجت‌ها — کارزینتل`;
        const description = `خرید و مقایسه قیمت انواع محصولات دسته‌بندی ${p.name} با بهترین کیفیت، گارانتی معتبر و ارسال فوری در فروشگاه اینترنتی کارزینتل`;
        
        return {
          title,
          description,
          alternates: { canonical: `/categories/${slug}` },
          openGraph: {
            type: 'website',
            title,
            description,
          },
        };
      }
    }
  } catch { /* 404 */ }
  return { title: 'دسته‌بندی' };
}

export default async function CategoryPagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CategoryDetail slug={slug} />;
}
