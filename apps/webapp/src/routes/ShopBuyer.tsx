// apps/webapp/src/routes/ShopBuyer.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api/index";
import { ProductCard } from "../components/product/ProductCard";
import { useNavigate, useParams, useLocation } from "react-router-dom";


import type { Product as UiProduct } from "../lib/types";
import type { Product as CardProduct } from "../components/product/ProductCard";
import ShopCategoryFilterGridIdentical from "../components/shop/ShopCategoryFilterGridIdentical";
import { getTelegramWebApp } from "../lib/telegram";
import { addItem } from "../lib/api/cart";
import { optimisticBumpCart } from "../lib/store";
import SmartSections from "../components/smart/SmartSections";
import ShopInfoDrawer from "../components/shop/ShopInfoDrawer";

/* ---------- Types ---------- */
type TenantLite = {
  id: string;
  slug: string;
  name: string;
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
};

type CatalogResp = {
  tenant: TenantLite;
  categories: { id: string; title: string; parentId?: string | null }[];
  products: UiProduct[];
};

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


function openShopTelegram(opts: {
  ownerLink?: string | null;
  productId?: string;
  tenantId?: string | null;
  tg: ReturnType<typeof getTelegramWebApp> | null;
}) {
  const { ownerLink, productId, tenantId, tg } = opts;

  const raw = ownerLink;
  const direct = normalizeTelegramLink(raw);

  let link: string | null = null;

  if (direct) {
    // ✅ direct owner / channel / group link
    link = direct;
  } else if (tenantId && productId) {
    const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME as
      | string
      | undefined;

    if (BOT_USERNAME && BOT_USERNAME !== "undefined") {
      link = `https://t.me/${BOT_USERNAME}?start=product_${productId}_${tenantId}`;
    }
  }

  if (!link) {
    alert("No valid Telegram contact is configured for this shop.");
    return;
  }

  if (tg && typeof tg.openTelegramLink === "function") {
    tg.openTelegramLink(link);
  } else {
    window.open(link, "_blank");
  }
}


