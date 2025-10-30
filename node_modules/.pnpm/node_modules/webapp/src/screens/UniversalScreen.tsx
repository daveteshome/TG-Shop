// apps/webapp/src/screens/UniversalScreen.tsx
import { useEffect, useState } from 'react';

export default function UniversalScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/universal`);
      const { items } = await r.json();
      setItems(items);
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ padding: 12 }}>
      <button onClick={onBack}>← Back</button>
      <h2>Universal Shop</h2>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((p) => (
            <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 700 }}>{p.title}</div>
              <div>{p.currency} {p.price}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {/* Message Seller */}
                <a
                  href={`https://t.me/${import.meta.env.VITE_BOT_USERNAME}?start=contact_${p.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn"
                >
                  💬 Message Seller
                </a>
                {/* Call Seller */}
                {p.tenant?.publicPhone ? (
                  <a
                    href={`tel:${p.tenant.publicPhone}`}
                    className="btn"
                    onClick={async () => {
                      await fetch(`/api/products/${p.id}/contact`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'call', buyerTgId: '' }),
                      });
                    }}
                  >
                    📞 Call
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
