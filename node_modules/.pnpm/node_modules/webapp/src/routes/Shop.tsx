// src/routes/Shop.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api/index";
import { refreshCartCount } from "../lib/store";
import { ProductGrid } from "../components/product/ProductGrid";
import type { Product } from "../lib/types";
import ShopBottomBar from "../components/shop/ShopBottomBar";

type Props = { slug: string };
type Tab = "all" | "categories" | "about";

type ShopProductsResponse = {
  items: Product[];
  tenant?: { name?: string };
};

export default function Shop({ slug }: Props) {
  const [items, setItems] = useState<Product[]>([]);
  const [tenantName, setTenantName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        // ✅ your style
        const res = await api<ShopProductsResponse>(`/public/tenant/${slug}/products`);
        setItems(res.items || []);
        setTenantName(res.tenant?.name || "");
      } catch (e: any) {
        setErr(e?.message || "Failed to load shop");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const s = q.toLowerCase();
    return items.filter((p) => {
      const name =
        (p as any).name?.toString().toLowerCase() ||
        (p as any).title?.toString().toLowerCase() ||
        "";
      return name.includes(s);
    });
  }, [items, q]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    items.forEach((p) => {
      const cat = (p as any).category;
      if (cat) s.add(cat);
    });
    return Array.from(s);
  }, [items]);

  const handleAdd = async (p: Product) => {
    try {
      await api(`/cart/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id, qty: 1 }),
      });
      await refreshCartCount();
    } catch (e) {
      console.warn("add to cart failed", e);
    }
  };

  return (
    <div style={{ paddingBottom: 70 }}>
      <h2 style={{ margin: "0 0 8px" }}>{tenantName || "Shop"}</h2>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search in this shop"
        style={searchInput}
      />

      <div style={tabsWrap}>
        <button onClick={() => setTab("all")} style={tabBtn(tab === "all")}>
          All Products
        </button>
        <button
          onClick={() => setTab("categories")}
          style={tabBtn(tab === "categories")}
        >
          Categories
        </button>
        <button onClick={() => setTab("about")} style={tabBtn(tab === "about")}>
          About / Info
        </button>
      </div>

      {loading && <div>Loading...</div>}
      {err && <div style={{ color: "crimson" }}>Error: {err}</div>}

      {!loading && !err && (
        <>
          {tab === "all" && (
            <>
              {filtered.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No products yet.</div>
              ) : (
                <ProductGrid products={filtered} onAdd={handleAdd} />
              )}
            </>
          )}

          {tab === "categories" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.length === 0 && (
                <div style={{ opacity: 0.6 }}>No categories.</div>
              )}
              {categories.map((c) => (
                <span key={c} style={catPill}>
                  {c}
                </span>
              ))}
            </div>
          )}

          {tab === "about" && (
            <div style={{ lineHeight: 1.5 }}>
              <p>This is {tenantName || "this shop"}.</p>
              <p>Products shown above are specific to this shop.</p>
            </div>
          )}
        </>
      )}

      <ShopBottomBar />
    </div>
  );
}

const searchInput: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 12,
  padding: "9px 12px",
  fontSize: 15,
  outline: "none",
  marginBottom: 10,
};

const tabsWrap: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginBottom: 10,
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  flex: 1,
  border: active ? "1px solid rgba(0,0,0,.15)" : "1px solid transparent",
  background: active ? "#fff" : "rgba(148,163,184,.15)",
  borderRadius: 999,
  padding: "7px 10px",
  fontWeight: active ? 600 : 400,
  cursor: "pointer",
});

const catPill: React.CSSProperties = {
  background: "rgba(148,163,184,.18)",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 13,
};
