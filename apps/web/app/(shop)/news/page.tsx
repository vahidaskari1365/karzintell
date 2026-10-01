import type { Metadata } from 'next';
import { BlogList } from '@/components/blog-list';

export const metadata: Metadata = {
  title: 'اخبار و اطلاعیه‌ها',
  description: 'آخرین اخبار، تخفیف‌ها و اطلاعیه‌های فروشگاه کارزینتل',
  alternates: { canonical: '/news' },
};

export default function NewsPage() {
  return <BlogList kind="news" />;
}
