// apps/webapp/src/App.tsx
import React, { useState, useMemo, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { api } from "./lib/api/index";

import Home from "./routes/Home";
import Cart from "./routes/Cart";
import Profile from "./routes/Profile";
import Settings from "./routes/Settings";
import ShopOrderDetail from "./routes/ShopOrderDetail";
import ProductDetail from "./routes/ProductDetail";
import OwnerProductDetail from "./routes/OwnerProductDetail";
import Categories from "./routes/Categories";
import Products from "./routes/Products";
import Universal from "./routes/Universal";
import Shop from "./routes/Shop";
import ShopList from "./routes/ShopList";
import ShopSettings from "./routes/ShopSettings";
import ShopCategories from "./routes/ShopCategories";
import ShopInvitations from "./routes/ShopInvitations";
import ShopMemberDetail from "./routes/ShopMemberDetail";
import ShopOrders from "./routes/ShopOrders";
import ShopAnalytics from "./routes/ShopAnalytics";
import ShopTopProducts from "./routes/ShopTopProducts";
import InventoryHistory from "./routes/InventoryHistory";
import TeamPerformance from "./routes/TeamPerformance";
import JoinedShops from "./routes/JoinedShops";
import ShopBuyer from "./routes/ShopBuyer";
import BuyerOrders from "./routes/BuyerOrders";
import BuyerOrderDetail from "./routes/BuyerOrderDetail";
import Orders from "./routes/Orders";
import PlatformAdmin from "./routes/PlatformAdmin";
import AdminShops from "./routes/AdminShops";
import AdminUsers from "./routes/AdminUsers";
import AdminProducts from "./routes/AdminProducts";
import AdminShopDetail from "./routes/AdminShopDetail";
import AdminUserDetail from "./routes/AdminUserDetail";
import AdminSettings from "./routes/AdminSettings";
import AdminReports from "./routes/AdminReports";
import AdminUniversal from "./routes/AdminUniversal";
import AdminCategories from "./routes/AdminCategories";

import ErrorBoundary from "./components/common/ErrorBoundary";
import HeaderBar from "./components/layout/HeaderBar";
import DrawerMenu from "./components/DrawerMenu";
import ShopProfileDrawer from "./components/shop/ShopProfileDrawer";
import FooterNav from "./components/layout/FooterNav";
import Favorites from "./routes/Favorites";

import Checkout from "./routes/Checkout";

import { ensureInitDataCached, ready } from "./lib/telegram";

/* ====================== Styles ====================== */

const appStyle: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: 10,
  fontFamily: "var(--font-am)",
  background: "var(--color-bg-secondary)",
  color: "var(--color-text-primary)",
  minHeight: "100vh",
  boxSizing: "border-box",
};


/** Normalize a react-router location for both BrowserRouter / HashRouter and /tma prefix */
function routedPath(loc: ReturnType<typeof useLocation>): string {
  const hash = (loc as any).hash || "";
  const hashPath = hash.startsWith("#/") ? hash.slice(1) : null;
  const base = (hashPath ?? loc.pathname) || "/";
  return base.replace(/^\/tma(?=\/|$)/, "") || "/";
}

/** Read current path from window (same normalization) */
function routedPathFromWindow(): string {
  const hash = window.location.hash || "";
  const hashPath = hash.startsWith("#/") ? hash.slice(1) : null;
  const base = (hashPath ?? window.location.pathname) || "/";
  return base.replace(/^\/tma(?=\/|$)/, "") || "/";
}

