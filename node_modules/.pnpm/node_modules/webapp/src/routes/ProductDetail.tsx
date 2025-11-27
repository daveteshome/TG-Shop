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
import ShopInfoDrawer from "../components/shop/ShopInfoDrawer";

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
  compareAtPrice?: number | null;
  category?: {
    id: string;
    title: string;
    parentId?: string | null;
  } | null;
  tenant?:
    | {
        id?: string;
        slug?: string;
        name?: string;
        publicPhone?: string | null;
        publicTelegramLink?: string | null;
        logoWebUrl?: string | null;
        description?: string | null;
        instagramUrl?: string | null;
        facebookUrl?: string | null;
        twitterUrl?: string | null;
        returnPolicy?: string | null;
        shippingInfo?: string | null;
        deliveryMode?: string | null;
        location?: string | null;
      }
    | null;
  images?: Array<{ id?: string; webUrl?: string | null; url?: string | null }>;
};

type CategoryLite = {
  id: string;
  parentId?: string | null;
};
function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Keep leading + and digits only
  const cleaned = trimmed.replace(/[^0-9+]/g, "");
  if (!cleaned) return null;

  return cleaned;
}

function normalizeTelegramLink(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 🛑 Guard against bad old values
  const lower = trimmed.toLowerCase();
  if (
    lower === "undefined" ||
    lower === "@undefined" ||
    lower.endsWith("/undefined")
  ) {
    return null;
  }

  // Full URL already
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // @username or bare username
  const username = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (!username) return null;

  return `https://t.me/${username}`;
}


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
  const [liked, setLiked] = useState(
    () => isUniversal && id ? wish.has(id) : false
  );
  const [adding, setAdding] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [categoryBreadcrumb, setCategoryBreadcrumb] = useState<Array<{id: string; title: string}>>([]);
  const [showAllExplore, setShowAllExplore] = useState(false);
  const [showShopInfo, setShowShopInfo] = useState(false);

  /* ---------- Load main product ---------- */
  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      try {
        const endpoint =
          mode === "buyer"
            ? `/shop/${slug}/products/${id}`
            : `/universal/products/${id}`;

        const r = await api<{ product: Product; images: Product["images"] }>(
          endpoint
        );

        setProduct(r.product);
        setImages(r.images || []);
        setIdx(0);

        // Track product view for personalization
        if (r.product) {
          const { trackProductView } = await import('../lib/browsingHistory');
          trackProductView({
            id: r.product.id,
            title: r.product.title,
            categoryId: r.product.categoryId,
          });
        }

        // Load category breadcrumb
        if (r.product?.category) {
          try {
            const catEndpoint = mode === 'buyer' 
              ? `/shop/${slug}/categories/with-counts`
              : `/universal/categories/with-counts`;
            const catRes: any = await api<any>(catEndpoint).catch(() => null);
            const catArr = catRes == null ? [] : Array.isArray(catRes) ? catRes : Array.isArray(catRes.items) ? catRes.items : catRes.categories ?? [];
            
            const cats = catArr.map((c: any) => ({
              id: String(c.id),
              title: c.title || c.name,
              parentId: c.parentId ?? null,
            }));
            
            // Build breadcrumb from current category to root
            const breadcrumb: Array<{id: string; title: string}> = [];
            let currentCat = cats.find((c: any) => c.id === r.product.category?.id);
            
            while (currentCat) {
              breadcrumb.unshift({ id: currentCat.id, title: currentCat.title });
              currentCat = currentCat.parentId ? cats.find((c: any) => c.id === currentCat!.parentId) : null;
            }
            
            setCategoryBreadcrumb(breadcrumb);
          } catch (e) {
            console.error('Failed to load category breadcrumb:', e);
          }
        } else {
          setCategoryBreadcrumb([]);
        }

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

          const catRes: any = await api<any>(
            `/shop/${slug}/categories/with-counts`
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
            "/universal/products?page=1&perPage=50"
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

        const ancestors =
          currentCategory && byId.has(currentCategory)
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
    console.log("[ProductDetail] callShop clicked!", { product: product?.tenant });
    const phone = product?.tenant?.publicPhone;
    if (!phone) {
      console.log("[ProductDetail] no publicPhone on tenant", product?.tenant);
      alert("Shop phone number not available. Please ask the shop owner to add their phone number in settings.");
      return;
    }

    // Show phone number and copy to clipboard
    const shopName = product?.tenant?.name || "Shop";
    
    // Try to copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(phone).then(() => {
        alert(`📞 ${shopName}\n\nPhone: ${phone}\n\n✓ Number copied to clipboard!\n\nYou can now paste it in your phone app to call.`);
      }).catch(() => {
        alert(`📞 ${shopName}\n\nPhone: ${phone}\n\nPlease copy this number to call the shop.`);
      });
    } else {
      // Fallback for browsers without clipboard API
      alert(`📞 ${shopName}\n\nPhone: ${phone}\n\nPlease copy this number to call the shop.`);
    }
  };


  const messageShop = () => {
  if (!product?.tenant) {
    console.log("[ProductDetail] no tenant on product", product);
    return;
  }

  const raw = product.tenant.publicTelegramLink;
  const direct = normalizeTelegramLink(raw);
  const tgApp = getTelegramWebApp();

  console.log("[ProductDetail] telegram debug", {
    raw,
    direct,
    tenant: product.tenant,
  });

  let link: string | null = null;

  if (direct) {
    // ✅ direct chat / channel / group link of the shop owner
    link = direct;
  } else if (product.tenant.id) {
    const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME as string | undefined;

    if (BOT_USERNAME && BOT_USERNAME !== "undefined") {
      link = `https://t.me/${BOT_USERNAME}?start=product_${product.id}_${product.tenant.id}`;
    }
  }

  if (!link) {
    alert("No valid Telegram contact is configured for this shop.");
    return;
  }

  if (tgApp) tgApp.openTelegramLink(link);
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

  const shareProduct = async () => {
    if (!product) return;
    
    try {
      const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME as string | undefined;
      
      if (!BOT_USERNAME || BOT_USERNAME === 'undefined') {
        console.warn('VITE_BOT_USERNAME not configured');
        alert('Share feature not configured. Please contact support.');
        return;
      }
      
      // Create context-aware deep link
      // If shared from shop (/s/slug), link back to shop buyer view
      // If shared from universal, link back to universal
      let deepLink: string;
      if (mode === 'buyer' && slug) {
        // Shop context - link to buyer view of the shop
        deepLink = `https://t.me/${BOT_USERNAME}?startapp=shop_${slug}_product_${product.id}`;
      } else {
        // Universal context
        deepLink = `https://t.me/${BOT_USERNAME}?startapp=universal_product_${product.id}`;
      }
      
      // Build rich share text with description
      const description = product.description 
        ? (product.description.length > 100 
            ? product.description.substring(0, 100) + '...' 
            : product.description)
        : '';
      
      const priceText = product.compareAtPrice && product.compareAtPrice > product.price
        ? `💰 ${product.price} ${product.currency} (was ${product.compareAtPrice} ${product.currency})`
        : `💰 ${product.price} ${product.currency}`;
      
      const shareText = [
        `🛍️ ${product.title}`,
        '',
        priceText,
        description ? `\n📝 ${description}` : '',
        '',
        `👉 ${deepLink}`,
      ].filter(Boolean).join('\n');
      
      const tgApp = getTelegramWebApp();
      
      // Priority 1: Use Telegram's native share (most reliable in Telegram)
      if (tgApp && typeof (tgApp as any).openTelegramLink === 'function') {
        // Use Telegram share URL with rich text
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(shareText)}`;
        (tgApp as any).openTelegramLink(shareUrl);
        return;
      }
      
      // Priority 2: Web Share API (works on mobile browsers)
      if (navigator.share) {
        try {
          // Try to share with image if available
          const shareData: any = { 
            title: product.title,
            text: shareText,
          };
          
          // Try to include image (works on some platforms)
          if (product.photoUrl) {
            try {
              const response = await fetch(product.photoUrl);
              const blob = await response.blob();
              const file = new File([blob], 'product.jpg', { type: blob.type });
              shareData.files = [file];
            } catch (e) {
              // Image fetch failed, share without image
              console.log('Could not fetch image for sharing:', e);
            }
          }
          
          await navigator.share(shareData);
          return;
        } catch (e) {
          // User cancelled or not supported, fall through
          console.log('Web share cancelled or failed:', e);
        }
      }
      
      // Priority 3: Copy to clipboard with rich text
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Product details copied to clipboard!');
      } catch (e) {
        // Clipboard failed, show the link
        prompt('Copy this text:', shareText);
      }
      
    } catch (e) {
      console.error('Share failed:', e);
      alert('Failed to share product');
    }
  };

  const addToCart = async () => {
    if (mode !== "buyer" || !id) return;
    try {
      setAdding(true);
      await addItem(id, 1, { tenantSlug: slug });
      optimisticBumpCart(1);
      refreshCartCount(slug);
      // Silent success - cart icon updates automatically
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
      // Silent success - cart icon updates automatically
    } catch (err) {
      console.error("Add related product to cart failed:", err);
    }
  };

  /* ---------- View helpers ---------- */
  const hasImages = images && images.length > 0;
  const currentImg = hasImages ? images[idx] : null;
  const imgUrl =
    currentImg?.webUrl ||
    currentImg?.url ||
    product?.photoUrl ||
    "/placeholder.png";

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
            {/* ---------- IMAGE GALLERY (aligned with OwnerProductDetail) ---------- */}
            <div style={{ width: "100%", background: "#fafafa", padding: 8 }}>
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => setShowImageModal(true)}
                  style={{
                    width: "100%",
                    height: 260,
                    borderRadius: 12,
                    backgroundImage: `url(${imgUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: "#eee",
                    cursor: 'pointer',
                  }}
                />

                {hasImages && images.length > 1 && (
                  <>
                    <button
                      style={galleryBtnLeft}
                      onClick={() =>
                        setIdx(
                          (old) =>
                            (old - 1 + images.length) % images.length
                        )
                      }
                      aria-label={t("aria_prev_image") || "Previous image"}
                    >
                      ‹
                    </button>
                    <button
                      style={galleryBtnRight}
                      onClick={() =>
                        setIdx((old) => (old + 1) % images.length)
                      }
                      aria-label={t("aria_next_image") || "Next image"}
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails row (same idea as owner) */}
              {hasImages && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 6,
                    marginTop: 10,
                  }}
                >
                  {images.map((im, i) => {
                    const thumbUrl =
                      im.webUrl ||
                      im.url ||
                      product.photoUrl ||
                      "/placeholder.png";
                    return (
                      <div
                        key={im.id || i}
                        onClick={() => setIdx(i)}
                        style={{
                          ...galleryThumb,
                          backgroundImage: `url(${thumbUrl})`,
                          border:
                            i === idx
                              ? "2px solid #000"
                              : "1px solid rgba(0,0,0,.1)",
                        }}
                        aria-label={
                          t("aria_thumb_image", { index: i + 1 }) ||
                          `Image ${i + 1}`
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* ---------- SHOP INFO CARD ---------- */}
            {product.tenant && mode === 'buyer' && (
              <div 
                style={{
                  margin: '12px 20px',
                  padding: '12px',
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {product.tenant.logoWebUrl && (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      backgroundImage: `url(${product.tenant.logoWebUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: '#f3f4f6',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
                    {product.tenant.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                    Shop
                  </div>
                </div>
                <button
                  onClick={() => setShowShopInfo(true)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Shop Info
                </button>
              </div>
            )}

            {/* ---------- CATEGORY BREADCRUMB ---------- */}
            {categoryBreadcrumb.length > 0 && (
              <div style={{ padding: '0 20px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {categoryBreadcrumb.map((cat, idx) => (
                    <React.Fragment key={cat.id}>
                      {idx > 0 && <span style={{ color: '#9ca3af', fontSize: 12 }}>›</span>}
                      <span
                        onClick={() => {
                          if (mode === 'buyer') {
                            nav(`/s/${slug}?category=${cat.id}`);
                          } else {
                            nav(`/universal?category=${cat.id}`);
                          }
                        }}
                        style={{
                          fontSize: 12,
                          color: idx === categoryBreadcrumb.length - 1 ? '#111' : '#6b7280',
                          cursor: 'pointer',
                          fontWeight: idx === categoryBreadcrumb.length - 1 ? 600 : 400,
                        }}
                      >
                        {cat.title}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* ---------- NAME & PRICE ---------- */}
            <div style={{ padding: "16px 20px" }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>{product.title}</h2>
              
              {/* Price with discount */}
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 600, fontSize: 20, color: '#111' }}>
                  {product.price} {product.currency}
                </div>
                
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <>
                    <div style={{ 
                      fontSize: 16, 
                      color: '#9ca3af', 
                      textDecoration: 'line-through' 
                    }}>
                      {product.compareAtPrice} {product.currency}
                    </div>
                    <div style={{
                      padding: '2px 8px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                    }}>
                      {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% OFF
                    </div>
                  </>
                )}
              </div>

              {/* Stock status */}
              <div style={{ marginTop: 8 }}>
                {product.stock === 0 ? (
                  <div style={{ 
                    fontSize: 13, 
                    color: '#dc2626', 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span>🔴</span> Out of Stock
                  </div>
                ) : product.stock && product.stock <= 5 ? (
                  <div style={{ 
                    fontSize: 13, 
                    color: '#f59e0b', 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span>🟡</span> Only {product.stock} left in stock
                  </div>
                ) : (
                  <div style={{ 
                    fontSize: 13, 
                    color: '#10b981', 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span>🟢</span> In Stock
                  </div>
                )}
              </div>
            </div>

            {/* ---------- ACTION ROW (☎, 💬, 🔗, ♥ / 🛒) ---------- */}
            <div
              style={{
                position: "sticky",
                top: 56,
                zIndex: 10,
                padding: "10px 16px",
                background: "#fff",
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <div style={actionRow}>
                <button 
                  style={{
                    ...actionBtnBox,
                    opacity: product?.tenant?.publicPhone ? 1 : 0.5,
                  }} 
                  onClick={callShop} 
                  title={product?.tenant?.publicPhone ? `Call shop: ${product.tenant.publicPhone}` : "Phone number not available"}
                >
                  ☎️
                </button>
                <button 
                  style={{
                    ...actionBtnBox,
                    opacity: product?.tenant?.publicTelegramLink ? 1 : 0.5,
                  }}
                  onClick={messageShop} 
                  title={product?.tenant?.publicTelegramLink ? "Message shop on Telegram" : "Telegram link not available"}
                >
                  💬
                </button>
                <button style={actionBtnBox} onClick={shareProduct} title="Share product">
                  🔗
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
                    title={
                      liked
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                  >
                    {liked ? "♥" : "♡"}
                  </button>
                ) : (
                  <button
                    style={{
                      ...actionBtnBox,
                      opacity: adding || product.stock === 0 ? 0.6 : 1,
                    }}
                    onClick={addToCart}
                    disabled={adding || product.stock === 0}
                    title={product.stock === 0 ? "Out of stock" : "Add to cart"}
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

            {/* ---------- DEBUG PANEL (currently empty) ---------- */}
            <div
              style={{
                padding: "8px 20px",
                fontSize: 11,
                color: "#666",
                borderTop: "1px dashed #ddd",
                marginTop: 4,
              }}
            ></div>

            {/* ---------- RELATED (HORIZONTAL STRIP) ---------- */}
            {related.length > 0 && (
              <div style={{ padding: "8px 20px 24px" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, margin: 0 }}>
                    {t("label_related") ||
                      (mode === "buyer"
                        ? "Similar products"
                        : "Similar items")}
                  </h3>
                  {related.length > 6 && (
                    <button
                      onClick={() => {
                        if (mode === 'buyer') {
                          nav(`/s/${slug}?category=${product?.categoryId}`);
                        } else {
                          nav(`/universal?category=${product?.categoryId}`);
                        }
                      }}
                      style={{
                        fontSize: 13,
                        color: '#168acd',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      See All →
                    </button>
                  )}
                </div>

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
                      const img =
                        p.photoUrl || `/api/products/${p.id}/image`;
                      
                      const hasDiscount = p.compareAtPrice && p.compareAtPrice > p.price;
                      const discountPercent = hasDiscount 
                        ? Math.round(((p.compareAtPrice! - p.price) / p.compareAtPrice!) * 100)
                        : 0;

                      return (
                        <div
                          key={p.id}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            if ((e as any).defaultPrevented) return;
                            e.preventDefault();
                            e.stopPropagation();
                            if (mode === "buyer")
                              nav(`/s/${slug}/p/${p.id}`);
                            else nav(`/universal/p/${p.id}`);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (mode === "buyer")
                                nav(`/s/${slug}/p/${p.id}`);
                              else nav(`/universal/p/${p.id}`);
                            }
                          }}
                          style={{
                            cursor: "pointer",
                            flex: "0 0 32%", // ~3 cards per viewport
                            minWidth: 120,
                            maxWidth: 160,
                            position: 'relative',
                          }}
                        >
                          {/* Discount badge */}
                          {hasDiscount && (
                            <div style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              background: '#dc2626',
                              color: '#fff',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              zIndex: 1,
                            }}>
                              -{discountPercent}%
                            </div>
                          )}
                          
                          <ProductCard
                            p={p as any}
                            mode={mode}
                            image={img}
                            shopName={shopName}
                            shopPhone={
                              mode === "buyer" ? shopPhone : undefined
                            }
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
                  {(showAllExplore ? exploreMore : exploreMore.slice(0, 15)).map((p) => {
                    const img =
                      p.photoUrl || `/api/products/${p.id}/image`;
                    
                    const hasDiscount = p.compareAtPrice && p.compareAtPrice > p.price;
                    const discountPercent = hasDiscount 
                      ? Math.round(((p.compareAtPrice! - p.price) / p.compareAtPrice!) * 100)
                      : 0;

                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (mode === "buyer")
                            nav(`/s/${slug}/p/${p.id}`);
                          else nav(`/universal/p/${p.id}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (mode === "buyer")
                              nav(`/s/${slug}/p/${p.id}`);
                            else nav(`/universal/p/${p.id}`);
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "12px 0",
                          borderBottom: "1px solid #eee",
                          cursor: "pointer",
                          position: 'relative',
                        }}
                      >
                        {/* Thumbnail with discount badge */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div
                            style={{
                              width: 75,
                              height: 75,
                              borderRadius: 12,
                              backgroundImage: `url(${img})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundColor: "#eee",
                            }}
                          />
                          {hasDiscount && (
                            <div style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              background: '#dc2626',
                              color: '#fff',
                              padding: '2px 4px',
                              borderRadius: 3,
                              fontSize: 10,
                              fontWeight: 600,
                            }}>
                              -{discountPercent}%
                            </div>
                          )}
                        </div>

                        {/* Text */}
                        <div
                          style={{
                            flex: 1,
                            marginLeft: 14,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              marginBottom: 4,
                            }}
                          >
                            {p.title}
                          </div>

                          {/* Shop name in universal mode */}
                          {mode === 'universal' && p.tenant?.name && (
                            <div style={{
                              fontSize: 12,
                              color: '#666',
                              marginBottom: 2,
                            }}>
                              {p.tenant.name}
                            </div>
                          )}

                          {/* Stock status */}
                          {p.stock !== undefined && p.stock !== null && (
                            <div style={{ fontSize: 11, marginBottom: 2 }}>
                              {p.stock === 0 ? (
                                <span style={{ color: '#dc2626' }}>Out of stock</span>
                              ) : p.stock <= 5 ? (
                                <span style={{ color: '#f59e0b' }}>Only {p.stock} left</span>
                              ) : (
                                <span style={{ color: '#10b981' }}>In stock</span>
                              )}
                            </div>
                          )}

                          {p.description && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#999",
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
                            marginLeft: 12,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {hasDiscount && (
                            <div style={{
                              fontSize: 12,
                              color: '#999',
                              textDecoration: 'line-through',
                              marginBottom: 2,
                            }}>
                              {p.compareAtPrice} {p.currency}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: hasDiscount ? '#dc2626' : '#000',
                            }}
                          >
                            {p.price} {p.currency}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Load More button */}
                {!showAllExplore && exploreMore.length > 15 && (
                  <button
                    onClick={() => setShowAllExplore(true)}
                    style={{
                      width: '100%',
                      marginTop: 16,
                      padding: '12px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#374151',
                      cursor: 'pointer',
                    }}
                  >
                    Load More ({exploreMore.length - 15} more items)
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------- SHOP INFO DRAWER ---------- */}
      {product?.tenant && mode === 'buyer' && (
        <ShopInfoDrawer
          open={showShopInfo}
          onClose={() => setShowShopInfo(false)}
          shop={product.tenant}
          onCall={product.tenant.publicPhone ? callShop : undefined}
          onMessage={product.tenant.publicTelegramLink ? messageShop : undefined}
        />
      )}

      {/* ---------- IMAGE ZOOM MODAL ---------- */}
      {showImageModal && (
        <div
          onClick={() => setShowImageModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <button
            onClick={() => setShowImageModal(false)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              fontSize: 24,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>

          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
            <img
              src={imgUrl}
              alt={product?.title}
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
              }}
              onClick={(e) => e.stopPropagation()}
            />

            {hasImages && images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdx((old) => (old - 1 + images.length) % images.length);
                  }}
                  style={{
                    ...galleryBtnLeft,
                    width: 40,
                    height: 40,
                    fontSize: 28,
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdx((old) => (old + 1) % images.length);
                  }}
                  style={{
                    ...galleryBtnRight,
                    width: 40,
                    height: 40,
                    fontSize: 28,
                  }}
                >
                  ›
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                >
                  {idx + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
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

// Same look & feel as OwnerProductDetail
const galleryBtnLeft: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: 6,
  transform: "translateY(-50%)",
  border: "none",
  background: "rgba(0,0,0,.5)",
  color: "#fff",
  width: 28,
  height: 28,
  borderRadius: 999,
  cursor: "pointer",
};

const galleryBtnRight: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  right: 6,
  transform: "translateY(-50%)",
  border: "none",
  background: "rgba(0,0,0,.5)",
  color: "#fff",
  width: 28,
  height: 28,
  borderRadius: 999,
  cursor: "pointer",
};

const galleryThumb: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  background: "#ddd",
  backgroundSize: "cover",
  backgroundPosition: "center",
  cursor: "pointer",
};
