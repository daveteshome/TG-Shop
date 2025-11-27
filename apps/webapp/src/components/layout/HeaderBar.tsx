// apps/webapp/src/components/layout/HeaderBar.tsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWishlistCount } from "../../lib/wishlist";
import { useCartCount, refreshCartCount } from "../../lib/store";
import SearchBox from "../../components/search/SearchBox";
import { getProfile } from "../../lib/api/profile";
import type { Profile as UserProfile } from "../../lib/types";
import "./HeaderBar.css";


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
        background: "rgba(255, 255, 255, 0.95)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "10px",
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        cursor: "pointer",
        color: "#EF4444",
        backdropFilter: "blur(10px)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      ♥
      {n > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: "#EF4444",
            color: "#fff",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 6px",
            lineHeight: 1,
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
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
        background: "rgba(255, 255, 255, 0.95)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "10px",
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        cursor: "pointer",
        backdropFilter: "blur(10px)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      🛒
      {n > 0 && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: "#EF4444",
            color: "#fff",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 6px",
            lineHeight: 1,
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
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
        border: "2px solid rgba(255, 255, 255, 0.3)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: avatarUrl ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.95)",
        cursor: "pointer",
        overflow: "hidden",
        fontSize: 13,
        fontWeight: 600,
        color: avatarUrl ? "#fff" : "#667eea",
        backdropFilter: "blur(10px)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
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

  // Clear admin tracking when navigating away from admin pages
  React.useEffect(() => {
    if (!path.startsWith('/admin')) {
      localStorage.removeItem("tgshop:lastAdminPage");
    }
  }, [path]);

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
  
  // Show back button if we came from admin, even on shop home pages
  const cameFromAdmin = !!localStorage.getItem("tgshop:lastAdminPage");
  
  // Check if buyer shop has a referrer (came from View Shop button)
  const buyerShopHasReferrer = isBuyerShopHome && !!sessionStorage.getItem('viewShopFrom');
  
  const isRootLike = !cameFromAdmin && !buyerShopHasReferrer && (isUniversalHome || isOwnerShopHome || isBuyerShopHome || isMyShopHome);

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
  const isInventoryHistory = /^\/shop\/[^/]+\/inventory-history\/?$/.test(path);
  const isTeamPerformance = /^\/shop\/[^/]+\/team-performance\/?$/.test(path);

  const isFavorites = path === "/favorites";
  
  // Admin page detection
  const isAdminProducts = path === "/admin/products";
  const isAdminUsers = path === "/admin/users";
  const isAdminShops = path === "/admin/shops";
  const isAdminCategories = path === "/admin/categories";


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
  function smartBack() {
  // Check if we're on owner shop home with add product panel open
  const ownerShopHomeMatch = path.match(/^\/shop\/[^/]+\/?$/);
  if (ownerShopHomeMatch) {
    // Try to close any open panel first
    const panelClosed = window.dispatchEvent(new CustomEvent("tgshop:close-panel", { cancelable: true }));
    if (!panelClosed) {
      // Panel was open and closed it, don't navigate
      return;
    }
  }
  
  // Special handling for buyer shop pages - check if we have an explicit "from" location
  const buyerShopMatch = path.match(/^\/s\/[^/]+\/?$/);
  if (buyerShopMatch) {
    const from = sessionStorage.getItem('viewShopFrom');
    if (from) {
      sessionStorage.removeItem('viewShopFrom');
      nav(from, { replace: true });
      return;
    }
  }
  
  // Always try browser history first - this was working before
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

  // /s/:slug/p/:id → fallback navigation
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

  // /shop/:slug/p/:id → fallback navigation
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

  // OWNER analytics sub-pages: inventory-history, team-performance → back to analytics
  {
    const m = path.match(/^\/shop\/([^/]+)\/(inventory-history|team-performance)(?:\/|$)/);
    if (m) {
      const slug = m[1];
      nav(`/shop/${slug}/analytics`, { replace: true });
      return;
    }
  }

  // OWNER analytics/top-products → back to analytics
  {
    const m = path.match(/^\/shop\/([^/]+)\/analytics\/top-products(?:\/|$)/);
    if (m) {
      const slug = m[1];
      nav(`/shop/${slug}/analytics`, { replace: true });
      return;
    }
  }

  // OWNER team member detail: /shop/:slug/team/:userId → back to invitations
  {
    const m = path.match(/^\/shop\/([^/]+)\/team\/[^/]+/);
    if (m) {
      const slug = m[1];
      nav(`/shop/${slug}/invitations`, { replace: true });
      return;
    }
  }

  // OWNER side drawer pages: /shop/:slug/(settings|categories|invitations|analytics) → back to shop root
  {
    const m = path.match(
      /^\/shop\/([^/]+)\/(settings|categories|invitations|analytics)(?:\/|$)/
    );
    if (m) {
      const slug = m[1];
      nav(`/shop/${slug}`, { replace: true });
      return;
    }
  }

  // ADMIN pages fallback: check for specific referrers first
  if (path.startsWith('/admin/') && path !== '/admin') {
    // Check if we have a stored referrer for this page
    if (path === '/admin/products') {
      const referrer = localStorage.getItem("tgshop:adminProductsReferrer");
      if (referrer) {
        localStorage.removeItem("tgshop:adminProductsReferrer");
        nav(referrer, { replace: true });
        return;
      }
    }
    
    if (path === '/admin/shops') {
      const referrer = localStorage.getItem("tgshop:adminShopsReferrer");
      if (referrer) {
        localStorage.removeItem("tgshop:adminShopsReferrer");
        nav(referrer, { replace: true });
        return;
      }
    }
    
    // Default: go to admin home
    nav('/admin', { replace: true });
    return;
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
        height: 56,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderBottom: "none",
        boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
      }}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
        }}
      >
        {showBack ? (
          <button aria-label="Back" onClick={smartBack} style={iconBtnLight}>
            ←
          </button>
        ) : (
          <button
            onClick={onTitleClick}
            style={{ ...iconBtnLight, visibility: onTitleClick ? "visible" : "hidden" }}
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
              padding: "8px 12px",
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              backdropFilter: "blur(10px)",
            }}
          >
            <span style={{ opacity: 0.9, color: "#fff" }}>🔎</span>
            <div style={{ flex: 1 }}>
              {isShopsList ? (
                // /shops -> filter my owned shops
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search your shops…"
                  className="header-search-input"
                />
              ) : isJoinedShopsList ? (
                // /joined -> filter shops I joined
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search joined shops…"
                  className="header-search-input"
                />
              ) : isOwnerOrdersList ? (
                // /shop/:slug/orders -> search orders in my shop
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search shop orders…"
                  className="header-search-input"
                />
              ) : isOwnerCategories ? (
                // /shop/:slug/categories -> search categories
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search categories…"
                  className="header-search-input"
                />
              ) : isOwnerInvitations ? (
                // /shop/:slug/invitations -> search members / roles
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search members & roles…"
                  className="header-search-input"
                />
              ) : isInventoryHistory ? (
                // /shop/:slug/inventory-history -> search inventory movements
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search products, reasons…"
                  className="header-search-input"
                />
              ) : isTeamPerformance ? (
                // /shop/:slug/team-performance -> search team members
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search team members…"
                  className="header-search-input"
                />
              ) : isBuyerOrdersList ? (
                // /s/:slug/orders -> buyer orders (previous step)
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search your orders…"
                  className="header-search-input"
                />
              ) : isBuyerCart ? (
                // /s/:slug/cart -> buyer cart (previous step)
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search in cart…"
                  className="header-search-input"
                />
              ) : isFavorites ? (
                // /favorites -> filter universal favorites
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search favorites…"
                  className="header-search-input"
                />
              ) : isAdminProducts ? (
                // /admin/products -> search products
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search products (title, shop)…"
                  className="header-search-input"
                />
              ) : isAdminUsers ? (
                // /admin/users -> search users
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search users (name, username, ID)…"
                  className="header-search-input"
                />
              ) : isAdminShops ? (
                // /admin/shops -> search shops
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search shops (name, slug, owner)…"
                  className="header-search-input"
                />
              ) : isAdminCategories ? (
                // /admin/categories -> search categories
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  placeholder="Search categories (all levels)…"
                  className="header-search-input"
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
                  inHeader={true}
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


        {/* Right side: favorites in universal, cart in buyer, profile in /shops and /joined */}
        {rightOverride && !isShopsList && !isJoinedShopsList ? (
          rightOverride
        ) : isShopsList || isJoinedShopsList ? (
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
          <span style={{ ...iconBtnLight, visibility: "hidden" }} />
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
  border: "1px solid #E5E7EB",
  background: "#F9FAFB",
  color: "#111827",
  fontSize: "18px",
  fontWeight: 600,
};

const iconBtnLight: React.CSSProperties = {
  height: 36,
  width: 36,
  borderRadius: 10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  background: "rgba(255, 255, 255, 0.2)",
  color: "#fff",
  fontSize: "18px",
  fontWeight: 600,
  backdropFilter: "blur(10px)",
};