// Decide where "back" should go from the current path
// number means use history steps (e.g., -1), string means a concrete path
function getBackTarget(pathname: string): string | number | null {
  if (pathname === "/") return null;
  if (pathname === "/shops") return "/";

  // ----- product detail (owner or buyer) -> always step back -----
  if (/^(?:\/shop|\/s)\/[^/]+\/p\/[^/]+$/.test(pathname)) {
    return -1; // exact previous page (keeps subcategory/filter/scroll)
  }

  // ----- OWNER side -----
  const owner = pathname.match(/^\/shop\/([^/]+)(?:\/.*)?$/);
  if (owner) {
    const slug = owner[1];
    const isRoot = pathname === `/shop/${slug}` || pathname === `/shop/${slug}/`;
    if (isRoot) return "/shops";
    
    // All owner child pages → use browser history (respects navigation flow)
    // This means: analytics → shop, inventory-history → analytics, team-performance → analytics
    return -1;
  }

  // ----- BUYER side -----
  const buyer = pathname.match(/^\/s\/([^/]+)(?:\/.*)?$/);
  if (buyer) {
    const slug = buyer[1];
    const isRoot = pathname === `/s/${slug}` || pathname === `/s/${slug}/`;
    if (isRoot) return "/joined";
    // any other buyer child (e.g., /orders) → step back
    return -1;
  }

  return null;
}

/* ====================== Memory: separate Resume vs Back ====================== */

/**
 * Save the EXACT current path (detail or list) for resume-after-close.
 * Writes: tgshop:lastPathExact
 */
function useRememberExactPath() {
  const loc = useLocation();
  useEffect(() => {
    try {
      const exact = routedPath(loc) + (loc.search || "");
      localStorage.setItem("tgshop:lastPathExact", exact);
      localStorage.setItem("tgshop:lastPathExactAt", String(Date.now()));
    } catch {}
  }, [loc.pathname, (loc as any).hash, loc.search]);
}

/**
 * Save only LIST pages for Back fallbacks (do NOT overwrite with detail).
 * Writes:
 *  - tgshop:lastUniversalPage     (when on / or /universal[?…])
 *  - tgshop:lastShopPage          (when on /s/:slug[?…] or /shop/:slug[?…])
 */
function useSaveListPagesOnly() {
  const loc = useLocation();
  useEffect(() => {
    const pathOnly = routedPath(loc);
    const full = pathOnly + (loc.search || "");

    // Ignore detail pages entirely for list memory
    if (
      /^\/universal\/p\/[^/]+$/.test(pathOnly) ||
      /^\/s\/[^/]+\/p\/[^/]+$/.test(pathOnly) ||
      /^\/shop\/[^/]+\/p\/[^/]+$/.test(pathOnly)
    ) {
      return;
    }

    try {
      // Universal list memory
      if (pathOnly === "/" || pathOnly === "/universal" || pathOnly.startsWith("/universal?")) {
        localStorage.setItem("tgshop:lastUniversalPage", full);
        localStorage.setItem("tgshop:lastUniversalPageAt", String(Date.now()));
      }

      // Buyer list memory
      if (/^\/s\/[^/]+(?:$|\?)/.test(full)) {
        localStorage.setItem("tgshop:lastShopPage", full);
        localStorage.setItem("tgshop:lastShopPageAt", String(Date.now()));
      }

      // Owner list memory (optional, mirrors buyer)
      if (/^\/shop\/[^/]+(?:$|\?)/.test(full)) {
        localStorage.setItem("tgshop:lastOwnerShopPage", full);
        localStorage.setItem("tgshop:lastOwnerShopPageAt", String(Date.now()));
      }
    } catch {}
  }, [loc.pathname, (loc as any).hash, loc.search]);
}

/**
 * Auto-join + resume behavior.
 * Reads join code from Telegram initData (start_param) OR from ?tgWebAppStartParam=join_xxx
 * - If join code exists: POST /invites/accept and navigate to /shop/:slug (and seed list memory).
 * - Else: resume to the most precise memory we have:
 *      1) tgshop:lastPathExact    (detail OR list) — preferred
 *      2) tgshop:lastShopPage / lastUniversalPage  (list only fallback)
 */
