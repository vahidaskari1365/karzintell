import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { AuditLog } from "../database/entities";

export interface AuditEntry {
  userId?: number | null;
  action: string;
  subjectType?: string;
  subjectId?: number | string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ip?: string;
  userAgent?: string;
}

/** ثبت رخدادهای حساس پنل ادمین در جدول audit_logs */
@Injectable()
export class AuditService {
  constructor(@InjectDataSource() private ds: DataSource) {}

  async record(e: AuditEntry, manager?: DataSource["manager"]): Promise<void> {
    try {
      const repo = (manager ?? this.ds.manager).getRepository(AuditLog);
      await repo.insert({
        userId: e.userId ?? null,
        action: e.action,
        subjectType: e.subjectType ?? null,
        subjectId: e.subjectId != null ? Number(e.subjectId) : null,
        oldValues: e.oldValues == null ? null : (e.oldValues as object),
        newValues: e.newValues == null ? null : (e.newValues as object),
        ip: e.ip ?? null,
        userAgent: e.userAgent ?? null,
      });
    } catch {
      // لاگ حساسیت نباید تراکنش اصلی را شکست دهد
    }
  }
}
