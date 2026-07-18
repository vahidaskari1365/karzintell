import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
          <Zap className="h-6 w-6 text-amber-400" />
        </span>
        <span className="text-2xl font-black text-slate-900">کارزینتل</span>
      </Link>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">{children}</div>
      <Link href="/" className="mt-6 text-sm text-slate-400 hover:text-slate-700">بازگشت به فروشگاه</Link>
    </div>
  );
}
