import type { Metadata } from 'next';
import { ProductDetail } from './product-detail';
import { mediaUrl } from '@/lib/branding';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/products/${slug}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      const p = json?.data;
      if (p) {
        const title = p.metaTitle || `${p.name} | کارزینتل`;
        const description = p.metaDescription || p.shortDescription || p.name;
        const primaryImage = p.images?.find((img: any) => img.isPrimary)?.url || p.images?.[0]?.url;

        return {
          title,
          description,
          alternates: { canonical: `/products/${slug}` },
          openGraph: {
            type: 'product' as unknown as 'website',
            title,
            description,
            images: primaryImage ? [{ url: mediaUrl(primaryImage) as string, alt: p.name }] : undefined,
          },
        };
      }
    }
  } catch { /* 404 */ }
  return { title: 'محصول' };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductDetail slug={slug} />;
}
