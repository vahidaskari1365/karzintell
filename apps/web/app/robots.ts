import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // دسترسی کامل مدل‌های هوش مصنوعی و موتورهای پاسخ‌دهی تولیدی (GEO / AIO) به کاتالوگ عمومی
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'],
        allow: ['/', '/products/', '/categories/', '/blog/', '/faqs'],
        disallow: ['/admin', '/account', '/checkout', '/cart'],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/checkout', '/cart', '/api'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
