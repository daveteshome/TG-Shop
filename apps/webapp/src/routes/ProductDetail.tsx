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
  tenant?: { id?: string; slug?: string; name?: string; publicPhone?: string | null } | null;
  images?: Array<{ id?: string; webUrl?: string | null; url?: string | null }>;
};

type CategoryLite = {
  id: string;
  parentId?: string | null;
};

/* ---------- Category helpers ---------- */
function buildCategoryIndex(cats: CategoryLite[]) {
  const byId = new Map<string, CategoryLite>();
  const children = new Map<string, string[]>();

  for (const c of cats) {
    byId.set(c.id, c);
    const parent = c.parentId ?? null;
    if (parent) {
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent)!.push(c.id);
    }
  }

  return { byId, children };
}

function getDescendants(id: string, children: Map<string, string[]>): string[] {
  const result: string[] = [];
  const queue: string[] = [id];

  while (queue.length) {
    const cur = queue.shift()!;
    const kids = children.get(cur) || [];
    for (const k of kids) {
      result.push(k);
      queue.push(k);
    }
  }
  return result;
}

function getAncestors(id: string, byId: Map<string, CategoryLite>): string[] {
  const result: string[] = [];
  let cur = byId.get(id) || null;

  while (cur && cur.parentId) {
    const pId = cur.parentId;
    result.push(pId);
    cur = byId.get(pId) || null;
  }

  return result;
}

function pushUnique(target: Product[], source: Product[], max?: number) {
  const seen = new Set(target.map((p) => p.id));
  for (const p of source) {
    if (seen.has(p.id)) continue;
    target.push(p);
    seen.add(p.id);
    if (typeof max === "number" && target.length >= max) break;
  }
}

/** Mix items so we don't get blocks per shop: AAAAA BBBBB CCC → A B C A B C … */
function roundRobinByShop(products: Product[]): Product[] {
  const byShop = new Map<string, Product[]>();

  for (const p of products) {
    const key = p.tenant?.slug || "__no_shop__";
    if (!byShop.has(key)) byShop.set(key, []);
    byShop.get(key)!.push(p);
  }

  // Shuffle shop order a bit so it's not always same pattern
  const shops = Array.from(byShop.keys());
  for (let i = shops.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shops[i], shops[j]] = [shops[j], shops[i]];
  }

  const result: Product[] = [];
  let stillHas = true;

  while (stillHas) {
    stillHas = false;
    for (const shop of shops) {
      const bucket = byShop.get(shop)!;
      const item = bucket.shift();
      if (item) {
        result.push(item);
        stillHas = true;
      }
    }
  }

  return result;
}

