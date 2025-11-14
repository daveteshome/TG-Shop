import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api/index";
import ShopCategoryFilterGridIdentical from "../components/shop/ShopCategoryFilterGridIdentical";
import { ProductCard } from "../components/product/ProductCard";
import { getTelegramWebApp } from "../lib/telegram";


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
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const username = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (!username) return null;
  return `https://t.me/${username}`;
}

function openShopTelegram(opts: {
  ownerLink?: string | null;
  tg: ReturnType<typeof getTelegramWebApp> | null;
}) {
  const { ownerLink, tg } = opts;

  const direct = normalizeTelegramLink(ownerLink);

  if (!direct) {
    alert("Shop has no Telegram contact link configured.");
    return;
  }

  if (tg && typeof tg.openTelegramLink === "function") {
    tg.openTelegramLink(direct);
  } else {
    window.open(direct, "_blank");
  }
}



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
                    const tg = getTelegramWebApp();

                    if (tg && typeof tg.openLink === "function") {
                      tg.openLink(`tel:${phone}`);
                    } else {
                      window.location.href = `tel:${phone}`;
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


        {filtered.length === 0 && (
          <div style={{ opacity: 0.6 }}>No products match your search.</div>
        )}
      </div>
    </div>
  );
}
