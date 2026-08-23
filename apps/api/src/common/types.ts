import { Request } from 'express';

/** کاربر احرازشده که روی request قرار می‌گیرد */
export interface AuthUser {
  id: number;
  fullName: string;
  email: string | null;
  phone: string;
  roles: string[];
  permissions: string[] | '*';
  mustChangePassword: boolean;
}

export interface RequestWithUser extends Request {
  user: AuthUser;
  idempotencyKey?: string;
  cartSessionId?: string;
}

export interface JwtAccessPayload {
  sub: number;
  typ: 'access';
}

export interface JwtRefreshPayload {
  sub: number;
  typ: 'refresh';
  jti: string;
}

/** پاسخ استاندارد */
export interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
}

export const isSuper = (u: AuthUser | undefined): boolean =>
  !!u && (u.permissions === '*' || u.roles.includes('super_admin'));

export const hasPerm = (u: AuthUser | undefined, perm: string): boolean =>
  !!u && (u.permissions === '*' || (Array.isArray(u.permissions) && u.permissions.includes(perm)));
