// apps/webapp/src/components/layout/HeaderBar.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWishlistCount } from "../../lib/wishlist";
import { useCartCount, refreshCartCount } from "../../lib/store";
import SearchBox from "../../components/search/SearchBox";
import { getProfile } from "../../lib/api/profile";
import type { Profile as UserProfile } from "../../lib/types";


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

function ProfileHeaderButton({
  user,
  initials,
  onClick,
}: {
  user: UserProfile | null;
  initials: string;
  onClick: () => void;
}) {
  const avatarUrl = user?.avatarWebUrl || null;

  return (
    <button
      aria-label="Profile"
      onClick={onClick}
      title="Profile"
      style={{
        height: 36,
        width: 36,
        borderRadius: "999px",
        border: "1px solid rgba(0,0,0,.08)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#eee",
        cursor: "pointer",
        overflow: "hidden",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={user?.name || user?.username || user?.tgId || "Profile"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            // hide broken image, initials will show next render if we clear avatarWebUrl later
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        initials
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

    // Smarter memory back: drawer origin OR last known context (shop / universal)
  function backWithMemory(key: string, fallback: string) {
    // 1) Explicit drawer memory (when opened from DrawerMenu)
    const fromDrawer = localStorage.getItem(`tgshop:lastFrom:${key}`);
    if (fromDrawer && fromDrawer !== fallback) {
      nav(fromDrawer, { replace: true });
      return;
    }

    // 2) Global context memory (where the user was browsing)
    const lastBuyerShop = localStorage.getItem("tgshop:lastShopPage");           // /s/<slug>
    const lastOwnerShop = localStorage.getItem("tgshop:lastOwnerShopPage");     // /shop/<slug>
    const lastUniversal = localStorage.getItem("tgshop:lastUniversalPage");     // /universal…

    const target =
      lastBuyerShop ||
      lastOwnerShop ||
      lastUniversal ||
      fallback;

    nav(target, { replace: true });
  }



    // 👇 NEW: user profile state + loader
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        setUserProfile(p);
      } catch (e) {
        console.error("Failed to load profile in HeaderBar", e);
      }
    })();
  }, []);

  // 👇 NEW: initials helper
  function getUserInitials(p?: UserProfile | null): string {
    if (!p) return "?";
    const base = p.name || p.username || p.tgId || "?";
    const parts = base.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || "?").toUpperCase();
  }

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

  // Page-type flags for context-aware search
  const isShopsList = path === "/shops";
  const isJoinedShopsList = path === "/joined";

  const isBuyerOrdersList = /^\/s\/[^/]+\/orders\/?$/.test(path);
  const isBuyerCart = /^\/s\/[^/]+\/cart\/?$/.test(path);

  const isOwnerOrdersList = /^\/shop\/[^/]+\/orders\/?$/.test(path);
  const isOwnerCategories = /^\/shop\/[^/]+\/categories\/?$/.test(path);
  const isOwnerInvitations = /^\/shop\/[^/]+\/invitations\/?$/.test(path);

  const isFavorites = path === "/favorites";


  // Shared query in URL (?q=...)
  const params = new URLSearchParams(loc.search || "");
  const searchQ = params.get("q") || "";

  function updateSearchQuery(next: string) {
    const p = new URLSearchParams(loc.search || "");
    if (next) p.set("q", next);
    else p.delete("q");
    const qs = p.toString();
    const target = qs ? `${path}?${qs}` : path;
    // replace so we don't spam history on every keystroke
    nav(target, { replace: true });
  }

  // Product search config (default: product SearchBox)
  let productScope: "universal" | "owner" | "buyer" = "universal";
  let productTenantSlug: string | undefined;
  let productBasePath = "/universal/search";

  if (isUniversalSection) {
    productScope = "universal";
    productBasePath = "/universal/search";
  } else if (inOwnerShop && slug) {
    productScope = "owner";
    productTenantSlug = slug;
    productBasePath = `/shop/${slug}/search`;
  } else if (inBuyerShop && slug) {
    productScope = "buyer";
    productTenantSlug = slug;
    productBasePath = `/s/${slug}/search`;
  }


  // Smart back: prefer real history; otherwise compute fallback per route
  // Smart back: prefer real history; otherwise compute fallback per route
  function smartBack() {
  if (window.history.length > 1) {
    nav(-1);
    return;
  }

  // Drawer-based global pages → go back where they were opened from
    if (path === "/orders") {
      backWithMemory("orders", "/universal");
      return;
    }

    if (path === "/joined") {
      backWithMemory("joined", "/universal");
      return;
    }

    // /shops?mine=1 normalizes to /shops
    if (path === "/shops") {
      backWithMemory("shops", "/universal");
      return;
    }

    if (path === "/profile") {
      backWithMemory("profile", "/universal");
      return;
    }

    if (path === "/settings") {
      backWithMemory("settings", "/universal");
      return;
    }

  // /universal/p/:id → last universal (or /universal)
  if (/^\/universal\/p\/[^/]+/.test(path)) {
    const lastUniversal =
      localStorage.getItem("tgshop:lastUniversalPage") || "/universal";
    nav(lastUniversal, { replace: true });
    return;
  }

  // /s/:slug/p/:id → last shop page (or /s/:slug)
  {
    const m = path.match(/^\/s\/([^/]+)\/p\/[^/]+/);
    if (m) {
      const s = m[1];
      const lastShop =
        localStorage.getItem("tgshop:lastShopPage") || `/s/${s}`;
      nav(lastShop, { replace: true });
      return;
    }
  }

  // /shop/:slug/p/:id → last owner shop page (or /shop/:slug)
  {
    const m = path.match(/^\/shop\/([^/]+)\/p\/[^/]+/);
    if (m) {
      const s = m[1];
      const lastOwner =
        localStorage.getItem("tgshop:lastOwnerShopPage") || `/shop/${s}`;
      nav(lastOwner, { replace: true });
      return;
    }
  }

  // Buyer child pages (cart, checkout, orders list)
  {
    const m = path.match(/^\/s\/([^/]+)\/(cart|checkout|orders)(?:\/?$)/);
    if (m) {
      const slug = m[1];
      const section = m[2];

      if (section === "checkout") {
        nav(`/s/${slug}/cart`, { replace: true });
      } else if (section === "orders") {
        nav(`/s/${slug}`, { replace: true });
      } else {
        // cart
        nav(`/s/${slug}`, { replace: true });
      }
      return;
    }
  }

  // Buyer order detail: /s/:slug/orders/:orderId → back to orders list
  {
    const m = path.match(/^\/s\/([^/]+)\/orders\/[^/]+/);
    if (m) {
      const slug = m[1];
      nav(`/s/${slug}/orders`, { replace: true });
      return;
    }
  }

  // OWNER orders list: /shop/:slug/orders → back to shop root
  {
    const m = path.match(/^\/shop\/([^/]+)\/orders\/?$/);
    if (m) {
      const slug = m[1];
      nav(`/shop/${slug}`, { replace: true });
      return;
    }
  }


  // OWNER orders list: /shop/:slug/orders → back to shop root
  {
    const m = path.match(/^\/shop\/([^/]+)\/orders\/?$/);
    if (m) {
      const slug = m[1];
      nav(`/shop/${slug}`, { replace: true });
      return;
    }
  }

  // OWNER order detail: /shop/:slug/orders/:orderId → back to orders list
  {
    const m = path.match(/^\/shop\/([^/]+)\/orders\/[^/]+/);
    if (m) {
      const slug = m[1];
      nav(`/shop/${slug}/orders`, { replace: true });
      return;
    }
  }

   // OWNER side drawer pages: /shop/:slug/(settings|categories|invitations|top-products) → back to shop root
  {
    const m = path.match(
      /^\/shop\/([^/]+)\/(settings|categories|invitations|top-products|analytics)(?:\/|$)/
    );
    if (m) {
      const slug = m[1];
      nav(`/shop/${slug}`, { replace: true });
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
                {/* Scoped Search */}
                {/* Scoped Search */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
            }}
          >
            <span style={{ opacity: 0.6 }}>🔎</span>
            <div style={{ flex: 1 }}>
              {isShopsList ? (
                // /shops -> filter my owned shops
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search your shops…"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 14,
                  }}
                />
              ) : isJoinedShopsList ? (
                // /joined -> filter shops I joined
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search joined shops…"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 14,
                  }}
                />
              ) : isOwnerOrdersList ? (
                // /shop/:slug/orders -> search orders in my shop
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search shop orders…"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 14,
                  }}
                />
              ) : isOwnerCategories ? (
                // /shop/:slug/categories -> search categories
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search categories…"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 14,
                  }}
                />
              ) : isOwnerInvitations ? (
                // /shop/:slug/invitations -> search members / roles
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search members & roles…"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 14,
                  }}
                />
              ) : isBuyerOrdersList ? (
                // /s/:slug/orders -> buyer orders (previous step)
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search your orders…"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 14,
                  }}
                />
              ) : isBuyerCart ? (
                // /s/:slug/cart -> buyer cart (previous step)
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search in cart…"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 14,
                  }}
                />
              ) : isFavorites ? (
                // /favorites -> filter universal favorites
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search favorites…"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 14,
                  }}
                />
              ) : (
                // Default: product search (universal / owner / buyer)
                <SearchBox
                  scope={productScope}
                  tenantSlug={productTenantSlug}
                  placeholder={
                    isUniversalSection
                      ? "Search products…"
                      : inOwnerShop
                      ? "Search products in this shop…"
                      : inBuyerShop
                      ? "Search this shop…"
                      : "Search…"
                  }
                  onSubmit={(q) => {
                    nav(`${productBasePath}?q=${encodeURIComponent(q)}`);
                  }}
                  onSelectItem={(it) => {
                    if (productScope === "universal") {
                      nav(`/universal/p/${it.id}`);
                    } else if (productScope === "buyer" && productTenantSlug) {
                      nav(`/s/${productTenantSlug}/p/${it.id}`);
                    } else if (productScope === "owner" && productTenantSlug) {
                      nav(`/shop/${productTenantSlug}/p/${it.id}`);
                    } else {
                      nav(
                        `${productBasePath}?q=${encodeURIComponent(
                          it.title || ""
                        )}`
                      );
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>


        {/* Right side: favorites in universal, cart in buyer, profile in /shops */}
        {rightOverride && !isShopsList ? (
          rightOverride
        ) : isShopsList ? (
          <ProfileHeaderButton
            user={userProfile}
            initials={getUserInitials(userProfile)}
            onClick={() => nav("/profile")}
          />
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