/* ---------- Component ---------- */
export default function ShopBuyer() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();

  const loc = useLocation();
  
  const [showShopInfo, setShowShopInfo] = useState(false);

  // Referrer is now stored directly by the calling component before navigation

  useEffect(() => {
    if (!slug) return;
    // Remember the last buyer-shop page (base path is enough)
    localStorage.setItem("tgshop:lastShopPage", `/s/${slug}`);
    // If you want it to track subpaths/filters too, use loc.pathname instead:
    // localStorage.setItem("tgshop:lastShopPage", loc.pathname);
  }, [slug, loc.pathname]);


  useEffect(() => {
  if (!slug) return;
  window.dispatchEvent(new CustomEvent("tgshop:search-config", {
    detail: { scope: "buyer", tenantSlug: slug, placeholder: "Search in this shop…", basePath: `/joined/${slug}/search` },
  }));
}, [slug]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogResp | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [q, setQ] = useState("");
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [activeCatIds, setActiveCatIds] = useState<Set<string>>(new Set());
  const [shownInSmartSections, setShownInSmartSections] = useState<Set<string>>(new Set());

  // Clear shown products when category is selected
  useEffect(() => {
    if (activeCatId) {
      setShownInSmartSections(new Set());
    }
  }, [activeCatId]);



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
              publicTelegramLink: t.publicTelegramLink ?? null,
              logoWebUrl: t.logoWebUrl ?? null,
              description: t.description ?? null,
              instagramUrl: t.instagramUrl ?? null,
              facebookUrl: t.facebookUrl ?? null,
              twitterUrl: t.twitterUrl ?? null,
              returnPolicy: t.returnPolicy ?? null,
              shippingInfo: t.shippingInfo ?? null,
              deliveryMode: t.deliveryMode ?? null,
              location: t.location ?? null,
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

    async function fetchProducts(s: string, pageNum: number = 1): Promise<UiProduct[]> {
      const url = `/shop/${s}/products?page=${pageNum}&perPage=100`;
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
      } catch {
        return [];
      }
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
          fetchProducts(slug, 1),
          fetchTenant(slug),
        ]);

        const tenant: TenantLite =
          tenantMaybe ?? { id: "", slug, name: slug, publicPhone: null };

        if (!cancelled) {
          setCatalog({ tenant, categories: cats, products: prods });
          setHasMore(prods.length >= 100);
          setPage(1);
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

  /* ---------- Load more products ---------- */
  const loadMore = async () => {
    if (loadingMore || !hasMore || !slug) return;
    
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      
      const url = `/shop/${slug}/products?page=${nextPage}&perPage=100`;
      const res: any = await api<any>(url);
      const raw: any[] = res?.products ?? res?.items ?? res?.data?.products ?? [];
      const newItems = raw.map((p: any) => ({
        ...p,
        isActive:
          typeof p?.isActive === "boolean"
            ? p.isActive
            : typeof p?.active === "boolean"
            ? p.active
            : true,
      }));
      
      setCatalog(prev => prev ? {
        ...prev,
        products: [...prev.products, ...newItems]
      } : null);
      setPage(nextPage);
      setHasMore(newItems.length >= 100);
    } catch (e) {
      // Failed to load more products
    } finally {
      setLoadingMore(false);
    }
  };

  /* ---------- Infinite scroll handler ---------- */
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      
      // Load more when user is 500px from bottom
      if (scrollTop + clientHeight >= scrollHeight - 500) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, page, slug]);

  /* ---------- Derived values ---------- */
  const products = catalog?.products ?? [];

  const filtered = useMemo(() => {
    let list = products;

    // Only filter out smart section products when no category is selected
    // (when category is selected, smart sections are hidden anyway)
    if (!activeCatId) {
      list = list.filter((p: any) => !shownInSmartSections.has(p.id));
    }

    if (activeCatIds.size > 0) {
      list = list.filter((p: any) => p.categoryId && activeCatIds.has(p.categoryId));
    }

    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) => (p.title || "").toLowerCase().includes(s));
    }

    return list;
  }, [products, activeCatIds, activeCatId, q, shownInSmartSections]);

  /* ---------- Cart handler for overlay (buyer mode) ---------- */
  const handleAddToCart = async (prod: CardProduct): Promise<void> => {
  try {
    await addItem(prod.id, 1, { tenantSlug: slug });   // 1) send slug
    optimisticBumpCart(1);                              // 2) instant UI
    window.dispatchEvent(new CustomEvent("tgshop:cart-updated", { detail: { tenantSlug: slug } })); // 3) background refresh

    // Silent success - no popup needed, cart icon updates automatically
  } catch (err) {
    console.error("Add to cart failed:", err);
  }
};

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
  const shopTelegram = catalog.tenant.publicTelegramLink ?? null;
  const tenantId = catalog.tenant.id || null;
  const shopLogo = catalog.tenant.logoWebUrl ?? null;


