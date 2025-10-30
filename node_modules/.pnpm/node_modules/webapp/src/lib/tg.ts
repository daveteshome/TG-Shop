// apps/webapp/src/lib/tg.ts
export function getInitData() {
  const anyWin = window as any;
  return anyWin?.Telegram?.WebApp?.initData || '';
}

export async function authWithBackend(apiBase: string) {
  const initData = getInitData();
  const resp = await fetch(`${apiBase}/auth/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });
  if (!resp.ok) throw new Error('auth_failed');
  return resp.json(); // { tgId, username, name }
}
