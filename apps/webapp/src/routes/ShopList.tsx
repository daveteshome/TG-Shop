// src/routes/ShopList.tsx
import { useEffect, useState } from "react";
import { api } from "../lib/api/index";

type Tenant = { id: string; slug: string; name: string; publicPhone?: string | null };

export default function ShopList() {
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState<Tenant[]>([]);
  const [joined, setJoined] = useState<Tenant[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api<{ universal: any; myShops: Tenant[]; joinedShops: Tenant[] }>(
          "/shops/list"
        );
        setOwned(r.myShops || []);
        setJoined(r.joinedShops || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 12 }}>Loading…</div>;

  return (
    <div style={{ padding: 12, display: "grid", gap: 12 }}>
      <h2>Shops</h2>

      {/* Universal */}
      <div>
        <h3>🌍 Universal Shop</h3>
        <a href="/universal" style={btn}>
          Open Universal
        </a>
      </div>

      {/* My shops */}
      <div>
        <h3>🏪 My Shops</h3>
        {owned.length === 0 ? (
          <div style={muted}>You don’t own any shops yet.</div>
        ) : (
          <ul style={list}>
            {owned.map((s) => (
              <li key={s.id}>
                <a href={`/shop/${s.slug}`} style={linkBtn}>
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Joined shops */}
      <div>
        <h3>🤝 Joined Shops</h3>
        {joined.length === 0 ? (
          <div style={muted}>No joined shops yet.</div>
        ) : (
          <ul style={list}>
            {joined.map((s) => (
              <li key={s.id}>
                <a href={`/shop/${s.slug}`} style={linkBtn}>
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.15)",
  display: "inline-block",
};

const list: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: 6,
};

const linkBtn: React.CSSProperties = {
  textDecoration: "underline",
  color: "inherit",
};

const muted: React.CSSProperties = { opacity: 0.65 };
