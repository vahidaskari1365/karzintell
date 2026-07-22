import type { Metadata } from 'next';
import { BlogList } from '@/components/blog-list';

export const metadata: Metadata = {
  title: 'وبلاگ — راهنمای خرید و نقد و بررسی',
  description: 'راهنماهای خرید گوشی، ساعت هوشمند و هدفون؛ نقد و بررسی محصولات دیجیتال در وبلاگ کارزینتل',
  alternates: { canonical: '/blog' },
};

export default function BlogPage() {
  return <BlogList kind="post" />;
}
