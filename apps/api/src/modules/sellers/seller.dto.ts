import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Regex شماره موبایل ایران */
const PHONE_REGEX = /^09\d{9}$/;
/** Regex کد اقتصادی/شناسه ملی — فقط عدد */
const NUMERIC_REGEX = /^\d{5,20}$/;

/**
 * درخواست تبدیل شدن به فروشنده
 *
 * کاربر با این فرم درخواست فروشندگی می‌دهد. نام و اسلاگ فروشگاه به‌صورت
 * خودکار از روی store_name تولید می‌شوند (در سرویس).
 */
export class BecomeSellerDto {
  @IsString({ message: 'نام فروشگاه باید رشته باشد' })
  @IsNotEmpty({ message: 'نام فروشگاه الزامی است' })
  @MinLength(3, { message: 'نام فروشگاه حداقل ۳ کاراکتر باشد' })
  @MaxLength(190, { message: 'نام فروشگاه نهایتاً ۱۹۰ کاراکتر باشد' })
  storeName: string;

  @IsOptional()
  @IsString({ message: 'توضیحات باید رشته باشد' })
  @MaxLength(2000, { message: 'توضیحات نهایتاً ۲۰۰۰ کاراکتر باشد' })
  description?: string;

  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'شماره تماس فروشگاه معتبر نیست (09xxxxxxxxx)' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'ایمیل فروشگاه معتبر نیست' })
  @MaxLength(190, { message: 'ایمیل نهایتاً ۱۹۰ کاراکتر باشد' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'آدرس باید رشته باشد' })
  @MaxLength(1000, { message: 'آدرس نهایتاً ۱۰۰۰ کاراکتر باشد' })
  address?: string;

  /** کد اقتصادی — اختیاری ولی در صورت ورود، معتبر باید باشد */
  @IsOptional()
  @IsString({ message: 'کد اقتصادی باید رشته باشد' })
  @MaxLength(50, { message: 'کد اقتصادی نهایتاً ۵۰ کاراکتر باشد' })
  economicCode?: string;

  /** شماره ثبت شرکت/فروشگاه */
  @IsOptional()
  @IsString({ message: 'شماره ثبت باید رشته باشد' })
  @MaxLength(50, { message: 'شماره ثبت نهایتاً ۵۰ کاراکتر باشد' })
  registrationNumber?: string;

  /** شناسه ملی/کد ملی فروشنده یا شرکت */
  @IsOptional()
  @IsString({ message: 'شناسه ملی باید رشته باشد' })
  @MaxLength(20, { message: 'شناسه ملی نهایتاً ۲۰ کاراکتر باشد' })
  nationalId?: string;
}

/**
 * ویرایش پروفایل فروشندگی توسط خود فروشنده
 *
 * فقط در صورتی قابل ویرایش است که پروفایل تأیید شده باشد (assertApproved).
 * فیلدهای مالی/تأییدی (مثل commissionRate، status) از این DTO قابل تغییر نیستند.
 */
export class UpdateSellerProfileDto {
  @IsOptional()
  @IsString({ message: 'نام فروشگاه باید رشته باشد' })
  @MinLength(3, { message: 'نام فروشگاه حداقل ۳ کاراکتر باشد' })
  @MaxLength(190, { message: 'نام فروشگاه نهایتاً ۱۹۰ کاراکتر باشد' })
  storeName?: string;

  @IsOptional()
  @IsString({ message: 'توضیحات باید رشته باشد' })
  @MaxLength(2000, { message: 'توضیحات نهایتاً ۲۰۰۰ کاراکتر باشد' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'مسیر لوگو باید رشته باشد' })
  @MaxLength(500, { message: 'مسیر لوگو نهایتاً ۵۰۰ کاراکتر باشد' })
  logoPath?: string;

  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'شماره تماس فروشگاه معتبر نیست (09xxxxxxxxx)' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'ایمیل فروشگاه معتبر نیست' })
  @MaxLength(190, { message: 'ایمیل نهایتاً ۱۹۰ کاراکتر باشد' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'آدرس باید رشته باشد' })
  @MaxLength(1000, { message: 'آدرس نهایتاً ۱۰۰۰ کاراکتر باشد' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'کد اقتصادی باید رشته باشد' })
  @MaxLength(50, { message: 'کد اقتصادی نهایتاً ۵۰ کاراکتر باشد' })
  economicCode?: string;

  @IsOptional()
  @IsString({ message: 'شماره ثبت باید رشته باشد' })
  @MaxLength(50, { message: 'شماره ثبت نهایتاً ۵۰ کاراکتر باشد' })
  registrationNumber?: string;

  @IsOptional()
  @IsString({ message: 'شناسه ملی باید رشته باشد' })
  @MaxLength(20, { message: 'شناسه ملی نهایتاً ۲۰ کاراکتر باشد' })
  nationalId?: string;
}

/**
 * بررسی درخواست فروشندگی توسط ادمین — تأیید یا رد
 *
 * در صورت تأیید، نقش «seller» به کاربر اختصاص می‌یابد.
 */
export class AdminReviewSellerDto {
  @IsEnum(['approved', 'rejected'] as const, {
    message: 'وضعیت باید approved یا rejected باشد',
  })
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString({ message: 'دلیل رد باید رشته باشد' })
  @MaxLength(2000, { message: 'دلیل رد نهایتاً ۲۰۰۰ کاراکتر باشد' })
  rejectionReason?: string;

  @IsOptional()
  @IsString({ message: 'نرخ کمیسیون باید عدد باشد' })
  commissionRate?: string;
}
