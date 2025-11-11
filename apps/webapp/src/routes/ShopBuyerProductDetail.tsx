import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api/index";

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  stock?: number | null;
  categoryId?: string | null;
  // sometimes present
  photoUrl?: string | null;
  images?: Array<{
    id?: string;
    imageId?: string | null;
    webUrl?: string | null;
    url?: string | null;
    position?: number;
  }>;
};

type TenantLite = {
  id: string;
  slug: string;
  name: string;
  publicPhone?: string | null;
};

function firstImageUrl(p?: Product | null): string | null {
  if (!p) return null;
  const rel =
    p.images?.[0]?.webUrl ||
    p.images?.[0]?.url ||
    p.photoUrl ||
    null;
  return rel;
}

export default function ShopBuyerProductDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [tenant, setTenant] = useState<TenantLite | null>(null);

  // Buyer-specific back: return to exact previous page; if no history, go to buyer shop root
  const goBackBuyer = () => {
    if (window.history.length > 1) {
      nav(-1);
    } else {
      nav(slug ? `/s/${slug}` : "/joined", { replace: true });
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchTenant(s: string): Promise<TenantLite | null> {
      const candidates = [`/shop/${s}`, `/shops/${s}`];
      for (const url of candidates) {
        try {
          const res: any = await api<any>(url);
          const t = res?.tenant ?? res?.shop ?? (res?.slug && res?.name ? res : null);
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

    async function fetchProduct(s: string, pid: string): Promise<Product | null> {
      // Try a cascade of likely endpoints, stop on first that returns a product
      const candidates = [
        `/shop/${s}/products/${pid}`,
        `/shop/${s}/product/${pid}`,
        `/shops/${s}/products/${pid}`,
        `/catalog/${s}/products/${pid}`,
        `/catalog/${s}/product/${pid}`,
        `/products/${pid}`,
        `/product/${pid}`,
      ];

      for (const url of candidates) {
        try {
          const res: any = await api<any>(url);
          const p: any =
            res?.product ??
            (Array.isArray(res?.products) ? res.products.find((x: any) => String(x?.id) === String(pid)) : null) ??
            (res?.id ? res : null);

          if (p && p.id) {
            const isActive =
              typeof p?.isActive === "boolean"
                ? p.isActive
                : typeof p?.active === "boolean"
                ? p.active
                : true;
            return { ...p, isActive };
          }
        } catch {
          // keep trying
        }
      }
      return null;
    }

    (async () => {
      if (!slug || !id) {
        setErr("Missing product reference.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErr(null);

        const [t, p] = await Promise.all([fetchTenant(slug), fetchProduct(slug, id)]);
        if (cancelled) return;

        setTenant(t);
        if (!p) {
          setErr("Failed to load product (not found).");
          setLoading(false);
          return;
        }
        setProduct(p);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setErr("Failed to load product.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, id]);

  const img = useMemo(() => {
    const u = firstImageUrl(product);
    return u || (product ? `/api/products/${product.id}/image` : null);
  }, [product]);

  if (loading) return <div style={{ padding: 12, opacity: 0.7 }}>Loading product…</div>;

  if (err) {
    return (
      <div style={{ padding: 12, lineHeight: 1.5 }}>
        <div style={{ color: "#b00", marginBottom: 10 }}>{err}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={goBackBuyer}
            style={{ border: "1px solid #eee", borderRadius: 10, padding: "8px 12px" }}
          >
            Back
          </button>
          <button
            onClick={() => nav(`/s/${encodeURIComponent(slug || "")}`)}
            style={{ border: "1px solid #eee", borderRadius: 10, padding: "8px 12px" }}
          >
            Go to Shop
          </button>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 8 }}>
      {/* Local header (buyer) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={goBackBuyer}
          aria-label="Back"
          style={{
            border: "1px solid rgba(0,0,0,.12)",
            borderRadius: 10,
            padding: "6px 10px",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          ←
        </button>
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={product.title}
        >
          {product.title}
        </div>
        {/* No Edit button on buyer view */}
      </div>

      {/* Image */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1/1",
          background: "#eee",
          borderRadius: 14,
          backgroundImage: img ? `url(${img})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Title / Price */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{product.title}</div>
        <div style={{ fontWeight: 700 }}>
          {product.price} {product.currency}
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{product.description}</div>
      )}

      {/* Shop info & actions */}
      <div
        style={{
          marginTop: 8,
          padding: 10,
          border: "1px solid rgba(0,0,0,.08)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>{tenant?.name ?? slug}</div>
          {tenant?.publicPhone && (
            <div style={{ opacity: 0.7, fontSize: 13 }}>{tenant.publicPhone}</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Wire to your cart logic later */}
          <button
            onClick={() => nav(`/cart`)}
            style={{
              borderRadius: 10,
              padding: "8px 12px",
              border: "1px solid #000",
              background: "#000",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Add to Cart
          </button>
          <button
            onClick={goBackBuyer}
            style={{
              borderRadius: 10,
              padding: "8px 12px",
              border: "1px solid rgba(0,0,0,.2)",
              background: "#fff",
            }}
          >
            Back to Shop
          </button>
        </div>
      </div>
    </div>
  );
}
