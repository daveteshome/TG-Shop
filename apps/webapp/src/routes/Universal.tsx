import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api/index";
import ShopCategoryFilterGridIdentical from "../components/shop/ShopCategoryFilterGridIdentical";
import { ProductCard } from "../components/product/ProductCard";
import { useWishlistCount } from "../lib/wishlist";
import SearchBox from "../components/search/SearchBox";


type UiProduct = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  photoUrl?: string | null;
  categoryId?: string | null;
  tenant?: { slug?: string; name?: string } | null;
  images?: { url?: string | null; webUrl?: string | null }[];
};

type UniversalResp = {
  page: number;
  perPage: number;
  total: number;
  items: UiProduct[];
};

export default function Universal() {
  const nav = useNavigate();

  // Tell the header to use universal scope
useEffect(() => {
  window.dispatchEvent(new CustomEvent("tgshop:search-config", {
    detail: {
      scope: "universal",
      tenantSlug: null,
      placeholder: "Search everything…",
      basePath: "/universal/search",
    },
  }));
}, []);


  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [products, setProducts] = useState<UiProduct[]>([]);

  const [q, setQ] = useState("");
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [activeCatIds, setActiveCatIds] = useState<Set<string>>(new Set());

  /* ---------- Fetch all universal products once ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await api<UniversalResp>("/universal/products?page=1&perPage=200");
        if (!cancelled) setProducts(data.items || []);
      } catch (e) {
        if (!cancelled) setErr("Failed to load universal products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Derived filter (same as Buyer) ---------- */
  const filtered = useMemo(() => {
    let list = products;

    // Filter by category and all descendant categories
    if (activeCatIds && activeCatIds.size > 0) {
      list = list.filter((p) => p.categoryId && activeCatIds.has(p.categoryId));
    }

    // Search by name/desc
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(s) ||
          (p.description || "").toLowerCase().includes(s)
      );
    }

    return list;
  }, [products, activeCatIds, q]);

  /* ---------- Render ---------- */
  if (loading) return <div style={{ opacity: 0.7 }}>Loading universal products…</div>;
  if (err)
    return (
      <div style={{ color: "#b00" }}>
        {err}
        <button style={{ marginLeft: 8 }} onClick={() => location.reload()}>
          Retry
        </button>
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Category grid — identical component, different data source */}
      <ShopCategoryFilterGridIdentical
        value={activeCatId}
        onChange={(id, allIds) => {
          console.log("[Universal] onChange", { id, allIds: Array.from(allIds ?? []) });
          setActiveCatId(id);
          setActiveCatIds(allIds ?? (id ? new Set([id]) : new Set()));
        }}
        countsUrlOverride="/universal/categories/with-counts"
      />

      {/* Product list */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        {filtered.map((p) => {
          const img =
            p.images?.[0]?.webUrl ||
            p.images?.[0]?.url ||
            p.photoUrl ||
            `/api/products/${p.id}/image`;

          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if ((e as any).defaultPrevented) return;
                e.preventDefault();
                e.stopPropagation();
                nav(`/universal/p/${p.id}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  nav(`/universal/p/${p.id}`);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <ProductCard
                p={p as any}
                mode="universal"
                image={img}
                shopName={p.tenant?.name}
              />
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ opacity: 0.6 }}>No products match your search.</div>
        )}
      </div>
    </div>
  );
}
