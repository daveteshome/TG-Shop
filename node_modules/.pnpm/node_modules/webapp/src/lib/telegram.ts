// webapp/src/lib/telegram.ts
let _cachedRaw: string | null = null;
let _cachedDecoded: string | null = null;

function setCache(raw: string) {
  _cachedRaw = raw;
  try {
    sessionStorage.setItem("tg_init_data_raw", raw);
  } catch {}
}

export function getTelegramWebApp(): any | null {
  // @ts-ignore
  return (window as any).Telegram?.WebApp || null;
}

export function getInitDataRaw(): string | null {
  // 1) if we already have it in memory, use it
  if (_cachedRaw) return _cachedRaw;

  // 2) if we are REALLY inside Telegram, ALWAYS prefer fresh Telegram data
  try {
    const tg = getTelegramWebApp();
    const tgInit = tg?.initData;
    if (tgInit && typeof tgInit === "string" && tgInit.length > 0) {
      setCache(tgInit);
      return tgInit;
    }
  } catch {}

  // 3) sometimes Telegram passes it in the URL (tgWebAppData=...)
  try {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const tgWebAppData = params.get("tgWebAppData");
    if (tgWebAppData) {
      setCache(tgWebAppData);
      return tgWebAppData;
    }
  } catch {}

  // 4) ONLY AS LAST RESORT: use sessionStorage
  //    (this is what was causing the issue for 2 different users in the same browser)
  try {
    const stored = sessionStorage.getItem("tg_init_data_raw");
    if (stored) {
      _cachedRaw = stored;
      return stored;
    }
  } catch {}

  return null;
}

export function getInitData(): string | null {
  if (_cachedDecoded) return _cachedDecoded;
  const raw = getInitDataRaw();
  if (!raw) return null;
  try {
    _cachedDecoded = decodeURIComponent(raw);
  } catch {
    _cachedDecoded = raw;
  }
  return _cachedDecoded;
}

export function ensureInitDataCached(): string | null {
  return getInitDataRaw();
}

export function ready() {
  try {
    const tg = getTelegramWebApp();
    tg?.ready?.();
    tg?.expand?.();
  } catch {}
}

export function getTelegramUser(): {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  phone?: string;
} | null {
  try {
    const raw = getInitDataRaw();
    if (!raw) return null;

    const params = new URLSearchParams(raw);
    const userRaw = params.get("user");
    if (!userRaw) return null;

    const user = JSON.parse(decodeURIComponent(userRaw));
    
    return {
      id: user?.id?.toString(),
      firstName: user?.first_name,
      lastName: user?.last_name,
      username: user?.username,
      languageCode: user?.language_code,
      phone: user?.phone_number, // Only available if user granted permission
    };
  } catch (e) {
    console.error("Failed to parse Telegram user data:", e);
    return null;
  }
}
