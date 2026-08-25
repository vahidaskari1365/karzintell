import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'product_id', type: 'bigint', unsigned: true })
  @Index()
  productId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'order_item_id', type: 'bigint', unsigned: true, nullable: true })
  orderItemId: number | null;

  @Column({ type: 'tinyint', unsigned: true })
  rating: number;

  @Column({ length: 150, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  // MySQL uses json instead of jsonb
  @Column({ type: 'json', nullable: true })
  pros: string[] | null;

  @Column({ type: 'json', nullable: true })
  cons: string[] | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ReviewStatus;

  @Column({ name: 'seller_reply', type: 'text', nullable: true })
  sellerReply: string | null;

  // MySQL uses datetime instead of timestamptz
  @Column({ name: 'replied_at', type: 'datetime', nullable: true })
  repliedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime' })
  deletedAt: Date | null;
}

export type QuestionStatus = 'pending' | 'answered' | 'approved' | 'rejected';

@Entity('product_questions')
export class ProductQuestion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'product_id', type: 'bigint', unsigned: true })
  @Index()
  productId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text', nullable: true })
  answer: string | null;

  @Column({ name: 'answered_by', type: 'bigint', unsigned: true, nullable: true })
  answeredBy: number | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: QuestionStatus;

  // MySQL uses datetime instead of timestamptz
  @Column({ name: 'answered_at', type: 'datetime', nullable: true })
  answeredAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

@Entity('wishlists')
export class Wishlist {
  @PrimaryColumn({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @PrimaryColumn({ name: 'product_id', type: 'bigint', unsigned: true })
  productId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}

@Entity('product_compares')
export class ProductCompare {
  @PrimaryColumn({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @PrimaryColumn({ name: 'product_id', type: 'bigint', unsigned: true })
  productId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
