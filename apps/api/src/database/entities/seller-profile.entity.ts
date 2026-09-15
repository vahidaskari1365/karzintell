import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

/**
 * پروفایل فروشنده — اطلاعات تجاری و وضعیت تأیید فروشنده
 *
 * وقتی یک کاربر درخواست فروشندگی می‌دهد، یک رکورد SellerProfile با status=pending
 * ساخته می‌شود. ادمین می‌تواند آن را approve/reject کند.
 *
 * پس از تأیید، نقش "seller" به کاربر اختصاص می‌یابد و کاربر می‌تواند به پنل
 * فروشنده دسترسی داشته باشد و محصولات خود را اضافه کند.
 */
@Entity('seller_profiles')
export class SellerProfile {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  /** شناسه کاربر مرتبط — رابطه یک‌به‌یک با users.id */
  @Column({ name: 'user_id', type: 'int', unsigned: true, unique: true })
  @Index()
  userId: number;

  /** نام فروشگاه — نمایش داده می‌شود در صفحه فروشنده */
  @Column({ name: 'store_name', type: 'varchar', length: 190 })
  storeName: string;

  /** اسلاگ فروشگاه — برای URL (مثلاً /sellers/my-store) */
  @Column({ name: 'store_slug', type: 'varchar', length: 190, unique: true })
  storeSlug: string;

  /** توضیحات درباره فروشگاه */
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  /** آدرس لوگوی فروشگاه */
  @Column({ name: 'logo_path', type: 'varchar', length: 500, nullable: true })
  logoPath: string | null;

  /** شماره تماس فروشگاه (ممکن است با شماره کاربر متفاوت باشد) */
  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  /** ایمیل فروشگاه */
  @Column({ type: 'varchar', length: 190, nullable: true })
  email: string | null;

  /** آدرس فروشگاه — برای فاکتور و ارسال */
  @Column({ name: 'address', type: 'text', nullable: true })
  address: string | null;

  /** کد اقتصادی — برای فاکتور رسمی */
  @Column({ name: 'economic_code', type: 'varchar', length: 50, nullable: true })
  economicCode: string | null;

  /** شماره ثبت */
  @Column({ name: 'registration_number', type: 'varchar', length: 50, nullable: true })
  registrationNumber: string | null;

  /** شماره ملی/شناسه ملی */
  @Column({ name: 'national_id', type: 'varchar', length: 20, nullable: true })
  nationalId: string | null;

  /**
   * نرخ کمیسیون فروشگاه (درصد) — در صد از هر فروش کسر می‌شود.
   * پیش‌فرض: 5% (قابل تغییر توسط ادمین)
   */
  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: 5.00, transformer: {
    to: (v?: number | null) => v ?? 5,
    from: (v?: string | number | null) => (v == null ? 5 : Number(v)),
  } })
  commissionRate: number;

  /** وضعیت درخواست فروشندگی */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: SellerStatus;

  /** دلیل رد/تعلیق (در صورت وجود) */
  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  /** شناسه کاربری که درخواست را بررسی/تأیید کرده */
  @Column({ name: 'reviewed_by', type: 'int', unsigned: true, nullable: true })
  reviewedBy: number | null;

  @Column({ name: 'reviewed_at', type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  /** تعداد محصولات فعال فروشنده (محاسبه می‌شود) */
  @Column({ name: 'product_count', type: 'int', unsigned: true, default: 0 })
  productCount: number;

  /** امتیاز فروشنده (بر اساس نظرات) */
  @Column({ name: 'rating_avg', type: 'decimal', precision: 3, scale: 2, default: 0, transformer: {
    to: (v?: number | null) => v ?? 0,
    from: (v?: string | number | null) => (v == null ? 0 : Number(v)),
  } })
  ratingAvg: number;

  @Column({ name: 'rating_count', type: 'int', unsigned: true, default: 0 })
  ratingCount: number;

  /** آیا فروشنده ویترین شده (featured) */
  @Column({ name: 'is_featured', type: 'tinyint', width: 1, default: 0 })
  isFeatured: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
