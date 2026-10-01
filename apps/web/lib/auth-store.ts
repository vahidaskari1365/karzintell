'use client';

import { create } from 'zustand';

export interface Me {
  id: number;
  fullName: string;
  email: string | null;
  phone: string;
  roles: string[];
  permissions: string[] | '*';
  mustChangePassword: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: Me | null;
  hydrated: boolean;
  setAuth: (token: string, user: Me) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  hydrated: false,
  setAuth: (accessToken, user) => set({ accessToken, user, hydrated: true }),
  clearAuth: () => set({ accessToken: null, user: null, hydrated: true }),
  setHydrated: () => set({ hydrated: true }),
}));

export const hasPermission = (user: Me | null, perm: string): boolean => {
  if (!user) return false;
  if (user.permissions === '*') return true;
  return user.permissions.includes(perm);
};

// ------------------------------------------------------------- Toast
export interface ToastItem {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastItem['kind'], message: string) => void;
  remove: (id: number) => void;
}

let toastSeq = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().push('success', m),
  error: (m: string) => useToastStore.getState().push('error', m),
  info: (m: string) => useToastStore.getState().push('info', m),
};

/** کارت سشن مهمان */
export function getCartSession(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem('krz_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem('krz_sid', sid);
    document.cookie = `krz_sid=${sid};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  }
  return sid;
}
