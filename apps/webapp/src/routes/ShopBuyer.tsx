import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api/index";
import { ProductCard } from "../components/product/ProductCard";
import type { Product as UiProduct } from "../lib/types";
import ShopCategoryFilterGridIdentical from "../components/shop/ShopCategoryFilterGridIdentical";

/* ---------- Types ---------- */
type TenantLite = {
  id: string;
  slug: string;
  name: string;
  publicPhone?: string | null;
};

type CatalogResp = {
  tenant: TenantLite;
  categories: { id: string; title: string; parentId?: string | null }[];
  products: UiProduct[];
};

/* ---------- Component ---------- */
export default function ShopBuyer() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogResp | null>(null);

  const [q, setQ] = useState("");
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [activeCatIds, setActiveCatIds] = useState<Set<string>>(new Set());

  /* ---------- Fetch shop data ---------- */
  useEffect(() => {
    let cancelled = false;

    async function fetchTenant(s: string): Promise<TenantLite | null> {
      const candidates = [`/shop/${s}`, `/shops/${s}`];
      for (const url of candidates) {
        try {
          const res: any = await api<any>(url);
          const t =
            res?.tenant ??
            res?.shop ??
            (res?.slug && res?.name ? res : null);
          if (t?.slug && t?.name) {
            return {
              id: t.id || "",
              slug: t.slug,
              name: t.name,
              publicPhone: t.publicPhone ?? null,
            };
          }
        } catch {}
      }
      return null;
    }

    async function fetchCategories(s: string) {
      const res: any = await api<any>(`/shop/${s}/categories/with-counts`);
      return Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
        ? res.items
        : (res?.categories ?? []);
    }

    async function fetchProducts(s: string): Promise<UiProduct[]> {
      const candidates = [
        `/shop/${s}/products`,
        `/catalog/${s}`,
        `/shop/${s}/catalog`,
        `/shops/${s}/catalog`,
      ];
      for (const url of candidates) {
        try {
          const res: any = await api<any>(url);
          const raw: any[] = res?.products ?? res?.items ?? res?.data?.products ?? [];
          return raw.map((p: any) => ({
            ...p,
            isActive:
              typeof p?.isActive === "boolean"
                ? p.isActive
                : typeof p?.active === "boolean"
                ? p.active
                : true,
          }));
        } catch {}
      }
      return [];
    }

    (async () => {
      if (!slug) {
        setErr("Missing shop slug.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErr(null);

        const [cats, prods, tenantMaybe] = await Promise.all([
          fetchCategories(slug),
          fetchProducts(slug),
          fetchTenant(slug),
        ]);

        const tenant: TenantLite =
          tenantMaybe ?? { id: "", slug, name: slug, publicPhone: null };

        if (!cancelled) {
          setCatalog({ tenant, categories: cats, products: prods });
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setErr("Failed to load shop.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  /* ---------- Derived values ---------- */
  const products = catalog?.products ?? [];

  const filtered = useMemo(() => {
    let list = products;

    if (activeCatIds.size > 0) {
      list = list.filter((p: any) => p.categoryId && activeCatIds.has(p.categoryId));
    }

    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) => (p.title || "").toLowerCase().includes(s));
    }

    return list;
  }, [products, activeCatIds, q]);

  /* ---------- Render ---------- */
  if (loading) return <div style={{ opacity: 0.7 }}>Loading shop…</div>;
  if (err)
    return (
      <div style={{ lineHeight: 1.5 }}>
        <div style={{ color: "#b00", marginBottom: 8 }}>{err}</div>
        <button
          onClick={() => nav("/")}
          style={{ border: "1px solid #eee", borderRadius: 10, padding: "8px 12px" }}
        >
          Back to Universal
        </button>
      </div>
    );
  if (!catalog) return null;

  const shopName = catalog.tenant.name;
  const shopPhone = catalog.tenant.publicPhone ?? undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "#eee",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <div style={{ fontWeight: 700, fontSize: 16 }}>{shopName}</div>
      </div>

      {/* Unified category grid with recursive behavior */}
      <ShopCategoryFilterGridIdentical
        value={activeCatId}
        onChange={(id, allIds) => {
          setActiveCatId(id);
          setActiveCatIds(allIds ?? new Set());
        }}
      />

      {/* Product list */}
      <div style={grid}>
        {filtered.map((p) => {
          const fromRelation =
            (p as any)?.images?.[0]?.webUrl ||
            (p as any)?.images?.[0]?.url ||
            (p as any)?.photoUrl ||
            null;
          const img = fromRelation || `/api/products/${p.id}/image`;

          const goto = () => {
            const url = `/s/${encodeURIComponent(slug!)}/p/${p.id}`;
            // Prevent owner card links from hijacking
            nav(url);
          };

          return (
            <div
              key={p.id}
              role="button"
              onClick={() => nav(`/s/${slug}/p/${p.id}`)}
              tabIndex={0}
              // Capture phase prevents inner <a> default navigation
              onClickCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goto();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goto();
                }
              }}
              style={{ cursor: "pointer" }}
            >

              {/* keep card fully interactive visually, but clicks are captured above */}
              <ProductCard
                p={p}
                mode="universal"
                image={img}
                shopName={shopName}
                shopPhone={shopPhone}
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

/* ---------- Styles ---------- */
const searchInput: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 12,
  padding: "9px 12px",
  fontSize: 15,
  outline: "none",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 10,
};
