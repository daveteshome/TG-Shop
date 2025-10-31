// webapp/src/routes/Shop.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom"; // 👈 add this
import { api } from "../lib/api/index";
import { refreshCartCount } from "../lib/store";
import ShopBottomBar from "../components/shop/ShopBottomBar";

type Tab = "products" | "about" | "orders";

type ShopInfoResponse = {
  shop: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    publishUniversal?: boolean;
    publicPhone?: string | null;
    location?: string | null;
    deliveryRules?: string | null;
    status?: string | null;
  };
  viewer: {
    isOwner: boolean;
    isJoined: boolean;
  };
  stats?: {
    products?: number;
    orders?: number;
  };
};

type ShopProductsResponse = {
  items: Array<{
    id: string;
    title: string;
    name?: string;
    price: number;
    currency: string;
    description?: string | null;
    stock?: number;
    active?: boolean;
    isPublished?: boolean;       // 👈 correct name
    category?: string | null;
    image?: string | null;
  }>;
  tenant?: { name?: string };
};

export default function Shop() {
  // 1) get slug from route, e.g. /shop/dawit-shop
  const { slug } = useParams<{ slug: string }>();
  // if route is wrong and there is no slug, we can bail out
  const finalSlug = slug || "demo"; // or you can `return <div>Shop not found</div>`

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [shop, setShop] = useState<ShopInfoResponse["shop"] | null>(null);
  const [viewer, setViewer] = useState<ShopInfoResponse["viewer"] | null>(null);

  const [items, setItems] = useState<ShopProductsResponse["items"]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("products");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  // 1) load shop info + stats
  useEffect(() => {
    (async () => {
      try {
        const info = await api<ShopInfoResponse>(`/public/tenant/${finalSlug}`);
        setShop(info.shop);
        setViewer(info.viewer);
      } catch (e: any) {
        console.warn("load shop info failed", e);
      }
    })();
  }, [finalSlug]);

  // 2) load products
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await api<ShopProductsResponse>(`/public/tenant/${finalSlug}/products`);
        setItems(res.items || []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load shop products");
      } finally {
        setLoading(false);
      }
    })();
  }, [finalSlug]);

  // derive categories from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [items]);

  // filter by search + category
  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((p) => {
        const t = (p.title || p.name || "").toLowerCase();
        return t.includes(s);
      });
    }
    if (category) {
      list = list.filter((p) => p.category === category);
    }
    return list;
  }, [items, search, category]);

  const handleAddToCart = async (p: any) => {
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

  // if somehow there's no slug, show something
  if (!slug) {
    return <div style={{ padding: 16 }}>Shop not found.</div>;
  }

  return (
    <div style={{ paddingBottom: 70 }}>
      {/* HEADER */}
      <div style={headerCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={avatarCircle}>
            {shop?.name?.[0]?.toUpperCase() || "🏪"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {shop?.name || "Shop"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {shop?.publishUniversal ? "Public" : "Private"}
              {shop?.status ? ` · ${shop.status}` : null}
            </div>
            {shop?.publicPhone ? (
              <div style={{ fontSize: 12, color: "#0f172a" }}>
                {shop.publicPhone}
              </div>
            ) : null}
          </div>
          {viewer?.isOwner ? (
            <button style={ghostBtn}>Edit</button>
          ) : (
            <button
              style={ghostBtn}
              onClick={() => {
                if (shop?.id) {
                  const deeplink = `https://t.me/${import.meta.env.VITE_BOT_USERNAME}?start=shop_${shop.id}`;
                  window.open(deeplink, "_blank");
                }
              }}
            >
              Message
            </button>
          )}
        </div>
        {shop?.description ? (
          <p style={{ marginTop: 6, fontSize: 12, color: "#475569" }}>
            {shop.description}
          </p>
        ) : null}
      </div>

      {/* TABS */}
      <div style={tabsRow}>
        <TabButton
          label="Products"
          active={activeTab === "products"}
          onClick={() => setActiveTab("products")}
        />
        <TabButton
          label="About"
          active={activeTab === "about"}
          onClick={() => setActiveTab("about")}
        />
        {viewer?.isOwner ? (
          <TabButton
            label="Orders"
            active={activeTab === "orders"}
            onClick={() => setActiveTab("orders")}
          />
        ) : null}
      </div>

      {/* CONTENT */}
      {activeTab === "products" && (
        <div>
          {/* search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in this shop..."
            style={searchInput}
          />
          {/* categories */}
          {categories.length > 0 && (
            <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
              <div
                style={category === null ? catPillActive : catPill}
                onClick={() => setCategory(null)}
              >
                All
              </div>
              {categories.map((c) => (
                <div
                  key={c}
                  style={category === c ? catPillActive : catPill}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </div>
              ))}
            </div>
          )}

          {/* products list */}
          {loading && <div>Loading products…</div>}
          {err && <div style={{ color: "red" }}>{err}</div>}
          {!loading && !err && (
            <div style={grid}>
              {filtered.map((p) => (
                <div key={p.id} style={card}>
                  {p.image ? (
                    <img src={p.image} style={img} />
                  ) : (
                    <div style={imgPlaceholder}>No image</div>
                  )}
                  <div style={{ fontWeight: 600, marginTop: 6 }}>
                    {p.title || p.name}
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>
                    {p.currency} {p.price}
                  </div>
                  <button style={addBtn} onClick={() => handleAddToCart(p)}>
                    Add to cart
                  </button>
                  {viewer?.isOwner ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        marginTop: 4,
                      }}
                    >
                      {p.isPublished ? "Published" : "Hidden"}
                    </div>
                  ) : null}
                </div>
              ))}
              {!filtered.length && <div>No products yet.</div>}
            </div>
          )}
        </div>
      )}

      {activeTab === "about" && (
        <div style={{ padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>About this shop</h3>
          <p>{shop?.description || "No description provided."}</p>
          {shop?.location ? <p>📍 {shop.location}</p> : null}
          {shop?.deliveryRules ? <p>🚚 {shop.deliveryRules}</p> : null}
        </div>
      )}

      {activeTab === "orders" && viewer?.isOwner && (
        <div style={{ padding: 12 }}>
          <p>Owner orders view coming here (needs auth endpoint).</p>
        </div>
      )}

      <ShopBottomBar />
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={tabBtn(active)}>
      {label}
    </button>
  );
}

const headerCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: "10px 12px 12px",
  marginBottom: 8,
  boxShadow: "0 1px 0 rgba(15,23,42,.04)",
};

const avatarCircle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 999,
  background: "rgba(148,163,184,.2)",
  display: "grid",
  placeItems: "center",
  fontWeight: 700,
};

