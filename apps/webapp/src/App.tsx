// src/App.tsx
import React, { useState, useMemo, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";

import Home from "./routes/Home";
import Cart from "./routes/Cart";
import Profile from "./routes/Profile";
import Orders from "./routes/Orders";
import OrderDetail from "./routes/OrderDetail";
import ProductDetail from "./routes/ProductDetail";
import Categories from "./routes/Categories";
import Products from "./routes/Products";
import Universal from "./routes/Universal";
import Shop from "./routes/Shop";
import ShopList from "./routes/ShopList";
import ShopSettings from "./routes/ShopSettings";
import ShopCategories from "./routes/ShopCategories";
import ShopInvitations from "./routes/ShopInvitations";
import ShopOrders from "./routes/ShopOrders";
import ShopAnalytics from "./routes/ShopAnalytics";
import ShopTopProducts from "./routes/ShopTopProducts";

import ErrorBoundary from "./components/common/ErrorBoundary";
import HeaderBar from "./components/layout/HeaderBar";
import DrawerMenu from "./components/DrawerMenu";
import ShopProfileDrawer from "./components/shop/ShopProfileDrawer";

import { ensureInitDataCached, ready } from "./lib/telegram";

const appStyle: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: 10,
  fontFamily:
    "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif",
  background: "var(--tg-theme-bg-color, #fff)",
  color: "var(--tg-theme-text-color, #111)",
  minHeight: "100vh",
  boxSizing: "border-box",
};

