'use client';

/**
 * جعبه‌ابزار افکت‌های سینمایی (اسکرول-درایون با framer-motion)
 * همه کامپوننت‌ها کلاینت‌ساید و سبک‌اند.
 */
import { motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { ReactNode, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------- Reveal: ظاهرشدن نرم هنگام اسکرول
export function Reveal({
  children, delay = 0, y = 42, className, once = true,
}: {
  children: ReactNode; delay?: number; y?: number; className?: string; once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, margin: '-12% 0px' }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ستگر‌شدن (stagger) فرزندان
export function RevealGroup({ children, className, step = 0.08 }: { children: ReactNode; className?: string; step?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ staggerChildren: step }}
    >
      {children}
    </motion.div>
  );
}

export const revealItem = {
  hidden: { opacity: 0, y: 34, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

// ---------------------------------------------------------------- Parallax: حرکت با سرعت متفاوت اسکرول
export function Parallax({
  children, speed = 0.3, className,
}: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [60 * speed * 10, -60 * speed * 10]);
  const smoothY = useSpring(y, { stiffness: 90, damping: 24 });
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y: smoothY }}>{children}</motion.div>
    </div>
  );
}

// ---------------------------------------------------------------- TiltCard: کارت سه‌بعدی واکنش‌گرا به موس
export function TiltCard({ children, className, amount = 10 }: { children: ReactNode; className?: string; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 18 });
  const sry = useSpring(ry, { stiffness: 180, damping: 18 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * amount);
    rx.set(-py * amount);
  };
  const onLeave = () => { rx.set(0); ry.set(0); };

  return (
    <motion.div
      ref={ref}
      className={`tilt-card ${className || ''}`}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------- Marquee: نوار متحرک بی‌نهایت
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden ${className || ''}`}>
      <div className="marquee-track gap-12 py-3">
        {children}
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- CountUp: شمرونه‌ی عددی
export function CountUp({ to, suffix = '', duration = 1.6, className }: { to: number; suffix?: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={className}>
      {val.toLocaleString('fa-IR')}{suffix}
    </span>
  );
}

// ---------------------------------------------------------------- GradientText
export function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`text-aurora ${className || ''}`}>{children}</span>;
}

// ---------------------------------------------------------------- Magnetic: دکمه مغناطیسی (جذب به سمت موس)
export function Magnetic({ children, className, strength = 0.25 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16 });
  const sy = useSpring(y, { stiffness: 220, damping: 16 });

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className || ''}`}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------- نوار پیشرفت اسکرول صفحه
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26 });
  return (
    <motion.div
      className={`fixed inset-x-0 top-0 z-50 h-[3px] origin-right bg-gradient-to-l from-emerald-500 via-green-500 to-cyan-400 ${className || ''}`}
      style={{ scaleX }}
    />
  );
}
