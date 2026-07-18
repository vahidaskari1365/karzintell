import Link from 'next/link';
import { BrandLockup } from '@/components/brand-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100/90 px-4 py-10">
      <Link href="/" className="mb-6 transition-transform hover:scale-105">
        <BrandLockup />
      </Link>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">{children}</div>
      <Link href="/" className="mt-6 text-sm text-slate-400 hover:text-slate-700">بازگشت به فروشگاه</Link>
    </div>
  );
}
