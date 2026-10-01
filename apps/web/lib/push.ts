'use client';

import { api } from './api-client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/** فعال‌سازی اعلان مرورگر: مجوز → subscribe → ثبت در سرور */
export async function enablePush(): Promise<{ enabled: boolean; reason?: string }> {
  if (!isPushSupported()) return { enabled: false, reason: 'مرورگر شما از اعلان پشتیبانی نمی‌کند' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { enabled: false, reason: 'مجوز اعلان داده نشد' };

  const { data } = await api<{ publicKey: string | null }>('/notifications/push/public-key');
  if (!data?.publicKey) return { enabled: false, reason: 'اعلان مرورگر روی سرور فعال نیست' };

  const reg = await navigator.serviceWorker.register('/sw.js');
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
  });
  const json = sub.toJSON();
  await api('/me/notifications/push/subscribe', {
    method: 'POST',
    body: { endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh || '', auth: json.keys?.auth || '' } },
  });
  return { enabled: true };
}

/** لغو اعلان مرورگر */
export async function disablePush(): Promise<void> {
  const sub = await getPushSubscription();
  if (sub) {
    await api('/me/notifications/push/subscribe', { method: 'DELETE', body: { endpoint: sub.endpoint } }).catch(() => undefined);
    await sub.unsubscribe();
  }
}
