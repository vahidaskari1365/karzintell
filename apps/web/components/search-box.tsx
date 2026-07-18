'use client';

import { api } from '@/lib/api-client';
import { faNumber, toToman } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Tag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';

interface SuggestItem {
  name: string;
  slug: string;
  image?: string | null;
  minPrice?: number | null;
  brandName?: string | null;
  categoryName?: string | null;
}

/** باکس جستجو با Autocomplete و پیشنهاد لحظه‌ای (debounce) */
export function SearchBox({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: async () =>
      (await api<{ items: SuggestItem[]; categories: { name: string; slug: string }[] }>(
        `/search/suggest?q=${encodeURIComponent(debounced)}`,
      )).data,
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const showDropdown = open && debounced.length >= 2;

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} className="relative">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="جستجو در کارزینتل…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pe-4 ps-10 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
        />
        {isFetching ? (
          <Loader2 className="absolute start-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 animate-spin text-slate-400" />
        ) : (
          <Search className="absolute start-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
        )}
      </form>

      {showDropdown && (
        <div
          className={`absolute top-full z-50 mt-1.5 max-h-105 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl ${mobile ? '' : 'min-w-105'}`}
        >
          {!!data?.categories?.length && (
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 p-3">
              {data.categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/categories/${c.slug}`}
                  onClick={() => { setOpen(false); onNavigate?.(); }}
                  className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-orange-100 hover:text-orange-700"
                >
                  <Tag className="h-3 w-3" /> {c.name}
                </Link>
              ))}
            </div>
          )}

          {data?.items?.length ? (
            <ul>
              {data.items.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={() => { setOpen(false); onNavigate?.(); }}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50"
                  >
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-10 w-10 rounded-lg border border-slate-100 object-contain" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                        <Search className="h-4 w-4 text-slate-300" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-800">{item.name}</span>
                      <span className="block text-xs text-slate-400">
                        {[item.brandName, item.categoryName].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {item.minPrice != null && (
                      <span className="shrink-0 text-xs font-semibold text-slate-700">
                        {toToman(item.minPrice)} <span className="font-normal text-slate-400">تومان</span>
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            !isFetching && <p className="p-4 text-center text-xs text-slate-400">نتیجه‌ای برای «{debounced}» یافت نشد</p>
          )}

          <button
            onClick={submit as never}
            className="block w-full border-t border-slate-100 py-2.5 text-center text-sm font-medium text-orange-600 hover:bg-orange-50"
          >
            مشاهده همه نتایج ({faNumber(data?.items?.length || 0)}+)
          </button>
        </div>
      )}
    </div>
  );
}
