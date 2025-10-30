// apps/webapp/src/screens/ShopListScreen.tsx
import { useEffect, useState } from 'react';
import { authWithBackend } from '../lib/tg';
import { fetchShopList, createShop } from '../lib/api';

type Props = {
  onOpenUniversal: () => void;
  onOpenShop: (slug: string) => void;
};

export default function ShopListScreen({ onOpenUniversal, onOpenShop }: Props) {
  const [tgId, setTgId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ myShops: any[]; joinedShops: any[]; universal: any } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const me = await authWithBackend('/api');
        setTgId(me.tgId);
        const list = await fetchShopList(me.tgId);
        setData(list);
      } catch (e: any) {
        setErr(e?.message || 'failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreateShop() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { tenant } = await createShop(name.trim());
      onOpenShop(tenant.slug);
    } catch (e: any) {
      setErr(e?.message || 'create_failed');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (err) return <div style={{ padding: 16, color: 'crimson' }}>Error: {err}</div>;
  if (!data) return null;

  const { universal, myShops, joinedShops } = data;

  return (
    <div style={{ padding: 12, display: 'grid', gap: 12 }}>
      <h2 style={{ textAlign: 'center' }}>TG Shop</h2>

      {/* Universal */}
      <button
        onClick={onOpenUniversal}
        style={{ padding: 12, borderRadius: 10, border: '1px solid #ddd', fontWeight: 600 }}
      >
        🌍 {universal.title}
      </button>

      {/* My Shops */}
      <section>
        <h3>🛒 My Shops</h3>
        {myShops.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {myShops.map((s) => (
              <button key={s.id} onClick={() => onOpenShop(s.slug)} className="btn">
                {s.name}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ padding: 8, border: '1px dashed #ccc', borderRadius: 8 }}>
            You don’t own a shop yet.
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                placeholder="Shop name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ flex: 1, padding: 8 }}
              />
              <button onClick={handleCreateShop} disabled={creating}>
                {creating ? 'Creating…' : '➕ Create'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Joined Shops */}
      <section>
        <h3>🤝 Joined Shops</h3>
        {joinedShops.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {joinedShops.map((s) => (
              <button key={s.id} onClick={() => onOpenShop(s.slug)} className="btn">
                {s.name}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ color: '#666' }}>No joined shops yet.</div>
        )}
      </section>
    </div>
  );
}
