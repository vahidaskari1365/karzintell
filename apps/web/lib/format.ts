/** قالب‌بندی اعداد و تاریخ به فارسی */

export const faNumber = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined || n === '') return '—';
  return new Intl.NumberFormat('fa-IR').format(Number(n));
};

/** ریال → تومان با جداکننده فارسی */
export const toToman = (rial: number | string | null | undefined): string => {
  if (rial === null || rial === undefined) return '—';
  const toman = Math.round(Number(rial) / 10);
  return `${new Intl.NumberFormat('fa-IR').format(toman)} تومان`;
};

/** تومان → ریال (برای فرم‌ها) */
export const tomanToRial = (toman: number | string): number => Math.round(Number(toman) * 10);
export const rialToToman = (rial: number | string | null | undefined): number =>
  rial == null ? 0 : Math.round(Number(rial) / 10);

export const faDate = (d: string | Date | null | undefined, withTime = false): string => {
  if (!d) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' } : {}),
  }).format(new Date(d));
};

export const faDateTime = (d: string | Date | null | undefined): string => faDate(d, true);

export const percentOff = (price: number, compareAt?: number | null): number => {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round((1 - price / compareAt) * 100);
};

export const digitsOnly = (s: string): string => s.replace(/[^\d]/g, '');

/** تبدیل ارقام فارسی به انگلیسی در ورودی */
export const normalizeDigits = (s: string): string =>
  s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
