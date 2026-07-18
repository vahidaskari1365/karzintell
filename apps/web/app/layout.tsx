import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SITE_NAME = 'کارزینتل';
const SITE_DESCRIPTION =
  'فروشگاه آنلاین موبایل، ساعت هوشمند، هدفون و قطعات الکترونیک — خرید امن با ضمانت اصالت کالا، ارسال سریع و پشتیبانی ۲۴ ساعته';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} | فروشگاه قطعات الکترونیک`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: ['خرید موبایل', 'گوشی هوشمند', 'ساعت هوشمند', 'هدفون', 'لوازم جانبی', 'قطعات الکترونیک', 'کارزینتل'],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: { icon: '/icon.svg' },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: SITE_NAME,
    title: `${SITE_NAME} | فروشگاه قطعات الکترونیک`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: '/icon.svg', width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: { card: 'summary', title: SITE_NAME, description: SITE_DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

// داده ساخت‌یافته سازمان + جستجوی سایت (Schema.org)
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
};
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
