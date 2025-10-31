let _cachedRaw: string | null = null;
let _cachedDecoded: string | null = null;

function setCache(raw: string) {
  _cachedRaw = raw;
  try { sessionStorage.setItem("tg_init_data_raw", raw); } catch {}
}

export function getTelegramWebApp(): any | null {
  // @ts-ignore
  return (window as any).Telegram?.WebApp || null;
}

export function getInitDataRaw(): string | null {
  if (_cachedRaw) return _cachedRaw;

  try {
    const tg = getTelegramWebApp();
    const tgInit = tg?.initData;
    if (tgInit && typeof tgInit === "string" && tgInit.length > 0) {
      setCache(tgInit);
      return tgInit;
    }
  } catch {}

  try {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const tgWebAppData = params.get("tgWebAppData");
    if (tgWebAppData) {
      setCache(tgWebAppData);
      return tgWebAppData;
    }
  } catch {}

  try {
    const search = new URLSearchParams(window.location.search);
    const initData = search.get("tgWebAppData") || search.get("initData");
    if (initData) {
      setCache(initData);
      return initData;
    }
  } catch {}

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
  try { _cachedDecoded = decodeURIComponent(raw); } catch { _cachedDecoded = raw; }
  return _cachedDecoded;
}

export function ensureInitDataCached(): string | null {
  const got = getInitDataRaw();
  return got;
}

export function ready() {
  try {
    const tg = getTelegramWebApp();
    tg?.ready?.();
    tg?.expand?.();
  } catch {}
}
