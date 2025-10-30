import { useEffect, useState } from "react";
import { api } from "../lib/api/index";

type Tenant = { id: string; slug: string; name: string; publicPhone?: string | null };

export default function ShopList({ onOpenShop, onOpenUniversal, onCreate }: {
  onOpenShop: (slug: string) => void;
  onOpenUniversal: () => void;
  onCreate: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState<Tenant[]>([]);
  const [joined, setJoined] = useState<Tenant[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api<{ universal: any; myShops: Tenant[]; joinedShops: Tenant[] }>("/shops/list");
        setOwned(r.myShops || []);
        setJoined(r.joinedShops || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 12, display: "grid", gap: 12 }}>
      <h3>🌍 Universal Shop</h3>
      <button onClick={onOpenUniversal} style={btn}>Open Universal</button>

      <h3>🛒 My Shops</h3>
      {owned.length === 0 ? <div style={muted}>You don’t own any shops yet.</div> : (
        <ul style={list}>
          {owned.map(s => <li key={s.id}><button onClick={() => onOpenShop(s.slug)} style={linkBtn}>{s.name}</button></li>)}
        </ul>
      )}
      <button onClick={onCreate} style={btn}>Create a new shop</button>

      <h3>🤝 Joined Shops</h3>
      {joined.length === 0 ? <div style={muted}>No invitations yet.</div> : (
        <ul style={list}>
          {joined.map(s => <li key={s.id}><button onClick={() => onOpenShop(s.slug)} style={linkBtn}>{s.name}</button></li>)}
        </ul>
      )}
    </div>
  );
}

const btn: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)", background: "transparent" };
const linkBtn: React.CSSProperties = { ...btn, border: "none", textDecoration: "underline", padding: 0 };
const list: React.CSSProperties = { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 };
const muted: React.CSSProperties = { opacity: .7 };