// Decide where "back" should go from the current path
function getBackTarget(pathname: string): string | null {
  if (pathname === "/") return null;                  // Home: no back
  if (pathname === "/shops") return "/";              // Shops → Home

  const shopMatch = pathname.match(/^\/shop\/([^/]+)(?:\/.*)?$/);
  if (shopMatch) {
    const slug = shopMatch[1];
    const isRoot = pathname === `/shop/${slug}` || pathname === `/shop/${slug}/`;
    return isRoot ? "/shops" : `/shop/${slug}`;       // Shop root → Shops, subpage → Shop root
  }

  // Focus for this phase is My Shops & Shop routes; no back elsewhere
  return null;
}

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); // NEW: global profile drawer
  const [didRestore, setDidRestore] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  // Route helpers
  const isProductDetail = /^\/shop\/[^/]+\/p\/[^/]+$/.test(loc.pathname);
  const isShopRoot = /^\/shop\/[^/]+$/.test(loc.pathname);
  const isShopChild = /^\/shop\/[^/]+\/.+$/.test(loc.pathname);

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

      setShopCtx(prev => ({
        slug: d.slug ?? prev.slug ?? null,
        name: d.name ?? prev.name ?? null,
        // only update if we actually got a new non-empty logo string
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
        setShopCtx(prev => ({ ...prev, logoWebUrl: incomingLogo }));
      }
      // if no valid URL in the event, do nothing (don't wipe the current logo)
    }
    window.addEventListener("tgshop:update-logo", onLogo);
    return () => window.removeEventListener("tgshop:update-logo", onLogo);
  }, []);

  // Global: open the profile drawer when header avatar is clicked
  useEffect(() => {
    function onOpenShopMenu() {
      setProfileOpen(true);
    }
    window.addEventListener("tgshop:open-shop-menu", onOpenShopMenu);
    return () => window.removeEventListener("tgshop:open-shop-menu", onOpenShopMenu);
  }, []);

  // Restore last path once
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const saved = localStorage.getItem("tgshop:lastPath");
        const currentPath = window.location.pathname || "/";
        const hasStartParam = window.location.search.includes("tgWebAppStartParam=");
        if (
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

  // Save current path
  useEffect(() => {
    if (!didRestore && loc.pathname === "/") return;
    try {
      localStorage.setItem("tgshop:lastPath", loc.pathname);
    } catch {}
  }, [loc.pathname, didRestore]);

  // Compute human title for non-back states (kept for Home/fallbacks)
  const computedTitle = useMemo(() => {
    if (isShopRoot || isShopChild) return shopCtx.name || "Shop";
    if (loc.pathname === "/") return "Home";
    if (loc.pathname.startsWith("/universal")) return "Universal Shop";
    if (loc.pathname.startsWith("/shops")) return "Shops";
    if (loc.pathname.startsWith("/orders")) return "My Orders";
    if (loc.pathname.startsWith("/cart")) return "Cart";
    if (loc.pathname.startsWith("/profile")) return "Profile";
    return "TG Shop";
  }, [loc.pathname, isShopRoot, isShopChild, shopCtx.name]);

  // True Back behavior for center area
  const backTarget = useMemo(() => getBackTarget(loc.pathname), [loc.pathname]);
  const headerTitle = backTarget ? "←" : computedTitle;
  const onTitleClick = backTarget ? () => nav(backTarget) : undefined; // clickable only when back exists

  // Default Cart click when no override
  const onCartClick = () => nav("/cart");

  // Reusable avatar button (uses shop logo/name)
  const avatarBtn = (
    <button
      aria-label="Shop profile"
      onClick={() => window.dispatchEvent(new CustomEvent("tgshop:open-shop-menu"))}
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
      }}
      title="Shop profile"
    >
      {!shopCtx.logoWebUrl && (shopCtx.name ? shopCtx.name.slice(0, 1).toUpperCase() : "D")}
    </button>
  );

  // Right side overrides
  const rightForShopRoot = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("tgshop:add-product"))}
        style={{
          background: "#000",
          color: "#fff",
          border: "1px solid #000",
          borderRadius: 12,
          padding: "6px 10px",
          fontSize: 12,
          lineHeight: "14px",
          cursor: "pointer",
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
      {/* hide global header + menu on product detail */}
      {!isProductDetail && (
        <>
          <HeaderBar
            onOpenMenu={() => setDrawerOpen(true)}
            title={headerTitle}            // ← shows "←" when a back target exists
            onTitleClick={onTitleClick}     // ← acts as true Back (undefined on Home)
            onCartClick={onCartClick}
            rightOverride={
              loc.pathname === "/shops"
                ? rightForShopsPage
                : (isShopRoot
                    ? rightForShopRoot
                    : (isShopChild ? rightForShopChild : undefined))
            }
          />

          <DrawerMenu
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          />

          {/* NEW: Global Shop Profile Drawer (works on all /shop/* pages) */}
          <ShopProfileDrawer
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            tenant={{
              name: shopCtx.name ?? null,
              slug: shopCtx.slug ?? (loc.pathname.match(/^\/shop\/([^/]+)/)?.[1] ?? null),
              logoWebUrl: shopCtx.logoWebUrl ?? null,
              publishUniversal: false,
            }}
          />
        </>
      )}

      <main style={{ paddingTop: isProductDetail ? 0 : 8, paddingBottom: 70 }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/universal" element={<Universal />} />
            <Route path="/shops" element={<ShopList />} />
            <Route path="/shop/:slug" element={<Shop />} />
            <Route path="/shop/:slug/p/:id" element={<ProductDetail />} />

            {/* Shop profile routes */}
            <Route path="/shop/:slug/settings" element={<ShopSettings />} />
            <Route path="/shop/:slug/categories" element={<ShopCategories />} />
            <Route path="/shop/:slug/invitations" element={<ShopInvitations />} />
            <Route path="/shop/:slug/orders" element={<ShopOrders />} />
            <Route path="/shop/:slug/analytics" element={<ShopAnalytics />} />
            <Route path="/shop/:slug/analytics/top-products" element={<ShopTopProducts />} />

            <Route path="/cart" element={<Cart />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/products" element={<Products />} />
            <Route path="/profile" element={<Profile />} />
            {/* If you still use OrderDetail, add its route here */}
            {/* <Route path="/orders/:id" element={<OrderDetail />} /> */}
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
