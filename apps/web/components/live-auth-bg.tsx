'use client';

/**
 * LiveAuthBackground — پس‌زمینه زنده برای صفحات احراز هویت
 *
 * این کامپوننت:
 * 1. عکس auth-bg.png رو به‌عنوان پس‌زمینه نشون می‌ده
 * 2. یک لایه نئون "flicker" (روشن/خاموش) روی عکس می‌ذاره
 *    که حس تابلو نئون واقعی رو می‌ده
 * 3. یک لایه "grain" (نویز سینمایی) اضافه می‌کنه برای حس فیلم
 * 4. یک pulse ملایم نور که قلب عکس (لوگو K.) رو زنده می‌کنه
 *
 * حرکت‌ها:
 * - flicker: نئون هر ۳-۵ ثانیه یک‌بار سریع خاموش/روشن می‌شه (مثل تابلوی واقعی)
 * - grain: نویز تصادفی که آروم به‌هسته (film grain)
 * - pulse: نور مرکزی یواشک_Y آروم moot می‌شه (به alete 60bpm)
 *
 * Performance: همه چی با CSS animation — نه JS main loop.
 * prefers-reduced-motion: اگه کاربر خاموش کرده باشه، فقط static نشون می‌ده.
 */

import { useEffect, useState } from 'react';

export function LiveAuthBackground() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="absolute inset-0 -z-40 overflow-hidden">
      {/* ─── لایه ۱: عکس پس‌زمینه ─── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/auth-bg.png)' }}
      />

      {/* ─── لایه ۲: pulse نور مرکزی (موتور زنده‌سازی) ─── */}
      {/* قلب عکس (لوگو K. در مرکز) یواشک puls می‌کنه — مثل تپش */}
      {!reducedMotion && (
        <div
          className="absolute left-1/2 top-[44%] -z-30 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(20, 255, 180, 0.30) 0%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'neon-heartbeat 2.4s ease-in-out infinite',
          }}
        />
      )}

      {/* ─── لایه ۳: نئون flicker overlay ─── */}
      {/* این لایه با mix-blend mode روی عکس قرار می‌گیره و نئون رو
          روشن/خاموش می‌کنه. */}
      {!reducedMotion && (
        <div
          className="absolute inset-0 -z-20"
          style={{
            mixBlendMode: 'lighten',
            animation: 'neon-flicker 4.2s linear infinite',
          }}
        >
          {/* نور سبز-فیروزه‌ای کلی — مثل تراکش نئون */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(20, 255, 180, 0.22) 0%, transparent 65%)',
            }}
          />
          {/* خطوط افقی که با flicker پالس می‌کنن — نئون واقعی با درخشش */}
          <div
            className="absolute inset-x-0 top-[68%] h-px"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #14ffb4 50%, transparent 100%)',
              filter: 'blur(1.5px)',
              boxShadow: '0 0 20px #14ffb4, 0 0 40px rgba(20, 255, 180, 0.6)',
            }}
          />
          {/* خط عمودی که از بالا میاد — مثل تابلوی نئون روشن شدن */}
          <div
            className="absolute inset-y-0 left-1/2 w-px"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(20, 255, 180, 0.5) 50%, transparent 100%)',
              filter: 'blur(0.5px)',
              boxShadow: '0 0 10px rgba(20, 255, 180, 0.4)',
            }}
          />
        </div>
      )}

      {/* ─── لایه ۴: overlay نیمه‌شفاف برای خوانایی (نسبت ۵۰-۶۰٪ تا عکس دیده بشه) ─── */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(135deg, rgba(5, 10, 14, 0.55) 0%, rgba(5, 10, 14, 0.45) 50%, rgba(5, 10, 14, 0.65) 100%)',
        }}
      />

      {/* ─── لایه ۵: Film Grain ─── */}
      {/* نویز تصادفی که آروم به‌هسته — حس فیلم سینمایی */}
      {!reducedMotion && (
        <>
          <svg className="absolute inset-0 -z-10 h-full w-full opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
            <filter id="grain-noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves="2"
                stitchTiles="stitch"
                seed={Math.floor(Math.random() * 100)}
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#grain-noise)" />
          </svg>
          {/* انیمیشن grain shift */}
          <style>{`
            @keyframes grain-shift {
              0%, 100% { transform: translate(0, 0); }
              10% { transform: translate(-2%, -1%); }
              20% { transform: translate(1%, 2%); }
              30% { transform: translate(-1%, 1%); }
              40% { transform: translate(2%, -2%); }
              50% { transform: translate(-2%, 2%); }
              60% { transform: translate(1%, -1%); }
              70% { transform: translate(-1%, -2%); }
              80% { transform: translate(2%, 1%); }
              90% { transform: translate(-2%, -1%); }
            }
          `}</style>
        </>
      )}

      {/* ─── لایه ۶: Line-Sweep (یک خط نوری که آروم از بالا پایین می‌ره) ─── */}
      {/* یک لحظه motion — حس scan کردن */}
      {!reducedMotion && (
        <div
          className="absolute inset-x-0 top-0 -z-10 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #14ffb4 50%, transparent 100%)',
            boxShadow: '0 0 20px #14ffb4, 0 0 40px rgba(20, 255, 180, 0.5)',
            animation: 'neon-sweep 6s ease-in-out infinite',
          }}
        />
      )}

      {/* ─── استایل‌های انیمیشن ─── */}
      <style>{`
        @keyframes neon-heartbeat {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.08); }
        }

        @keyframes neon-flicker {
          0%, 100% { opacity: 1; }
          /* نئون به‌صورت تصادفی خاموش/روشن می‌شه — مثل تابلوی واقعی */
          41% { opacity: 1; }
          42% { opacity: 0.3; }
          43% { opacity: 1; }
          45% { opacity: 0.6; }
          46% { opacity: 1; }
          77% { opacity: 1; }
          78% { opacity: 0.4; }
          79% { opacity: 1; }
          81% { opacity: 0.7; }
          82% { opacity: 1; }
          85% { opacity: 0.3; }
          86% { opacity: 1; }
        }

        @keyframes neon-sweep {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
