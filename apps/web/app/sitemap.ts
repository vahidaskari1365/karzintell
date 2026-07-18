import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const revalidate = 3600; // بازسازی ساعتی

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/categories`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/cart`, changeFrequency: 'monthly', priority: 0.2 },
  ];

  // محصولات منتشرشده
  const products = await fetchJson<{ data: Array<{ slug: string; updatedAt?: string }> }>(
    '/products?limit=1000&status=published',
  );
  const productRoutes: MetadataRoute.Sitemap = (products?.data || [])
    .filter((p) => p?.slug)
    .map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

  // دسته‌بندی‌ها
  const categories = await fetchJson<{ data: Array<{ slug: string; children?: Array<{ slug: string }> }> }>(
    '/categories/tree',
  );
  const categoryRoutes: MetadataRoute.Sitemap = [];
  const walk = (nodes: Array<{ slug: string; children?: Array<{ slug: string }> }>) => {
    for (const n of nodes || []) {
      if (n?.slug)
        categoryRoutes.push({ url: `${SITE_URL}/categories/${n.slug}`, changeFrequency: 'weekly', priority: 0.7 });
      if (n.children?.length) walk(n.children as any);
    }
  };
  walk(categories?.data || []);

  // صفحات CMS
  const pages = await fetchJson<{ data: Array<{ slug: string }> }>('/pages');
  const pageRoutes: MetadataRoute.Sitemap = (pages?.data || [])
    .filter((p) => p?.slug)
    .map((p) => ({ url: `${SITE_URL}/pages/${p.slug}`, changeFrequency: 'monthly', priority: 0.4 }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...pageRoutes];
}
