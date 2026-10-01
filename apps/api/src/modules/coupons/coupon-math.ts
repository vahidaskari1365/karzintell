/**
 * فرمول خالص محاسبه تخفیف کوپن — بدون وابستگی (قابل تست با vitest).
 * قواعد:
 *  - درصدی: درصد × سبد (رو به پایین گرد می‌شود)
 *  - سقف تخفیف (maxDiscount) اعمال می‌شود
 *  - تخفیف هرگز از مبلغ سبد بیشتر نیست
 */
export function computeCouponDiscount(
  coupon: { type: string; value: number | string; maxDiscount?: number | string | null },
  subtotal: number,
): number {
  let discount =
    coupon.type === 'percent'
      ? Math.floor((subtotal * Number(coupon.value)) / 100)
      : Number(coupon.value);
  if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) discount = Number(coupon.maxDiscount);
  return Math.min(discount, subtotal);
}