const ghostBtn: React.CSSProperties = {
  background: "rgba(148,163,184,.15)",
  border: "1px solid rgba(148,163,184,.2)",
  borderRadius: 10,
  padding: "4px 10px",
  fontSize: 12,
};

const tabsRow: React.CSSProperties = {
  display: "flex",
  gap: 6,
  marginBottom: 8,
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  border: "none",
  background: active ? "#fff" : "rgba(148,163,184,.15)",
  padding: "6px 12px",
  borderRadius: 999,
  fontWeight: active ? 600 : 400,
  fontSize: 13,
  boxShadow: active ? "0 1px 0 rgba(15,23,42,.03)" : "none",
});

const searchInput: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 12,
  padding: "9px 12px",
  width: "100%",
  margin: "4px 0 10px",
};

const catPill: React.CSSProperties = {
  background: "rgba(148,163,184,.18)",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 13,
  cursor: "pointer",
};

const catPillActive: React.CSSProperties = {
  ...catPill,
  background: "#fff",
  border: "1px solid rgba(148,163,184,.3)",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
};

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  padding: 8,
  boxShadow: "0 1px 0 rgba(15,23,42,.02)",
};

const img: React.CSSProperties = {
  width: "100%",
  height: 100,
  objectFit: "cover",
  borderRadius: 10,
  background: "#e2e8f0",
};

const imgPlaceholder: React.CSSProperties = {
  ...img,
  display: "grid",
  placeItems: "center",
  fontSize: 11,
  color: "#64748b",
};

const addBtn: React.CSSProperties = {
  marginTop: 6,
  width: "100%",
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 0",
  fontSize: 12,
};
