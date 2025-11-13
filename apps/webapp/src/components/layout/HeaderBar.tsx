// apps/webapp/src/components/layout/HeaderBar.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWishlistCount } from "../../lib/wishlist";
import { useCartCount, refreshCartCount } from "../../lib/store";
import SearchBox from "../../components/search/SearchBox";

type Props = {
  onOpenMenu?: () => void;
  title?: string;
  onTitleClick?: () => void;
  onCartClick?: () => void;
  rightOverride?: React.ReactNode;
};

/** Resolve the in-app routed path regardless of BrowserRouter vs HashRouter and Telegram /tma prefix */
function routedPath(loc: ReturnType<typeof useLocation>): string {
  const hash = loc.hash || "";
  const hashPath = hash.startsWith("#/") ? hash.slice(1) : null; // "#/s/..." -> "/s/..."
  const base = hashPath ?? loc.pathname;
  return base.replace(/^\/tma(?=\/|$)/, "") || "/";
}

function FavoriteHeaderButton() {
  const n = useWishlistCount();
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav("/favorites")}
      aria-label={n > 0 ? `Favorites (${n})` : "Favorites"}
      title={n > 0 ? `Favorites (${n})` : "Favorites"}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        fontSize: 20,
        cursor: "pointer",
        lineHeight: 1,
      }}
    >
      ♥
      {n > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: "#e11",
            color: "#fff",
            borderRadius: 999,
            fontSize: 10,
            padding: "1px 5px",
            lineHeight: 1,
          }}
        >
          {n}
        </span>
      )}
    </button>
  );
}

function CartHeaderButton() {
  const n = useCartCount();
  const nav = useNavigate();
  const loc = useLocation();

  const path = routedPath(loc);
  const m = path.match(/^\/s\/([^/]+)/);
  const slug = m?.[1];

  React.useEffect(() => {
    refreshCartCount(slug || undefined);
  }, [slug]);

  const to = slug ? `/s/${slug}/cart` : "/cart";

  return (
    <button
      onClick={() => nav(to)}
      aria-label={n > 0 ? `Cart (${n})` : "Cart"}
      title={n > 0 ? `Cart (${n})` : "Cart"}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        fontSize: 20,
        cursor: "pointer",
        lineHeight: 1,
      }}
    >
      🛒
      {n > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: "#e11",
            color: "#fff",
            borderRadius: 999,
            fontSize: 10,
            padding: "1px 5px",
            lineHeight: 1,
          }}
        >
          {n}
        </span>
      )}
    </button>
  );
}

export default function HeaderBar({
  title,
  onTitleClick,
  onCartClick,
  rightOverride,
}: Props) {
  const { t } = useTranslation();
  const loc = useLocation();
  const nav = useNavigate();

  const path = routedPath(loc);

  // Section detection on normalized path
  const isUniversalSection = path === "/" || path.startsWith("/universal");
  const inOwnerShop = path.startsWith("/shop/");
  const inBuyerShop = path.startsWith("/s/");
  const inShop = inOwnerShop || inBuyerShop;

  // Root-like for showing/hiding back button
  const isUniversalHome = path === "/" || path === "/universal";
  const isOwnerShopHome = /^\/shop\/[^/]+$/.test(path);
  const isBuyerShopHome = /^\/s\/[^/]+$/.test(path);
  const isMyShopHome = path === "/shops" || path === "/my";
  const isRootLike = isUniversalHome || isOwnerShopHome || isBuyerShopHome || isMyShopHome;

  const slug = inShop ? path.split("/")[2] : null;
  const showBack = !isRootLike;

  // Smart back: prefer real history; otherwise compute fallback per route
  function smartBack() {
    if (window.history.length > 1) {
      nav(-1);
      return;
    }

    // /universal/p/:id → last universal (or /universal)
    if (/^\/universal\/p\/[^/]+/.test(path)) {
      const lastUniversal = localStorage.getItem("tgshop:lastUniversalPage") || "/universal";
      nav(lastUniversal, { replace: true });
      return;
    }

    // /s/:slug/p/:id → last shop (or /s/:slug)
    {
      const m = path.match(/^\/s\/([^/]+)\/p\/[^/]+/);
      if (m) {
        const s = m[1];
        const lastShop = localStorage.getItem("tgshop:lastShopPage");
        nav(lastShop || `/s/${s}`, { replace: true });
        return;
      }
    }

    // /shop/:slug/p/:id → last owner shop (or /shop/:slug)
    {
      const m = path.match(/^\/shop\/([^/]+)\/p\/[^/]+/);
      if (m) {
        const s = m[1];
        const lastOwner = localStorage.getItem("tgshop:lastOwnerShopPage");
        nav(lastOwner || `/shop/${s}`, { replace: true });
        return;
      }
    }

    // Generic fallback
    nav("/universal", { replace: true });
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "#fff",
        borderBottom: "1px solid #eee",
      }}
    >
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
        }}
      >
        {showBack ? (
          <button aria-label="Back" onClick={smartBack} style={iconBtn}>
            ←
          </button>
        ) : (
          <button
            onClick={onTitleClick}
            style={{ ...iconBtn, visibility: onTitleClick ? "visible" : "hidden" }}
            aria-label="Title action"
          >
            {title === "←" ? "←" : "·"}
          </button>
        )}

        {/* Scoped Search */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
            <span style={{ opacity: 0.6 }}>🔎</span>
            <div style={{ flex: 1 }}>
              <SearchBox
                scope={(window as any).__tgshopSearchScope || "universal"}
                tenantSlug={(window as any).__tgshopSearchTenantSlug || undefined}
                placeholder={(window as any).__tgshopSearchPlaceholder || "Search…"}
                onSubmit={(q) => {
                  const base = (window as any).__tgshopSearchBasePath || "/universal/search";
                  nav(`${base}?q=${encodeURIComponent(q)}`);
                }}
                onSelectItem={(it) => {
                  const scope = (window as any).__tgshopSearchScope || "universal";
                  const tslug = (window as any).__tgshopSearchTenantSlug;
                  if (scope === "universal") nav(`/universal/p/${it.id}`);
                  else if (scope === "buyer" && tslug) nav(`/s/${tslug}/p/${it.id}`);
                  else if (scope === "owner" && tslug) nav(`/shop/${tslug}/p/${it.id}`);
                  else {
                    const base = (window as any).__tgshopSearchBasePath || "/universal/search";
                    nav(`${base}?q=${encodeURIComponent(it.title || "")}`);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Right side: favorites in universal, cart in buyer */}
        {rightOverride ? (
          rightOverride
        ) : isUniversalSection ? (
          <FavoriteHeaderButton />
        ) : inBuyerShop ? (
          <CartHeaderButton />
        ) : (
          <span style={{ ...iconBtn, visibility: "hidden" }} />
        )}
      </div>
    </header>
  );
}

const iconBtn: React.CSSProperties = {
  height: 36,
  width: 36,
  borderRadius: 10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #eef2f7",
  background: "#fff",
};
