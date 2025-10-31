import { getInitData } from "./telegram";

/**
 * Auth against backend using Telegram initData.
 * - In Telegram → sends real initData
 * - In browser dev (no initData) → dev bypass ?dev_user=999000
 */
export async function authWithBackend() {
  const initData = getInitData() || "";

  const url = initData
    ? "/api/auth/telegram"
    : "/api/auth/telegram?dev_user=999000";

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || "auth_failed");
  }

  return r.json() as Promise<{
    tgId: string;
    username: string | null;
    name: string | null;
    dev?: boolean;
  }>;
}

/** Shop directory */
export async function fetchShopList(tgId?: string) {
  const initData = getInitData() || "";

  // if we have real initData → normal call
  // if NOT → use dev_user like auth does
  const u = initData
    ? new URL("/api/shops/list", window.location.origin)
    : new URL("/api/shops/list?dev_user=999000", window.location.origin);

  if (tgId) {
    u.searchParams.set("userId", tgId);
  }

  const r = await fetch(u.toString());
  if (!r.ok) throw new Error("shop_list_failed");
  return r.json() as Promise<{
    universal: { title: string; key: "universal" };
    myShops: { id: string; slug: string; name: string }[];
    joinedShops: { id: string; slug: string; name: string }[];
  }>;
}

/** Create a new tenant and make the current user OWNER */
export async function createShop(name: string) {
  const initData = getInitData() || "";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (initData) headers["Authorization"] = `tma ${initData}`;

  const r = await fetch("/api/tenants", {
    method: "POST",
    headers,
    body: JSON.stringify({ name }), // ✅ only send name
  });

  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ tenant: { id: string; slug: string; name: string } }>;
}
