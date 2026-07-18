import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <Header />
      {/* پنل روشن محتوا روی والپیپر نئونی — سکشن‌های سینمایی تمام‌قد از آن بیرون می‌زنند */}
      <main className="mx-auto w-full max-w-7xl flex-1 bg-[#f8fafc]/95 px-4">{children}</main>
      <Footer />
    </div>
  );
}
