import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'کارزینتل — فروشگاه اینترنتی موبایل، ساعت هوشمند، هدفون و قطعات الکترونیک';

const BADGES = ['ضمانت اصالت کالا', 'ارسال سریع', 'پشتیبانی ۲۴ ساعته'];

export default async function OgImage() {
  const fontsDir = path.join(process.cwd(), 'assets', 'fonts');
  const bold = await readFile(path.join(fontsDir, 'Vazirmatn-Bold.ttf'));
  const medium = await readFile(path.join(fontsDir, 'Vazirmatn-Medium.ttf'));

  return new ImageResponse(
    <div
      dir="rtl"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 80px',
        fontFamily: 'Vazirmatn',
        background: 'linear-gradient(135deg, #05080f 0%, #0b1524 55%, #0f2a22 100%)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '620px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#05080f',
              fontSize: '40px',
              fontWeight: 700,
            }}
          >
            ک
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '76px', fontWeight: 700, color: '#f8fafc', lineHeight: 1.15 }}>
              کارزینتل
            </div>
            <div style={{ fontSize: '30px', fontWeight: 500, color: '#94a3b8' }}>
              فروشگاه قطعات الکترونیک و گجت
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: '34px', fontWeight: 500, color: '#e2e8f0', lineHeight: 1.7 }}>
          موبایل، ساعت هوشمند، هدفون و قطعات الکترونیک — خرید امن با ضمانت اصالت کالا
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: '14px' }}>
          {BADGES.map((b) => (
            <div
              key={b}
              style={{
                display: 'flex',
                padding: '10px 22px',
                borderRadius: '999px',
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.45)',
                color: '#6ee7b7',
                fontSize: '22px',
                fontWeight: 500,
              }}
            >
              {b}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '18px' }}>
        <div
          style={{
            width: '210px',
            height: '320px',
            borderRadius: '28px',
            background: 'linear-gradient(160deg, #1e293b, #0f172a)',
            border: '1px solid rgba(148,163,184,0.25)',
            display: 'flex',
            flexDirection: 'column',
            padding: '22px',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              flex: 1,
              borderRadius: '18px',
              background: 'linear-gradient(150deg, #334155, #1e293b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '64px',
            }}
          >
            ⌂
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            <div style={{ height: '12px', borderRadius: '6px', background: '#334155', width: '85%' }} />
            <div style={{ height: '12px', borderRadius: '6px', background: '#1e293b', width: '60%' }} />
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>۱۲٬۵۰۰٬۰۰۰ تومان</div>
          </div>
        </div>
        <div
          style={{
            width: '170px',
            height: '260px',
            borderRadius: '26px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(148,163,184,0.18)',
            transform: 'translateY(30px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              flex: 1,
              borderRadius: '16px',
              background: 'linear-gradient(150deg, #0f2a22, #0b1524)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2f6a55',
              fontSize: '52px',
            }}
          >
            ◉
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            <div style={{ height: '10px', borderRadius: '5px', background: '#22303e', width: '80%' }} />
            <div style={{ height: '10px', borderRadius: '5px', background: '#18232f', width: '55%' }} />
          </div>
        </div>
      </div>
    </div>,
    {
      width: size.width,
      height: size.height,
      fonts: [
        { name: 'Vazirmatn', data: bold, style: 'normal', weight: 700 },
        { name: 'Vazirmatn', data: medium, style: 'normal', weight: 500 },
      ],
    },
  );
}
