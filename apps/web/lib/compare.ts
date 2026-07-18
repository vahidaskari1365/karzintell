'use client';

// مدیریت لیست مقایسه — مهمان: localStorage؛ کاربر: سرور (در صفحه /compare همگام می‌شود)
export const COMPARE_KEY = 'krz_compare';
export const COMPARE_LIMIT = 4;

export function getCompareIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(Number).filter((n) => Number.isFinite(n) && n > 0).slice(0, COMPARE_LIMIT) : [];
  } catch {
    return [];
  }
}

export function setCompareIds(ids: number[]) {
  const clean = [...new Set(ids.map(Number))].filter(Boolean).slice(0, COMPARE_LIMIT);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(clean));
  window.dispatchEvent(new Event('compare:changed'));
  return clean;
}

export function toggleCompareId(id: number): { ids: number[]; inCompare: boolean; full: boolean } {
  const current = getCompareIds();
  if (current.includes(id)) {
    return { ids: setCompareIds(current.filter((x) => x !== id)), inCompare: false, full: false };
  }
  if (current.length >= COMPARE_LIMIT) return { ids: current, inCompare: false, full: true };
  return { ids: setCompareIds([...current, id]), inCompare: true, full: false };
}