const tg = getTelegramWebApp();


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header - Clickable to show shop info */}
      <div 
        onClick={() => setShowShopInfo(true)}
        style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 10,
          cursor: "pointer",
          padding: "8px 12px",
          borderRadius: 12,
          background: "#fff",
          border: "1px solid #eee",
        }}
      >
        <ShopAvatar name={shopName} url={shopLogo} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{shopName}</div>
          {catalog.tenant.description && (
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
              {catalog.tenant.description}
            </div>
          )}
        </div>
        <div style={{ fontSize: 18, color: "#999" }}>ℹ️</div>
      </div>


      {/* Unified category grid with recursive behavior */}
      <ShopCategoryFilterGridIdentical
        value={activeCatId}
        onChange={(id, allIds) => {
          setActiveCatId(id);
          setActiveCatIds(allIds ?? new Set());
        }}
      />

      {/* Smart personalized sections - only show when no category is selected */}
      {!activeCatId ? (
        <SmartSections 
          mode="buyer" 
          tenantSlug={slug}
          onProductsShown={(ids) => setShownInSmartSections(new Set(ids))}
          onAdd={handleAddToCart}
          shopPhone={shopPhone}
          shopTelegram={shopTelegram ?? undefined}
          onCall={
            shopPhone
              ? () => {
                  const shopName = catalog.tenant?.name || "Shop";
                  // Copy to clipboard and show alert
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(shopPhone).then(() => {
                      alert(`📞 ${shopName}\n\nPhone: ${shopPhone}\n\n✓ Number copied to clipboard!\n\nYou can now paste it in your phone app to call.`);
                    }).catch(() => {
                      alert(`📞 ${shopName}\n\nPhone: ${shopPhone}\n\nPlease copy this number to call the shop.`);
                    });
                  } else {
                    alert(`📞 ${shopName}\n\nPhone: ${shopPhone}\n\nPlease copy this number to call the shop.`);
                  }
                }
              : undefined
          }
          onMessage={() =>
            openShopTelegram({
              ownerLink: shopTelegram,
              tg,
            })
          }
        />
      ) : null}

      {/* Product list */}
      <div style={grid}>
        {filtered.map((p) => {
          const fromRelation =
            (p as any)?.images?.[0]?.webUrl ||
            (p as any)?.images?.[0]?.url ||
            (p as any)?.photoUrl ||
            null;
          const img = fromRelation || `/api/products/${p.id}/image`;

          const tenantId = catalog.tenant.id;
          const shopName = catalog.tenant.name;
          const shopPhone = catalog.tenant.publicPhone ?? undefined;

          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if ((e as any).defaultPrevented) return;
                e.preventDefault();
                e.stopPropagation();
                nav(`/s/${slug}/p/${p.id}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  nav(`/s/${slug}/p/${p.id}`);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <ProductCard
  p={p}
  mode="buyer"
  image={img}
  shopName={shopName}
  shopPhone={shopPhone}
  shopTelegram={shopTelegram}   // 👈 NEW
  onAdd={handleAddToCart}
  onCall={
  shopPhone
    ? () => {
        const shopName = catalog.tenant?.name || "Shop";
        // Copy to clipboard and show alert
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shopPhone).then(() => {
            alert(`📞 ${shopName}\n\nPhone: ${shopPhone}\n\n✓ Number copied to clipboard!\n\nYou can now paste it in your phone app to call.`);
          }).catch(() => {
            alert(`📞 ${shopName}\n\nPhone: ${shopPhone}\n\nPlease copy this number to call the shop.`);
          });
        } else {
          alert(`📞 ${shopName}\n\nPhone: ${shopPhone}\n\nPlease copy this number to call the shop.`);
        }
      }
    : undefined
}


  onMessage={() =>
    openShopTelegram({
      ownerLink: shopTelegram,
      tg,
    })
  }
/>


            </div>
          );

        })}
        {filtered.length === 0 && (q.trim() || activeCatId) && (
          <div style={{ opacity: 0.6 }}>
            {q.trim() ? 'No products match your search.' : 'No products in this category.'}
          </div>
        )}

        {/* Loading more indicator */}
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '20px', opacity: 0.6 }}>
            Loading more products...
          </div>
        )}

        {/* End of results */}
        {!hasMore && filtered.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px', opacity: 0.5, fontSize: 14 }}>
            You've seen all products
          </div>
        )}
      </div>

      {/* Shop Info Drawer */}
      <ShopInfoDrawer
        open={showShopInfo}
        onClose={() => setShowShopInfo(false)}
        shop={catalog.tenant}
        onCall={shopPhone ? () => {
          const shopName = catalog.tenant?.name || "Shop";
          // Copy to clipboard and show alert
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shopPhone).then(() => {
              alert(`📞 ${shopName}\n\nPhone: ${shopPhone}\n\n✓ Number copied to clipboard!\n\nYou can now paste it in your phone app to call.`);
            }).catch(() => {
              alert(`📞 ${shopName}\n\nPhone: ${shopPhone}\n\nPlease copy this number to call the shop.`);
            });
          } else {
            alert(`📞 ${shopName}\n\nPhone: ${shopPhone}\n\nPlease copy this number to call the shop.`);
          }
        } : undefined}
        onMessage={shopTelegram ? () => openShopTelegram({ ownerLink: shopTelegram, productId: undefined, tenantId, tg }) : undefined}
      />
    </div>
  );
}

/* ---------- Styles ---------- */
const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 10,
};


function ShopAvatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  const initial = (name || "S").slice(0, 1).toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "999px",
        backgroundColor: "#eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            // if image fails, hide it so the initial is visible
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
