// apps/webapp/src/lib/api.ts
import { getInitData } from './telegram';

/**
 * Auth against backend using Telegram initData.
 * - In Telegram → sends real initData
 * - In browser dev (no initData) → optional dev bypass
 */
export async function authWithBackend() {
  const initData = getInitData() || '';

  // Dev bypass so you can open the app in a normal browser during development
  const url = initData
    ? '/api/auth/telegram'
    : '/api/auth/telegram?dev_user=999000';

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(text || 'auth_failed');
  }

  return r.json() as Promise<{ tgId: string; username: string | null; name: string | null; dev?: boolean }>;
}

/** Shop directory */
export async function fetchShopList(tgId: string) {
  const u = new URL('/api/shops/list', window.location.origin);
  u.searchParams.set('userId', tgId);
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error('shop_list_failed');
  return r.json() as Promise<{
    universal: { title: string; key: 'universal' };
    myShops: { id: string; slug: string; name: string }[];
    joinedShops: { id: string; slug: string; name: string }[];
  }>;
}

/** Create a new tenant and make the current user OWNER */
export async function createShop(name: string) {
  const r = await fetch('/api/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ tenant: { id: string; slug: string; name: string } }>;
}