function useAutoJoinAndResume() {
  const nav = useNavigate();
  const hasRunRef = React.useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return; // run once per app load
    hasRunRef.current = true;

    const tg = (window as any).Telegram?.WebApp;
    const startParamFromInit = tg?.initDataUnsafe?.start_param as string | undefined;
    const usp = new URLSearchParams(window.location.search);
    const startParamFromQuery = usp.get("tgWebAppStartParam") || undefined;
    const startParam = (startParamFromInit || startParamFromQuery || "").trim();

    // Handle join codes
    const code = startParam.startsWith("join_") ? startParam.slice("join_".length).trim() : "";
    
    // Handle product deep links with context
    // Format: shop_SLUG_product_PRODUCTID or universal_product_PRODUCTID
    let productId = "";
    let productShopSlug: string | null = null;
    let productContext: "shop" | "universal" = "universal";
    
    if (startParam.startsWith("shop_") && startParam.includes("_product_")) {
      // shop_SLUG_product_PRODUCTID
      const parts = startParam.split("_product_");
      if (parts.length === 2) {
        productShopSlug = parts[0].slice("shop_".length).trim();
        productId = parts[1].trim();
        productContext = "shop";
      }
    } else if (startParam.startsWith("universal_product_")) {
      // universal_product_PRODUCTID
      productId = startParam.slice("universal_product_".length).trim();
      productContext = "universal";
    } else if (startParam.startsWith("product_")) {
      // Legacy format: product_PRODUCTID (default to universal)
      productId = startParam.slice("product_".length).trim();
      productContext = "universal";
    }

    const handledKey = code ? `tgshop:join-handled:${code}` : "tgshop:join-handled";
    const resumeOnceKey = "tgshop:resume-once";
    const RESUME_TTL_MS = 1000 * 60 * 60 * 12; // 12h

    function getIfFresh(key: string, atKey: string): string | null {
      try {
        const p = localStorage.getItem(key);
        const at = Number(localStorage.getItem(atKey) || "0");
        if (!p) return null;
        if (Date.now() - at > RESUME_TTL_MS) return null;
        return p;
      } catch {
        return null;
      }
    }

    function tryResumePolitely() {
      try {
        if (sessionStorage.getItem(resumeOnceKey)) return; // once per session

        // 1) Exact last path (detail or list)
        const exact = getIfFresh("tgshop:lastPathExact", "tgshop:lastPathExactAt");

        // 2) Fallbacks: list memories
        const lastShop = getIfFresh("tgshop:lastShopPage", "tgshop:lastShopPageAt");
        const lastUni = getIfFresh("tgshop:lastUniversalPage", "tgshop:lastUniversalPageAt");

        const current = routedPathFromWindow();
        if (current !== "/" && current !== "") {
          sessionStorage.setItem(resumeOnceKey, "1");
          return; // don't fight when already deep-linked
        }

        const target = exact || lastShop || lastUni;
        if (target) {
          sessionStorage.setItem(resumeOnceKey, "1");
          nav(target, { replace: true });
        }
      } catch {}
    }

    // Handle product deep link
    if (productId) {
      // Navigate to product detail with correct context
      if (productContext === "shop" && productShopSlug) {
        // Shop context - always go to buyer view (even for shop staff)
        nav(`/s/${productShopSlug}/p/${productId}`, { replace: true });
      } else {
        // Universal context
        nav(`/universal/p/${productId}`, { replace: true });
      }
      return;
    }

    if (!code) {
      tryResumePolitely();
      return;
    }

    if (sessionStorage.getItem(handledKey)) return;

    (async () => {
      try {
        const res = await api<any>("/invites/accept", {
          method: "POST",
          body: JSON.stringify({ code }),
        });
        const slug = res?.tenant?.slug ?? res?.slug ?? null;
        const role = (res as any)?.role ?? "MEMBER";

        if (slug) {
          sessionStorage.setItem(handledKey, "1"); // only after success

          // OWNER, COLLABORATOR, HELPER → owner view
          // MEMBER (new members) → buyer view
          const isStaffRole = ["OWNER", "COLLABORATOR", "HELPER"].includes(role);
          const target = isStaffRole ? `/shop/${slug}` : `/s/${slug}`;

          // Seed list memory correctly
          try {
            if (isStaffRole) {
              localStorage.setItem("tgshop:lastOwnerShopPage", target);
              localStorage.setItem("tgshop:lastOwnerShopPageAt", String(Date.now()));
            } else {
              localStorage.setItem("tgshop:lastShopPage", target);
              localStorage.setItem("tgshop:lastShopPageAt", String(Date.now()));
            }
          } catch {}

          if (routedPathFromWindow() !== target) {
            nav(target, { replace: true });
          }
        } else {
          tryResumePolitely();
        }

      } catch {
        tryResumePolitely();
      }
    })();
  }, [nav]);
}

