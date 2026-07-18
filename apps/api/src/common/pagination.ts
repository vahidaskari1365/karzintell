import { Transform } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { clamp, normalizeDigits } from "./utils";

export class PageQuery {
  @IsOptional()
  @Transform(({ value }) => parseInt(normalizeDigits(String(value ?? "1")), 10) || 1)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => clamp(parseInt(normalizeDigits(String(value ?? "20")), 10) || 20, 1, 100))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export function paginate<T>(items: T[], total: number, q: PageQuery) {
  return { data: items, meta: { page: q.page, limit: q.limit, total } as PageMeta };
}
