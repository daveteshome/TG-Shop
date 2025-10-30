// apps/webapp/src/screens/ShopScreen.tsx
import { useEffect, useState } from "react";

type ShopScreenProps = {
  slug: string;
  onBack: () => void | Promise<void>;
};

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  stock: number;
  active: boolean;
  categoryId: string | null;
  photoUrl: string | null;
};

export default function ShopScreen({ slug, onBack }: ShopScreenProps) {
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<{ id: string; slug: string; name: string } | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/shop/${encodeURIComponent(slug)}/products`);
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json(); // { items, tenant }
        if (!alive) return;
        setItems(data.items || []);
        setTenant(data.tenant || null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <button onClick={onBack}>← Back</button>
        <h2 style={{ margin: 0 }}>{tenant?.name ?? "Shop"}</h2>
      </div>

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: "crimson" }}>Error: {err}</div>}

      {!loading && !err && (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((p) => (
            <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
              {p.photoUrl ? (
                <img
                  src={p.photoUrl}
                  alt={p.title}
                  style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                />
              ) : null}
              <div style={{ fontWeight: 700, marginTop: 8 }}>{p.title}</div>
              <div style={{ color: "#444", margin: "4px 0" }}>
                {p.currency} {p.price}
              </div>
              <div style={{ fontSize: 12, color: "#777" }}>{p.stock} in stock</div>
              {/* TODO: wire to your existing add-to-cart flow */}
            </div>
          ))}
          {!items.length && <div>No products yet.</div>}
        </div>
      )}
    </div>
  );
}
