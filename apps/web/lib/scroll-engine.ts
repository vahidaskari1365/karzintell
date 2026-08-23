'use client';

/**
 * موتور اسکرول استیکی کارزینتل — مستقل از هر کتابخانه انیمیشن.
 * رویداد خام مرورگر + rAF + فال‌بک اینتروال؛ روی همه مرورگرها قطعی.
 */
import { useEffect, useRef, useState } from 'react';

/** میزان پیشرفت اسکرولِ یک سکشن استیکی (۰ تا ۱) */
export function useStickyProgress(ref: { current: HTMLElement | null }) {
  const [p, setP] = useState(0);
  const lastP = useRef(0);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      const v = scrollable <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / scrollable));
      if (Math.abs(v - lastP.current) > 0.0005 || (v === 0 && lastP.current !== 0)) {
        lastP.current = v;
        setP(v);
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    measure();
    // چند اندازه‌گیری تکمیلی بعد از لود — اگر فونت/تصویر چیدمان را جابه‌جا کند، هیچ‌وقت گیر نمی‌کنیم
    const t1 = window.setTimeout(measure, 120);
    const t2 = window.setTimeout(measure, 500);
    // هر دو سطح گوش می‌دهیم (برخی مرورگرها/کانتینرها scroll را حبابی نمی‌کنند)
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', onScroll);
    // فال‌بک بازه‌ای — حتی اگر رویدادی از قلم بیفتد، پیشرفت هرگز گیر نمی‌کند
    const iv = window.setInterval(measure, 300);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('load', onScroll);
      window.clearInterval(iv);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}

/**
 * پنجره‌ی شفافیت هر فریم — کراس‌فید متقاطع واقعی:
 * هر فریم در مرز با فریم همسایه هم‌پوشانی دارد و مجموع شفافیت‌ها در مرزها همیشه ۱ می‌ماند
 * (دیگر لحظه‌ای صفحه خالی نمی‌شود).
 */
export function frameWindow(p: number, i: number, total: number, halfRatio = 0.35) {
  if (total <= 1) return 1;
  const seg = 1 / total;
  const H = seg * halfRatio; // نیمه‌پهنای پنجره‌ی هم‌پوشانی
  const start = i * seg;
  const end = start + seg;
  let o = 1;
  if (i > 0) {
    if (p <= start - H) return 0;
    if (p < start + H) o = (p - (start - H)) / (2 * H);
  }
  if (i < total - 1) {
    if (p >= end + H) return 0;
    if (p > end - H) o = Math.min(o, 1 - (p - (end - H)) / (2 * H));
  }
  return Math.max(0, Math.min(1, o));
}

/** حرکت پوش‌این لنز برای هر فریم (زوم نرم ۶٪ → ۰٪ در طول صحنه) */
export function framePushIn(p: number, i: number, total: number) {
  const seg = 1 / total;
  const local = Math.min(1, Math.max(0, (p - i * seg) / seg));
  const scale = 1.06 - local * 0.06;
  const y = i === 0 ? -local * 12 : (1 - local) * 16 - 8;
  return `translateY(${y}px) scale(${scale})`;
}
