import type { Metadata } from 'next';
import { BlogDetail } from './blog-detail';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URL}/blog/${slug}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      const p = json?.data;
      if (p) {
        return {
          title: p.metaTitle || p.title,
          description: p.metaDescription || p.excerpt || p.title,
          alternates: { canonical: `/blog/${slug}` },
          openGraph: {
            type: 'article',
            title: p.metaTitle || p.title,
            description: p.metaDescription || p.excerpt || undefined,
            images: p.coverUrl ? [p.coverUrl] : undefined,
            publishedTime: p.publishedAt || undefined,
          },
        };
      }
    }
  } catch { /* 404 */ }
  return { title: 'مقاله' };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlogDetail slug={slug} />;
}
