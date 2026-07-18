import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4">{children}</main>
      <Footer />
    </div>
  );
}
