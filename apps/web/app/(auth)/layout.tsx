import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100/90 px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2.5 transition-transform hover:scale-105">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" alt="کارزینتل" className="h-11 w-11" />
        <span className="text-2xl font-black tracking-tight">
          <span className="bg-gradient-to-l from-emerald-400 to-emerald-600 bg-clip-text text-transparent">کارزین</span>
          <span className="text-slate-900">تل</span>
        </span>
      </Link>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">{children}</div>
      <Link href="/" className="mt-6 text-sm text-slate-400 hover:text-slate-700">بازگشت به فروشگاه</Link>
    </div>
  );
}
