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

  @Column({
    type: 'enum',
    enum: ['home_hero', 'home_middle', 'home_bottom', 'category_top', 'sidebar'],
    default: 'home_hero',
  })
  @Index()
  position: BannerPosition;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'starts_at', type: 'datetime', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'datetime', nullable: true })
  endsAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
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

  @Column({ type: 'longtext' })
  body: string;

  @Column({ type: 'enum', enum: ['draft', 'published'], default: 'draft' })
  status: 'draft' | 'published';

  @Column({ name: 'meta_title', length: 190, nullable: true })
  metaTitle: string | null;

  @Column({ name: 'meta_description', length: 300, nullable: true })
  metaDescription: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
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

  @Column({ length: 190 })
  subject: string;

  @Column({
    type: 'enum',
    enum: ['sales', 'support', 'technical', 'financial', 'other'],
    default: 'support',
  })
  department: 'sales' | 'support' | 'technical' | 'financial' | 'other';

  @Column({ type: 'enum', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @Column({
    type: 'enum',
    enum: ['open', 'pending_support', 'pending_customer', 'closed'],
    default: 'open',
  })
  @Index()
  status: 'open' | 'pending_support' | 'pending_customer' | 'closed';

  @Column({ name: 'closed_at', type: 'datetime', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
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

  @Column({ type: 'json', nullable: true })
  attachments: number[] | null;

  @Column({ name: 'is_internal', default: false })
  isInternal: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
