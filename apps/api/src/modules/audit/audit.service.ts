import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities';
import { paginate } from '../../common/utils';

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'secret', 'accessToken', 'refreshToken', 'newPassword', 'currentPassword'];

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  /** ثبت لاگ با حذف فیلدهای حساس */
  async record(input: {
    userId: number | null;
    action: string;
    subjectType?: string | null;
    subjectId?: number | null;
    newValues?: Record<string, unknown> | null;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    try {
      await this.logs.save(
        this.logs.create({
          userId: input.userId,
          action: input.action,
          subjectType: input.subjectType ?? null,
          subjectId: input.subjectId ?? null,
          newValues: input.newValues ? this.redact(input.newValues) : null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ? input.userAgent.slice(0, 255) : null,
        }),
      );
    } catch (e) {
      this.logger.warn(`audit failed: ${(e as Error).message}`);
    }
  }

  private redact(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s.toLowerCase()))) out[k] = '[REDACTED]';
      else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = this.redact(v as any);
      else out[k] = v;
    }
    return out;
  }

  async list(query: { page?: string; limit?: string; userId?: string; action?: string }) {
    const p = paginate(query.page, query.limit);
    const qb = this.logs
      .createQueryBuilder('a')
      .leftJoin('users', 'u', 'u.id = a.user_id')
      .select(['a.*', 'u.full_name AS userName'])
      .orderBy('a.id', 'DESC')
      .offset(p.skip)
      .limit(p.limit);
    if (query.userId) qb.andWhere('a.user_id = :uid', { uid: Number(query.userId) });
    if (query.action) qb.andWhere('a.action LIKE :act', { act: `%${query.action}%` });
    const [items, total] = await Promise.all([qb.getRawMany(), qb.clone().select('COUNT(*)', 'cnt').getRawOne()]);
    return { items, total: Number(total?.cnt || 0), page: p.page, limit: p.limit };
  }
}
