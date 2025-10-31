import { useEffect, useState } from "react";
import { api } from "../lib/api/index";
import { createShop } from "../lib/api";

type Tenant = { id: string; slug: string; name: string; publicPhone?: string | null };

export default function ShopList() {
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState<Tenant[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await api<{ universal: any; myShops: Tenant[]; joinedShops: Tenant[] }>(
          "/shops/list"
        );
        setOwned(r.myShops || []);
        if (!r.myShops || r.myShops.length === 0) {
          setShowCreate(true);
        }
      } catch (e: any) {
        setErr(e?.message || "Failed to load shops");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCreateShop() {
    if (!newName.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const res = await createShop(newName.trim());
      const slug = res.tenant.slug;
      window.location.href = `/shop/${slug}`;
    } catch (e: any) {
      setErr(e?.message || "create_failed");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div style={{ padding: 12 }}>Loading…</div>;
  if (err) return <div style={{ padding: 12, color: "crimson" }}>Error: {err}</div>;

  const hasShops = owned.length > 0;

  return (
    <div style={{ padding: 12, display: "grid", gap: 14 }}>
      {/* 🏪 My Shops + button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>🏪 My Shops</h2>
        {hasShops && (
          <button
            onClick={() => {
              setShowCreate((v) => !v);
              setNewName("");
            }}
            style={circleBtn}
            title="Create new shop"
          >
            +
          </button>
        )}
      </div>

      {/* list of shops */}
      {hasShops ? (
        <ul style={list}>
          {owned.map((s) => (
            <li key={s.id}>
              <a href={`/shop/${s.slug}`} style={linkBtn}>
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div style={muted}>You don’t own any shops yet.</div>
      )}

      {/* create form */}
      {showCreate && (
        <div
          style={{
            marginTop: 10,
            border: "1px dashed rgba(0,0,0,.15)",
            borderRadius: 10,
            padding: 10,
            display: "grid",
            gap: 8,
          }}
        >
          {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Shop name"
            style={input}
          />
          <button onClick={handleCreateShop} disabled={creating} style={btn}>
            {creating ? "Creating…" : "Create shop"}
          </button>
        </div>
      )}
    </div>
  );
}

/* styles */
const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.15)",
  display: "inline-block",
  background: "#fff",
  cursor: "pointer",
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

const input: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 8,
  padding: "7px 9px",
  fontSize: 14,
};

const circleBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "999px",
  border: "1px solid rgba(0,0,0,.15)",
  background: "#fff",
  fontSize: 20,
  lineHeight: "28px",
  textAlign: "center",
  cursor: "pointer",
};
