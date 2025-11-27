import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api/index";
import ShopCategoryFilterGridIdentical from "../components/shop/ShopCategoryFilterGridIdentical";
import { ProductCard } from "../components/product/ProductCard";
import { getTelegramWebApp } from "../lib/telegram";
import SmartSections from "../components/smart/SmartSections";


type UiProduct = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  photoUrl?: string | null;
  categoryId?: string | null;
  tenant?:
    | {
        id?: string;
        slug?: string;
        name?: string;
        publicPhone?: string | null;
        publicTelegramLink?: string | null;
      }
    | null;
  images?: { url?: string | null; webUrl?: string | null }[];
  compareAtPrice?: number | null;    
};

type UniversalResp = {
  page: number;
  perPage: number;
  total: number;
  items: UiProduct[];
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




export default function Universal() {
  const nav = useNavigate();
  const { t } = useTranslation();

  // Tell the header to use universal scope
useEffect(() => {
  window.dispatchEvent(new CustomEvent("tgshop:search-config", {
    detail: {
      scope: "universal",
      tenantSlug: null,
      placeholder: t('search_everything'),
      basePath: "/universal/search",
    },
  }));
}, []);


  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [products, setProducts] = useState<UiProduct[]>([]);
  const [shownInSmartSections, setShownInSmartSections] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [q, setQ] = useState("");
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [activeCatIds, setActiveCatIds] = useState<Set<string>>(new Set());

  // Clear shown products when category is selected
  useEffect(() => {
    if (activeCatId) {
      setShownInSmartSections(new Set());
    }
  }, [activeCatId]);

  /* ---------- Fetch initial universal products ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await api<UniversalResp>("/universal/products?page=1&perPage=100");
        if (!cancelled) {
          setProducts(data.items || []);
          setHasMore((data.items || []).length >= 100);
          setPage(1);
        }
      } catch (e) {
        if (!cancelled) setErr(t('failed_load_products'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Load more products ---------- */
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await api<UniversalResp>(`/universal/products?page=${nextPage}&perPage=100`);
      const newItems = data.items || [];
      
      setProducts(prev => [...prev, ...newItems]);
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
  }, [loadingMore, hasMore, page]);

  /* ---------- Derived filter (same as Buyer) ---------- */
  const filtered = useMemo(() => {
    let list = products;

    // Only filter out smart section products when no category is selected
    // (when category is selected, smart sections are hidden anyway)
    if (!activeCatId) {
      list = list.filter((p) => !shownInSmartSections.has(p.id));
    }

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
  }, [products, activeCatIds, activeCatId, q, shownInSmartSections]);
const tg = getTelegramWebApp();

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
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: "100vh", background: "#f5f5f7" }}>
      {/* Category grid — identical component, different data source */}
      <ShopCategoryFilterGridIdentical
        value={activeCatId}
        onChange={(id, allIds) => {
          setActiveCatId(id);
          setActiveCatIds(allIds ?? (id ? new Set([id]) : new Set()));
        }}
        countsUrlOverride="/universal/categories/with-counts"
      />
      
      {/* Smart personalized sections - only show when no category is selected */}
      {!activeCatId ? (
        <SmartSections 
          mode="universal" 
          onProductsShown={(ids) => setShownInSmartSections(new Set(ids))}
        />
      ) : null}

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

        const phone = p.tenant?.publicPhone ?? undefined;
        const telegram = p.tenant?.publicTelegramLink ?? null;

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
            shopPhone={phone}
            shopTelegram={telegram}   // 👈 NEW
            onCall={
              phone
                ? () => {
                    const shopName = p.tenant?.name || t('shop');
                    // Copy to clipboard and show alert
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(phone).then(() => {
                        alert(`📞 ${shopName}\n\nPhone: ${phone}\n\n✓ Number copied to clipboard!\n\nYou can now paste it in your phone app to call.`);
                      }).catch(() => {
                        alert(`📞 ${shopName}\n\nPhone: ${phone}\n\nPlease copy this number to call the shop.`);
                      });
                    } else {
                      alert(`📞 ${shopName}\n\nPhone: ${phone}\n\nPlease copy this number to call the shop.`);
                    }
                  }
                : undefined
            }


            onMessage={() =>
              openShopTelegram({
                ownerLink: telegram,
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
            {t('loading_more_products')}
          </div>
        )}

        {/* End of results */}
        {!hasMore && filtered.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px', opacity: 0.5, fontSize: 14 }}>
            {t('seen_all_products')}
          </div>
        )}
      </div>
    </div>
  );
}