/* ---------- Component ---------- */
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
  const [exploreMore, setExploreMore] = useState<Product[]>([]);
  const [liked, setLiked] = useState(() => (isUniversal && id ? wish.has(id) : false));
  const [adding, setAdding] = useState(false);

  /* ---------- Load main product ---------- */
  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      try {
        const endpoint =
          mode === "buyer" ? `/shop/${slug}/products/${id}` : `/universal/products/${id}`;

        const r = await api<{ product: Product; images: Product["images"] }>(endpoint);

        setProduct(r.product);
        setImages(r.images || []);
        setIdx(0);

        // reset lists when product changes
        setRelated([]);
        setExploreMore([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, slug, mode]);

  /* ---------- Smart related + explore-more logic ---------- */
  useEffect(() => {
    if (!product) return;

    (async () => {
      try {
        const currentId = product.id;
        const currentCategory = product.categoryId || null;
        const currentPrice = Number(product.price || 0) || 0;

        const minPrice = currentPrice > 0 ? currentPrice * 0.7 : 0;
        const maxPrice =
          currentPrice > 0 ? currentPrice * 1.3 : Number.MAX_SAFE_INTEGER;

        // 1) Load categories + product pool (shop or universal)
        let cats: CategoryLite[] = [];
        let pool: Product[] = [];

        if (mode === "buyer") {
          if (!slug) return;

          const catRes: any = await api<any>(`/shop/${slug}/categories/with-counts`).catch(
            () => null
          );
          const catArr =
            catRes == null
              ? []
              : Array.isArray(catRes)
              ? catRes
              : Array.isArray(catRes.items)
              ? catRes.items
              : catRes.categories ?? [];
          cats = catArr.map((c: any) => ({
            id: String(c.id),
            parentId: c.parentId ?? null,
          }));

          const prodRes: any = await api<any>(`/shop/${slug}/products`).catch(
            () => ({})
          );
          const raw: any[] = prodRes?.items ?? prodRes?.products ?? [];

          pool = raw.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description ?? null,
            price: Number(p.price),
            currency: p.currency,
            stock: p.stock,
            categoryId: p.categoryId ?? null,
            photoUrl: p.photoUrl || `/api/products/${p.id}/image`,
            tenant: prodRes.tenant || product.tenant || null,
          }));
        } else {
          // UNIVERSAL MODE
          const catRes: any = await api<any>(
            `/universal/categories/with-counts`
          ).catch(() => null);
          const catArr =
            catRes == null
              ? []
              : Array.isArray(catRes)
              ? catRes
              : Array.isArray(catRes.items)
              ? catRes.items
              : catRes.categories ?? [];
          cats = catArr.map((c: any) => ({
            id: String(c.id),
            parentId: c.parentId ?? null,
          }));

          const prodRes: any = await api<any>(
            "/universal/products?page=1&perPage=200"
          ).catch(() => ({}));
          const raw: any[] = prodRes?.items ?? [];

          pool = raw.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description ?? null,
            price: Number(p.price),
            currency: p.currency,
            stock: p.stock,
            categoryId: p.categoryId ?? null,
            photoUrl:
              p.photoUrl ||
              p.images?.[0]?.webUrl ||
              p.images?.[0]?.url ||
              `/api/products/${p.id}/image`,
            tenant: p.tenant ?? null,
          }));
        }

        const others = pool.filter((p) => p.id !== currentId);

        if (!others.length) {
          setRelated([]);
          setExploreMore([]);
          return;
        }

        const { byId, children } = buildCategoryIndex(cats);

        const sameCatOrDesc: Product[] =
          currentCategory && byId.has(currentCategory)
            ? (() => {
                const desc = getDescendants(currentCategory, children);
                const setCats = new Set([currentCategory, ...desc]);
                return others.filter(
                  (p) => p.categoryId && setCats.has(p.categoryId)
                );
              })()
            : [];

        const ancestors = currentCategory && byId.has(currentCategory)
          ? getAncestors(currentCategory, byId)
          : [];

        /* ---------- Build RELATED (horizontal) ---------- */
        const relatedCandidates: Product[] = [];

        if (mode === "buyer") {
          // BUYER: shop-focused but category-smart

          // 1) same category + descendants + price band
          if (sameCatOrDesc.length && currentPrice > 0) {
            const sameCatPrice = sameCatOrDesc.filter(
              (p) => p.price >= minPrice && p.price <= maxPrice
            );
            pushUnique(relatedCandidates, sameCatPrice);
          }

          // 2) same category + descendants (any price)
          pushUnique(relatedCandidates, sameCatOrDesc);

          // 3) ancestors (parent, grandparent) + their descendants
          for (const ancId of ancestors) {
            const desc = getDescendants(ancId, children);
            const setCats = new Set([ancId, ...desc]);
            const ancPool = others.filter(
              (p) => p.categoryId && setCats.has(p.categoryId)
            );

            if (currentPrice > 0) {
              const ancPrice = ancPool.filter(
                (p) => p.price >= minPrice && p.price <= maxPrice
              );
              pushUnique(relatedCandidates, ancPrice);
            }
            pushUnique(relatedCandidates, ancPool);
          }

          // 4) same shop, price band only (no category)
          if (currentPrice > 0) {
            const priceShop = others.filter(
              (p) => p.price >= minPrice && p.price <= maxPrice
            );
            pushUnique(relatedCandidates, priceShop);
          }

          // 5) fallback: any other products in this shop
          pushUnique(relatedCandidates, others);

          const finalRelated = relatedCandidates.slice(0, 6);
          const relatedIds = new Set(finalRelated.map((p) => p.id));

          // ---------- EXPLORE-MORE (BUYER: more from this shop) ----------
          const sameCatFirst: Product[] = [];
          const rest: Product[] = [];

          const inSameCat = new Set(sameCatOrDesc.map((p) => p.id));

          for (const p of others) {
            if (relatedIds.has(p.id)) continue;
            if (inSameCat.has(p.id)) sameCatFirst.push(p);
            else rest.push(p);
          }

          setRelated(finalRelated);
          setExploreMore([...sameCatFirst, ...rest]);
        } else {
          // UNIVERSAL: marketplace-focused
          const tenantSlug = product.tenant?.slug || null;
          const base = others;

          const sameShop = tenantSlug
            ? base.filter((p) => p.tenant?.slug === tenantSlug)
            : [];

          const sameShopSameCatDesc =
            currentCategory && byId.has(currentCategory)
              ? (() => {
                  const desc = getDescendants(currentCategory, children);
                  const setCats = new Set([currentCategory, ...desc]);
                  return sameShop.filter(
                    (p) => p.categoryId && setCats.has(p.categoryId)
                  );
                })()
              : [];

          const sameShopSameCatDescPrice =
            currentPrice > 0
              ? sameShopSameCatDesc.filter(
                  (p) => p.price >= minPrice && p.price <= maxPrice
                )
              : [];

          const sameCatDescAnyShop = sameCatOrDesc;
          const sameCatDescAnyShopPrice =
            currentPrice > 0
              ? sameCatDescAnyShop.filter(
                  (p) => p.price >= minPrice && p.price <= maxPrice
                )
              : [];

          const priceAnyShop =
            currentPrice > 0
              ? base.filter((p) => p.price >= minPrice && p.price <= maxPrice)
              : [];

          // Priority for related in universal
          pushUnique(relatedCandidates, sameShopSameCatDescPrice);
          pushUnique(relatedCandidates, sameShopSameCatDesc);
          pushUnique(relatedCandidates, sameCatDescAnyShopPrice);
          pushUnique(relatedCandidates, sameCatDescAnyShop);

          // Ancestors across shops
          for (const ancId of ancestors) {
            const desc = getDescendants(ancId, children);
            const setCats = new Set([ancId, ...desc]);
            const ancPool = base.filter(
              (p) => p.categoryId && setCats.has(p.categoryId)
            );

            if (currentPrice > 0) {
              const ancPrice = ancPool.filter(
                (p) => p.price >= minPrice && p.price <= maxPrice
              );
              pushUnique(relatedCandidates, ancPrice);
            }
            pushUnique(relatedCandidates, ancPool);
          }

          pushUnique(relatedCandidates, priceAnyShop);
          pushUnique(relatedCandidates, base);

          const finalRelated = relatedCandidates.slice(0, 6);
          const relatedIds = new Set(finalRelated.map((p) => p.id));

          // ---------- EXPLORE-MORE (UNIVERSAL: mixed across shops) ----------

          // 1) Same-category pool (all shops), excluding current product + horizontal related
          const sameCategoryPool = sameCatDescAnyShop.filter(
            (p) => p.id !== currentId && !relatedIds.has(p.id)
          );

          const mixedSameCategory = roundRobinByShop(sameCategoryPool);

          // 2) Other pool: everything else, excluding already used & same-category pool
          const sameCategoryIds = new Set(sameCategoryPool.map((p) => p.id));
          const otherPool = base.filter(
            (p) =>
              p.id !== currentId &&
              !relatedIds.has(p.id) &&
              !sameCategoryIds.has(p.id)
          );

          const mixedOthers = roundRobinByShop(otherPool);

          // 3) Final vertical list
          const finalExploreMore = [...mixedSameCategory, ...mixedOthers];

          setRelated(finalRelated);
          setExploreMore(finalExploreMore);
        }
      } catch (err) {
        console.error("[ProductDetail] smart related/explore logic failed", err);
        // Fail safely
        setRelated([]);
        setExploreMore([]);
      }
    })();
  }, [mode, slug, product]);

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
      await addItem(id, 1, { tenantSlug: slug });
      optimisticBumpCart(1);
      refreshCartCount(slug);
      if (tg && typeof (tg as any).showPopup === "function") {
        (tg as any).showPopup(
          {
            title: "Cart",
            message: "Added to cart!",
            buttons: [{ id: "ok", type: "default", text: "OK" }],
          },
          () => {}
        );
      }
    } catch (err) {
      if (tg && typeof (tg as any).showPopup === "function") {
        (tg as any).showPopup(
          {
            title: "Cart",
            message: "Failed to add. Please try again.",
            buttons: [{ id: "ok", type: "default", text: "OK" }],
          },
          () => {}
        );
      } else {
        alert("Failed to cart. Please try again.");
      }
    } finally {
      setAdding(false);
    }
  };

  // Add-to-cart used specifically for related products in buyer mode
  const handleRelatedAddToCart = async (prod: Product) => {
    if (mode !== "buyer" || !slug) return;
    try {
      await addItem(prod.id, 1, { tenantSlug: slug });
      optimisticBumpCart(1);
      refreshCartCount(slug);

      const tg = getTelegramWebApp();
      if (tg && typeof (tg as any).showPopup === "function") {
        (tg as any).showPopup(
          {
            title: "Cart",
            message: "Added to cart!",
            buttons: [{ id: "ok", type: "default", text: "OK" }],
          },
          () => {}
        );
      }
    } catch (err) {
      console.error("Add related product to cart failed:", err);
    }
  };

  /* ---------- View helpers ---------- */
  const hasImages = images && images.length > 0;
  const currentImg = hasImages ? images[idx] : null;
  const imgUrl = currentImg?.webUrl || currentImg?.url || product?.photoUrl || "/placeholder.png";

  const shopName = product?.tenant?.name || undefined;
  const shopPhone = product?.tenant?.publicPhone ?? undefined;

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
            <div
              style={{
                position: "sticky",
                top: 56,
                zIndex: 10,
                padding: "10px 16px",
                background: "#fff",
              }}
            >
              <div style={actionRow}>
                <button style={actionBtnBox} onClick={callShop}>
                  ☎️
                </button>
                <button style={actionBtnBox} onClick={messageShop}>
                  💬
                </button>
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
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>
                {t("label_description") || "Description"}
              </h3>
              <p style={{ fontSize: 13, color: "#333", lineHeight: 1.6 }}>
                {product.description || t("msg_no_description")}
              </p>
            </div>

            {/* ---------- DEBUG PANEL (TEMPORARY) ---------- */}
            <div
              style={{
                padding: "8px 20px",
                fontSize: 11,
                color: "#666",
                borderTop: "1px dashed #ddd",
                marginTop: 4,
              }}
            >
            </div>

            {/* ---------- RELATED (HORIZONTAL STRIP) ---------- */}
            {related.length > 0 && (
              <div style={{ padding: "8px 20px 24px" }}>
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>
                  {t("label_related") ||
                    (mode === "buyer" ? "Similar products" : "Similar items")}
                </h3>

                {/* Outer scroll container */}
                <div
                  style={{
                    overflowX: "auto",
                    paddingBottom: 4,
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  {/* Inner flex row */}
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                    }}
                  >
                    {related.map((p) => {
                      const img = p.photoUrl || `/api/products/${p.id}/image`;

                      return (
                        <div
                          key={p.id}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            if ((e as any).defaultPrevented) return;
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
                          style={{
                            cursor: "pointer",
                            flex: "0 0 32%", // ~3 cards per viewport
                            minWidth: 120,
                            maxWidth: 160,
                          }}
                        >
                          <ProductCard
                            p={p as any}
                            mode={mode}
                            image={img}
                            shopName={shopName}
                            shopPhone={mode === "buyer" ? shopPhone : undefined}
                            onAdd={
                              mode === "buyer"
                                ? (handleRelatedAddToCart as any)
                                : undefined
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ---------- EXPLORE MORE (VERTICAL LIST) ---------- */}
            {exploreMore.length > 0 && (
              <div style={{ padding: "0 20px 40px" }}>
                <h3 style={{ fontSize: 15, marginBottom: 8 }}>
                  {mode === "buyer"
                    ? shopName
                      ? `More from ${shopName}`
                      : "More from this shop"
                    : "Explore more items"}
                </h3>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {exploreMore.map((p) => {
                    const img = p.photoUrl || `/api/products/${p.id}/image`;

                    return (
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
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "12px 0",                // was 8px → +50% height
                          borderBottom: "1px solid #eee",
                          cursor: "pointer",
                        }}
                        >
                          {/* Thumbnail */}
                          <div
                            style={{
                              width: 75,                     // was 56 → +33%
                              height: 75,                    // was 56 → +33%
                              borderRadius: 12,              // was 10 → slightly larger look
                              backgroundImage: `url(${img})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundColor: "#eee",
                              flexShrink: 0,
                            }}
                          />

                          {/* Text */}
                          <div style={{ flex: 1, marginLeft: 14, minWidth: 0 }}> {/* was 10 */}
                            <div
                              style={{
                                fontSize: 17,                // was 14 → +21%
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                marginBottom: 4,             // was 2
                              }}
                            >
                              {p.title}
                            </div>

                            {p.description && (
                              <div
                                style={{
                                  fontSize: 13,               // was 11
                                  color: "#777",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {p.description}
                              </div>
                            )}
                          </div>

                          {/* Price */}
                          <div
                            style={{
                              marginLeft: 12,                 // was 8
                              textAlign: "right",
                              flexShrink: 0,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 17,                 // was 14
                                fontWeight: 700,
                              }}
                            >
                              {p.price} {p.currency}
                            </div>
                          </div>

                      </div>
                    );
                  })}
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
  height: 42,
  border: "1px solid rgba(0,0,0,.1)",
  background: "#fff",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 500,
  textAlign: "center",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};
