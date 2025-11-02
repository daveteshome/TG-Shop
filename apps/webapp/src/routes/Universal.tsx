// apps/webapp/src/routes/Universal.tsx
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

    return items.filter((p) => {
      const title = p.title?.toLowerCase?.() ?? "";
      const shop =
        p.tenant?.name?.toLowerCase?.() ??
        p.shopName?.toLowerCase?.() ??
        "";
      return title.includes(s) || shop.includes(s);
    });
  }, [items, q]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => {
      const catTitle =
        typeof p.category === "string" ? p.category : p.category?.title;
      if (catTitle) set.add(catTitle);
    });
    return Array.from(set);
  }, [items]);

  const openBotContact = (tenantId: string, productId: string) => {
    const tg = getTelegramWebApp();
    const link = `https://t.me/${BOT_USERNAME}?start=product_${productId}_${tenantId}`;
    if (tg) {
      tg.openTelegramLink(link);
    } else {
      window.open(link, "_blank");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products or shops"
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

      {tab === "all" && (
        <div style={grid}>
          {filtered.map((p) => {
            const fromRelation =
              p.images?.[0]?.webUrl ||
              p.images?.[0]?.url ||
              null;

            const finalImage =
              fromRelation || `/api/products/${p.id}/image`;

            return (
              <ProductCard
                key={p.id}
                p={p}
                mode="universal"
                image={finalImage}
                shopName={p.tenant?.name ?? p.shopName}
                shopPhone={p.tenant?.publicPhone ?? p.shopPhone}
                onMessage={async () => {
                  await logContactIntent(p.id, "message", tgUserId);
                  openBotContact(p.tenantId, p.id);
                }}
                onCall={async () => {
                  const phone = p.tenant?.publicPhone ?? p.shopPhone;
                  if (!phone) return;
                  await logContactIntent(p.id, "call", tgUserId);
                  window.location.href = `tel:${phone}`;
                }}
              />
            );
          })}
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
            Browse products published by different shops.
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
