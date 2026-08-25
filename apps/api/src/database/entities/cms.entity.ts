import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type BannerPosition = 'home_hero' | 'home_middle' | 'home_bottom' | 'category_top' | 'sidebar';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 150 })
  title: string;

  @Column({ length: 300, nullable: true })
  subtitle: string | null;

  @Column({ name: 'image_path', length: 500 })
  imagePath: string;

  @Column({ name: 'mobile_image_path', length: 500, nullable: true })
  mobileImagePath: string | null;

  @Column({ name: 'link_url', length: 500, nullable: true })
  linkUrl: string | null;

  @Column({ type: 'varchar', length: 30, default: 'home_hero' })
  @Index()
  position: BannerPosition;

  @Column({ name: 'sort_order', type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: boolean;

  // MySQL uses datetime instead of timestamptz
  @Column({ name: 'starts_at', type: 'datetime', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'datetime', nullable: true })
  endsAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 190 })
  title: string;

  @Column({ length: 220, unique: true })
  slug: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'published';

  @Column({ name: 'meta_title', length: 190, nullable: true })
  metaTitle: string | null;

  @Column({ name: 'meta_description', length: 300, nullable: true })
  metaDescription: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime' })
  deletedAt: Date | null;
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  @Index()
  userId: number;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true, nullable: true })
  orderId: number | null;

  @Column({ name: 'assigned_to', type: 'bigint', unsigned: true, nullable: true })
  @Index()
  assignedTo: number | null;

  @Column({ length: 190 })
  subject: string;

  @Column({ type: 'varchar', length: 30, default: 'support' })
  department: 'sales' | 'support' | 'technical' | 'financial' | 'other';

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @Column({ type: 'varchar', length: 30, default: 'open' })
  @Index()
  status: 'open' | 'pending_support' | 'pending_customer' | 'closed';

  @Column({ name: 'closed_at', type: 'datetime', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'ticket_id', type: 'bigint', unsigned: true })
  @Index()
  ticketId: number;

  @Column({ name: 'sender_id', type: 'bigint', unsigned: true })
  senderId: number;

  @Column({ type: 'text' })
  body: string;

  // MySQL uses json instead of jsonb
  @Column({ type: 'json', nullable: true })
  attachments: number[] | null;

  @Column({ name: 'is_internal', type: 'tinyint', width: 1, default: 0 })
  isInternal: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

export type BlogKind = 'post' | 'news';

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 190 })
  title: string;

  @Column({ length: 220, unique: true })
  slug: string;

  @Column({ length: 500, nullable: true })
  excerpt: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'cover_path', length: 500, nullable: true })
  coverPath: string | null;

  @Column({ type: 'varchar', length: 10, default: 'post' })
  kind: BlogKind;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'published';

  @Column({ name: 'author_id', type: 'bigint', unsigned: true, nullable: true })
  authorId: number | null;

  @Column({ name: 'meta_title', length: 190, nullable: true })
  metaTitle: string | null;

  @Column({ name: 'meta_description', length: 300, nullable: true })
  metaDescription: string | null;

  // MySQL uses datetime instead of timestamptz
  @Column({ name: 'published_at', type: 'datetime', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime' })
  deletedAt: Date | null;
}

@Entity('faqs')
export class Faq {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 300 })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ name: 'sort_order', type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
