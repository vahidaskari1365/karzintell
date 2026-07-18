import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { CacheService } from "./cache.service";

/**
 * محاسبه مجوزهای مؤثر کاربر:  (مجوزهای نقش‌ها) ∪ (allowهای شخصی) − (denyهای شخصی)
 * کش در CacheService با کلید نسخه‌دار؛ هر تغییر نقش/مجوز نسخه را بالا می‌برد.
 */
@Injectable()
export class PermissionsResolverService {
  constructor(
    @InjectDataSource() private ds: DataSource,
    private cache: CacheService,
  ) {}

  private async version(userId: number): Promise<number> {
    const v = await this.cache.get(`permver:${userId}`);
    return v ? parseInt(v, 10) : 1;
  }

  async bumpVersion(userId: number): Promise<void> {
    await this.cache.incr(`permver:${userId}`);
  }

  async resolve(userId: number): Promise<{ permissions: Set<string>; mustChangePassword: boolean }> {
    const ver = await this.version(userId);
    const cacheKey = `perms:${userId}:v${ver}`;
    return this.cache.wrap(cacheKey, 300, async () => {
      const user = await this.ds.query(`SELECT must_change_password FROM users WHERE id = ? LIMIT 1`, [userId]);
      if (!user[0]) return { permissions: [], mustChangePassword: false };
      const rows: { name: string }[] = await this.ds.query(
        `SELECT DISTINCT p.name FROM permissions p
         JOIN permission_role pr ON pr.permission_id = p.id
         JOIN role_user ru ON ru.role_id = pr.role_id
         WHERE ru.user_id = ?`,
        [userId],
      );
      const set = new Set(rows.map((r) => r.name));
      const personal: { name: string; type: "allow" | "deny" }[] = await this.ds.query(
        `SELECT p.name, pu.type FROM permission_user pu JOIN permissions p ON p.id = pu.permission_id WHERE pu.user_id = ?`,
        [userId],
      );
      for (const row of personal) {
        if (row.type === "allow") set.add(row.name);
        else set.delete(row.name);
      }
      return { permissions: [...set], mustChangePassword: !!user[0].must_change_password };
    }).then((data) => ({ permissions: new Set(data.permissions), mustChangePassword: data.mustChangePassword }));
  }
}
