// apps/webapp/src/routes/ProductDetail.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { getTelegramWebApp } from "../lib/telegram";
import { useTranslation } from "react-i18next";
import HeaderBar from "../components/layout/HeaderBar";
import { ProductCard } from "../components/product/ProductCard";
import * as wish from "../lib/wishlist";
import { addItem } from "../lib/api/cart";
import { optimisticBumpCart, refreshCartCount } from "../lib/store";

/* ---------- Helpers ---------- */
function routedPath(loc: ReturnType<typeof useLocation>): string {
  const hash = loc.hash || "";
  const hashPath = hash.startsWith("#/") ? hash.slice(1) : null;
  const base = hashPath ?? loc.pathname;
  return base.replace(/^\/tma(?=\/|$)/, "");
}

/* ---------- Types ---------- */
type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  stock?: number | null;
  categoryId?: string | null;
  photoUrl?: string | null;
  tenant?: { id?: string; slug?: string; name?: string; publicPhone?: string | null };
  images?: Array<{ id?: string; webUrl?: string | null; url?: string | null }>;
};

export default function ProductDetail() {
  const { slug, id } = useParams<{ slug?: string; id: string }>();
  const nav = useNavigate();
  const loc = useLocation();
  const path = routedPath(loc);
  const { t } = useTranslation();

  // Modes we keep: buyer (/s/:slug/...) and universal (/universal/...)
  const isBuyer = path.startsWith("/s/");
  const isUniversal = path.startsWith("/universal/");
  type Mode = "buyer" | "universal";
  const mode: Mode = isBuyer ? "buyer" : "universal";

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<Product["images"]>([]);
  const [idx, setIdx] = useState(0);
  const [related, setRelated] = useState<Product[]>([]);
  const [liked, setLiked] = useState(() => (isUniversal && id ? wish.has(id) : false));
  const [adding, setAdding] = useState(false);

  /* ---------- Load product & related ---------- */
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const endpoint = mode === "buyer" ? `/shop/${slug}/products/${id}` : `/universal/products/${id}`;
        const r = await api<{ product: Product; images: Product["images"] }>(endpoint);
        setProduct(r.product);
        setImages(r.images || []);
        setIdx(0);

        // Related by category
        if (r.product.categoryId) {
          const rel = await api<{ products: Product[] }>(
            mode === "buyer"
              ? `/shop/${slug}/categories/${r.product.categoryId}/products`
              : `/universal/category/${r.product.categoryId}/products`
          ).catch(() => ({ products: [] as Product[] }));
          setRelated((rel.products || []).filter((p) => p.id !== id).slice(0, 6));
        } else {
          setRelated([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, slug, mode]);

  /* ---------- Actions ---------- */
  const tg = getTelegramWebApp();

  const callShop = () => {
    if (product?.tenant?.publicPhone) {
      window.location.href = `tel:${product.tenant.publicPhone}`;
    }
  };

  const messageShop = () => {
    if (!product?.tenant?.id) return;
    const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME as string;
    const link = `https://t.me/${BOT_USERNAME}?start=product_${product.id}_${product.tenant.id}`;
    if (tg) tg.openTelegramLink(link);
    else window.open(link, "_blank");
  };

  const toggleFavorite = () => {
    if (!product) return;
    const now = wish.toggle({
      id: product.id,
      title: product.title,
      price: product.price ?? null,
      currency: product.currency ?? null,
      image: product.photoUrl ?? null,
      tenantName: product.tenant?.name ?? null,
    });
    setLiked(now);
  };

  const addToCart = async () => {
    if (mode !== "buyer" || !id) return;
    try {
      setAdding(true);
      await addItem(id, 1, { tenantSlug: slug }); // backend call with tenant
      optimisticBumpCart(1);
      refreshCartCount(slug);
      if (tg && typeof (tg as any).showPopup === "function") {
        (tg as any).showPopup(
          { title: "Cart", message: "Added to cart!", buttons: [{ id: "ok", type: "default", text: "OK" }] },
          () => {}
        );
      }
    } catch (err) {
      if (tg && typeof (tg as any).showPopup === "function") {
        (tg as any).showPopup(
          { title: "Cart", message: "Failed to add. Please try again.", buttons: [{ id: "ok", type: "default", text: "OK" }] },
          () => {}
        );
      } else {
        alert("Failed to add to cart. Please try again.");
      }
    } finally {
      setAdding(false);
    }
  };

  /* ---------- View helpers ---------- */
  const hasImages = images && images.length > 0;
  const currentImg = hasImages ? images[idx] : null;
  const imgUrl = currentImg?.webUrl || currentImg?.url || product?.photoUrl || "/placeholder.png";

  return (
    <div style={{ background: "#f9f9f9", minHeight: "100vh" }}>
      {/* Use global header (shows ♥ or 🛒 count based on route and does smart back) */}
      <HeaderBar title={product?.title || t("title_product") || "Product"} />

      <div style={{ paddingBottom: 40 }}>
        {loading || !product ? (
          <div style={{ padding: 20 }}>{t("msg_loading")}</div>
        ) : (
          <>
            {/* ---------- IMAGE ---------- */}
            <div style={{ width: "100%", background: "#fafafa", padding: 8 }}>
              <div
                style={{
                  width: "100%",
                  height: 260,
                  borderRadius: 12,
                  backgroundImage: `url(${imgUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              {hasImages && images.length > 1 && (
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  {images.map((_, i) => (
                    <span
                      key={i}
                      onClick={() => setIdx(i)}
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        margin: "0 3px",
                        borderRadius: 999,
                        background: i === idx ? "#000" : "#ccc",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ---------- NAME & PRICE ---------- */}
            <div style={{ padding: "16px 20px" }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>{product.title}</h2>
              <div style={{ fontWeight: 600, fontSize: 16, marginTop: 6 }}>
                {product.price} {product.currency}
              </div>
            </div>

            {/* ---------- ACTION ROW (☎, 💬, ♥ / 🛒) ---------- */}
            <div style={{ position: "sticky", top: 56, zIndex: 10, padding: "10px 16px", background: "#fff" }}>
              <div style={actionRow}>
                <button style={actionBtnBox} onClick={callShop}>☎️</button>
                <button style={actionBtnBox} onClick={messageShop}>💬</button>
                {mode === "universal" ? (
                  <button
                    style={{
                      ...actionBtnBox,
                      fontSize: 24,
                      color: liked ? "#e11d48" : "#c5c7ce",
                      lineHeight: 1,
                    }}
                    aria-pressed={liked}
                    onClick={toggleFavorite}
                    title={liked ? "Remove from favorites" : "Add to favorites"}
                  >
                    {liked ? "♥" : "♡"}
                  </button>
                ) : (
                  <button
                    style={{ ...actionBtnBox, opacity: adding ? 0.6 : 1 }}
                    onClick={addToCart}
                    disabled={adding}
                    title="Add to cart"
                  >
                    🛒
                  </button>
                )}
              </div>
            </div>

            {/* ---------- DESCRIPTION ---------- */}
            <div style={{ padding: "20px 20px" }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>{t("label_description") || "Description"}</h3>
              <p style={{ fontSize: 13, color: "#333", lineHeight: 1.6 }}>
                {product.description || t("msg_no_description")}
              </p>
            </div>

            {/* ---------- RELATED ---------- */}
            {related.length > 0 && (
              <div style={{ padding: "0 20px 40px" }}>
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>{t("label_related") || "You may also like"}</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 10,
                  }}
                >
                  {related.map((p) => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (mode === "buyer") nav(`/s/${slug}/p/${p.id}`);
                        else nav(`/universal/p/${p.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (mode === "buyer") nav(`/s/${slug}/p/${p.id}`);
                          else nav(`/universal/p/${p.id}`);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <ProductCard p={p} mode={mode} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */
const actionRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};

const actionBtnBox: React.CSSProperties = {
  flex: 1,
  height: 42,                // equal height for all three
  border: "1px solid rgba(0,0,0,.1)",
  background: "#fff",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 500,
  textAlign: "center",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};
