// src/routes/Universal.tsx
import { useEffect, useMemo, useState } from "react";
import { fetchUniversal, logContactIntent } from "../lib/api/universal";
import { getTelegramWebApp } from "../lib/telegram";
import { ProductCard } from "../components/product/ProductCard";

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME as string;

type Tab = "all" | "categories" | "about";

export default function Universal() {
  const [items, setItems] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const tgUserId = String(getTelegramWebApp()?.initDataUnsafe?.user?.id ?? "");

  useEffect(() => {
    fetchUniversal().then((r) => setItems(r.items));
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const s = q.toLowerCase();
    return items.filter(
      (p) =>
        p.name?.toLowerCase().includes(s) ||
        p.shopName?.toLowerCase().includes(s)
    );
  }, [items, q]);

  // derive categories from items (simple)
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [items]);

  const openBotContact = (tenantId: string, productId: string) => {
    // you already had this logic, keep it
    const tg = getTelegramWebApp();
    if (tg) {
      tg.openTelegramLink(`https://t.me/${BOT_USERNAME}?start=product_${productId}_${tenantId}`);
    } else {
      window.open(`https://t.me/${BOT_USERNAME}?start=product_${productId}_${tenantId}`, "_blank");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* search */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products or shops"
        style={searchInput}
      />

      {/* tabs */}
      <div style={tabsWrap}>
        <button
          onClick={() => setTab("all")}
          style={tabBtn(tab === "all")}
        >
          All Products
        </button>
        <button
          onClick={() => setTab("categories")}
          style={tabBtn(tab === "categories")}
        >
          Categories
        </button>
        <button
          onClick={() => setTab("about")}
          style={tabBtn(tab === "about")}
        >
          About / Info
        </button>
      </div>

      {/* content */}
      {tab === "all" && (
        <div style={grid}>
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              showShopBadge
              onMessage={async () => {
                await logContactIntent(p.id, "message", tgUserId);
                openBotContact(p.tenantId, p.id);
              }}
              onCall={async () => {
                if (!p.shopPhone) return;
                await logContactIntent(p.id, "call", tgUserId);
                window.location.href = `tel:${p.shopPhone}`;
              }}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ opacity: 0.6 }}>No products match your search.</div>
          )}
        </div>
      )}

      {tab === "categories" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {categories.length === 0 && (
            <div style={{ opacity: 0.6 }}>No categories yet.</div>
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
          <strong>TG-Shop Universal Marketplace</strong>
          <p style={{ marginTop: 6 }}>
            Browse products published by different shops. All items go to the
            same universal cart, so you can check out in one place.
          </p>
        </div>
      )}
    </div>
  );
}

const searchInput: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 12,
  padding: "9px 12px",
  fontSize: 15,
  outline: "none",
};

const tabsWrap: React.CSSProperties = {
  display: "flex",
  gap: 8,
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

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 10,
};

const catPill: React.CSSProperties = {
  background: "rgba(148,163,184,.18)",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 13,
};