/* ====================== App ====================== */

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); // Global profile drawer
  const profileJustClosedAt = React.useRef(0);           // 🔹 track last close time
  const [didRestore, setDidRestore] = useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const loc = useLocation();
  const nav = useNavigate();

    const handleCloseProfile = () => {
    profileJustClosedAt.current = Date.now();
    setProfileOpen(false);
  };


  // Memory: keep BOTH behaviors
  useRememberExactPath();     // resume-after-close (detail or list)
  useSaveListPagesOnly();     // back fallbacks (list only)

  // 🔑 Auto-join + resume (runs once)
  useAutoJoinAndResume();

  // Route helpers
  const isProductDetail =
    /^(?:\/shop|\/s)\/[^/]+\/p\/[^/]+$/.test(routedPath(loc)) ||
    /^\/universal\/p\/[^/]+$/.test(routedPath(loc));
  const isShopRoot = /^\/shop\/[^/]+$/.test(routedPath(loc));
  const isShopChild = /^\/shop\/[^/]+\/.+$/.test(routedPath(loc));

  // Shop header context (filled by Shop/ShopSettings via window event)
  const [shopCtx, setShopCtx] = useState<{
    slug: string | null;
    name: string | null;
    logoWebUrl: string | null;
  }>({ slug: null, name: null, logoWebUrl: null });

  // Init Telegram
  useEffect(() => {
    ready();
    ensureInitDataCached();
  }, []);

  // Force-close the shop profile drawer whenever the URL changes
  useEffect(() => {
    setProfileOpen(false);
  }, [loc.pathname]);

  // Listen for shop context updates (robust: won't erase logo if payload misses it)
  useEffect(() => {
    function onCtx(e: any) {
      const d = e.detail || {};
      const incomingLogo =
        d.logoWebUrl ??
        d.webUrl ??
        d.url ??
        d.logoUrl ??
        null;

      setShopCtx((prev) => ({
        slug: d.slug ?? prev.slug ?? null,
        name: d.name ?? prev.name ?? null,
        logoWebUrl:
          typeof incomingLogo === "string" && incomingLogo.length > 0
            ? incomingLogo
            : prev.logoWebUrl ?? null,
      }));
    }
    window.addEventListener("tgshop:set-shop-context", onCtx);
    return () => window.removeEventListener("tgshop:set-shop-context", onCtx);
  }, []);

  // Also listen for direct logo update events (only apply when a valid URL is provided)
  useEffect(() => {
    function onLogo(e: any) {
      const incomingLogo =
        e.detail?.logoWebUrl ??
        e.detail?.webUrl ??
        e.detail?.url ??
        e.detail?.logoUrl ??
        null;

      if (typeof incomingLogo === "string" && incomingLogo.length > 0) {
        setShopCtx((prev) => ({ ...prev, logoWebUrl: incomingLogo }));
      }
    }
    window.addEventListener("tgshop:update-logo", onLogo);
    return () => window.removeEventListener("tgshop:update-logo", onLogo);
  }, []);

  // Global: open the profile drawer when header avatar is clicked
    // Global: open the profile drawer when header avatar is clicked
  useEffect(() => {
      function onOpenShopMenu() {
        const now = Date.now();
        // 🔹 Ignore opens that happen immediately after a close (ghost tap)
        if (now - profileJustClosedAt.current < 400) {
          return;
        }
        setProfileOpen(true);
      }
      window.addEventListener("tgshop:open-shop-menu", onOpenShopMenu);
      return () => window.removeEventListener("tgshop:open-shop-menu", onOpenShopMenu);
    }, []);


  // (Kept) Restore last path once (but skip if a join was handled)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const handledJoin = sessionStorage.getItem("tgshop:join-handled") === "1";
        const saved = localStorage.getItem("tgshop:lastPath");
        const currentPath = window.location.pathname || "/";
        const hasStartParam = window.location.search.includes("tgWebAppStartParam=");
        if (
          !handledJoin &&
          saved &&
          saved !== "/" &&
          currentPath === "/" &&
          !hasStartParam &&
          saved.startsWith("/")
        ) {
          nav(saved, { replace: true });
        }
      } catch {
        // ignore
      } finally {
        setDidRestore(true);
      }
    }, 50);
    return () => clearTimeout(t);
  }, [nav]);

  // (Kept) Save current path under legacy key tgshop:lastPath (doesn't hurt;
  // our resume hook uses lastPathExact, so this remains for compatibility)
  useEffect(() => {
    if (!didRestore && routedPath(loc) === "/") return;
    try {
      localStorage.setItem("tgshop:lastPath", routedPath(loc));
    } catch {}
  }, [loc.pathname, (loc as any).hash, didRestore]);

  // Also persist last visited owner shop page for other logic (unchanged)
  useEffect(() => {
    if (routedPath(loc).startsWith("/shop/")) {
      try {
        localStorage.setItem("tgshop:lastShopPage", routedPath(loc));
        localStorage.setItem("tgshop:lastShopPageAt", String(Date.now()));
      } catch {}
    }
  }, [loc.pathname, (loc as any).hash]);

  // Compute human title for non-back states (kept for Home/fallbacks)
  const computedTitle = useMemo(() => {
    const p = routedPath(loc);
    if (isShopRoot || isShopChild) return shopCtx.name || "Shop";
    if (p === "/") return "Home";
    if (p.startsWith("/universal")) return "Universal Shop";
    if (p.startsWith("/shops")) return "Shops";
    if (p.startsWith("/orders")) return "My Orders";
    if (p.startsWith("/cart")) return "Cart";
    if (p.startsWith("/profile")) return "Profile";
    return "TG Shop";
  }, [loc.pathname, (loc as any).hash, isShopRoot, isShopChild, shopCtx.name]);

  const backTarget = useMemo(() => getBackTarget(routedPath(loc)), [loc.pathname, (loc as any).hash]);
  const headerTitle = backTarget ? "←" : computedTitle;

  const onTitleClick =
    backTarget != null
      ? () => {
          if (typeof backTarget === "number") {
            // If history is too shallow (e.g., direct link), fall back smartly
            const p = routedPath(loc);
            const isBuyer = /^\/s\//.test(p);
            const isOwner = /^\/shop\//.test(p);

            if (window.history.length > 1) {
              nav(backTarget as number);
            } else if (isBuyer) {
              const m = p.match(/^\/s\/([^/]+)/);
              nav(m ? `/s/${m[1]}` : "/joined", { replace: true });
            } else if (isOwner) {
              const m = p.match(/^\/shop\/([^/]+)/);
              nav(m ? `/shop/${m[1]}` : "/shops", { replace: true });
            } else {
              nav("/", { replace: true });
            }
          } else {
            nav(backTarget as string);
          }
        }
      : undefined;

  const onCartClick = () => {
    const p = routedPath(loc);
    const m = p.match(/^\/s\/([^/]+)/);
    if (m) nav(`/s/${m[1]}/cart`);
    else nav("/cart");
  };

  // Reusable avatar button (uses shop logo/name)
      // Reusable avatar button (uses shop logo/name)
  const avatarBtn = (
    <button
      aria-label="Shop profile"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("tgshop:open-shop-menu"))
      }
      style={{
        width: 34,
        height: 34,
        borderRadius: "999px",
        border: "1px solid rgba(0,0,0,.08)",
        backgroundColor: "#eee",
        backgroundImage: shopCtx.logoWebUrl ? `url(${shopCtx.logoWebUrl})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        // 🔑 CRITICAL: while profile drawer is open, ignore taps on avatar
        pointerEvents: profileOpen ? "none" : "auto",
      }}
      title="Shop profile"
    >
      {!shopCtx.logoWebUrl &&
        (shopCtx.name ? shopCtx.name.slice(0, 1).toUpperCase() : "D")}
    </button>
  );



  // Right side overrides
  const rightForShopRoot = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("tgshop:add-product"))}
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.2,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
          minWidth: 60,
        }}
      >
        Add<br />Product
      </button>
      {avatarBtn}
    </div>
  );

  const rightForShopChild = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {avatarBtn}
    </div>
  );

  // Profile button specifically for "My Shops" page
  const rightForShopsPage = (
    <button
      aria-label="Profile"
      onClick={() => nav("/profile")}
      style={{
        width: 34,
        height: 34,
        borderRadius: "999px",
        border: "1px solid rgba(0,0,0,.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        cursor: "pointer",
      }}
      title="Profile"
    >
      👤
    </button>
  );

  return (
    <div style={appStyle}>
      {/* keep your conditional wrapper */}
      {!isProductDetail && (
        <>
          <HeaderBar
            onOpenMenu={() => setDrawerOpen(true)} // kept for compatibility, header won’t show hamburger
            title={headerTitle}
            onTitleClick={onTitleClick}
            onCartClick={onCartClick}
            rightOverride={
              routedPath(loc) === "/shops"
                ? rightForShopsPage
                : (isShopRoot
                    ? rightForShopRoot
                    : (isShopChild ? rightForShopChild : undefined))
            }
          />

          <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />

          <ShopProfileDrawer
            open={profileOpen}
            onClose={handleCloseProfile}
            tenant={{
              name: shopCtx.name ?? null,
              slug: shopCtx.slug ?? (routedPath(loc).match(/^\/shop\/([^/]+)/)?.[1] ?? null),
              logoWebUrl: shopCtx.logoWebUrl ?? null,
              publishUniversal: false,
            }}
          />
        </>
      )}

      <main style={{ paddingTop: isProductDetail ? 0 : 8, paddingBottom: 70 }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Universal />} />
            <Route path="/universal" element={<Universal />} />
            <Route path="/universal/p/:id" element={<ProductDetail />} />

            <Route path="/shops" element={<ShopList />} />
            <Route path="/shop/:slug" element={<Shop />} />
            <Route path="/shop/:slug/p/:id" element={<OwnerProductDetail />} />

            {/* Shop profile routes */}
            <Route path="/shop/:slug/settings" element={<ShopSettings />} />
            <Route path="/shop/:slug/categories" element={<ShopCategories />} />
            <Route path="/shop/:slug/invitations" element={<ShopInvitations />} />
            <Route path="/shop/:slug/team/:userId" element={<ShopMemberDetail />} />
            <Route path="/shop/:slug/orders" element={<ShopOrders />} />
            <Route path="/shop/:slug/orders/:orderId" element={<ShopOrderDetail />} />
            <Route path="/shop/:slug/analytics" element={<ShopAnalytics />} />
            <Route path="/shop/:slug/analytics/top-products" element={<ShopTopProducts />} />
            <Route path="/shop/:slug/inventory-history" element={<InventoryHistory />} />
            <Route path="/shop/:slug/team-performance" element={<TeamPerformance />} />

            <Route path="/cart" element={<Cart />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/products" element={<Products />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/joined" element={<JoinedShops />} />
            <Route path="/orders" element={<Orders />} /> 

            <Route path="/s/:slug" element={<ShopBuyer />} />
            <Route path="/s/:slug/p/:id" element={<ProductDetail />} />
            <Route path="/s/:slug/orders" element={<BuyerOrders  />} />
            <Route path="/s/:slug/orders/:orderId" element={<BuyerOrderDetail />} />

            <Route path="/favorites" element={<Favorites />} />

            {/* legacy/global */}
            <Route path="/s/:slug/cart" element={<Cart />} /> {/* buyer-scoped */}
            <Route path="/s/:slug/checkout" element={<Checkout />} />
            
            {/* Platform Admin Routes */}
            <Route path="/admin" element={<PlatformAdmin />} />
            <Route path="/admin/shops" element={<AdminShops />} />
            <Route path="/admin/shops/:slug" element={<AdminShopDetail />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/users/:tgId" element={<AdminUserDetail />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/universal" element={<AdminUniversal />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            
          </Routes>
        </ErrorBoundary>
      </main>
      {/* bottom nav controls the same DrawerMenu */}
      {!isProductDetail && (
        <FooterNav onOpenMenu={() => setDrawerOpen(true)} />
      )}
    </div>
  );
}
