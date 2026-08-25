import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'product_id', type: 'bigint' })
  @Index()
  productId: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Column({ name: 'order_item_id', type: 'bigint', nullable: true })
  orderItemId: number | null;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ length: 150, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'jsonb', nullable: true })
  pros: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  cons: string[] | null;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: ReviewStatus;

  @Column({ name: 'seller_reply', type: 'text', nullable: true })
  sellerReply: string | null;

  @Column({ name: 'replied_at', type: 'timestamptz', nullable: true })
  repliedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}

export type QuestionStatus = 'pending' | 'answered' | 'approved' | 'rejected';

@Entity('product_questions')
export class ProductQuestion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'product_id', type: 'bigint' })
  @Index()
  productId: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text', nullable: true })
  answer: string | null;

  @Column({ name: 'answered_by', type: 'bigint', nullable: true })
  answeredBy: number | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'answered', 'approved', 'rejected'],
    default: 'pending',
  })
  status: QuestionStatus;

  @Column({ name: 'answered_at', type: 'timestamptz', nullable: true })
  answeredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('wishlists')
export class Wishlist {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId: number;

  @PrimaryColumn({ name: 'product_id', type: 'bigint' })
  productId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('product_compares')
export class ProductCompare {
  @PrimaryColumn({ name: 'user_id', type: 'bigint' })
  userId: number;

  @PrimaryColumn({ name: 'product_id', type: 'bigint' })
  productId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
