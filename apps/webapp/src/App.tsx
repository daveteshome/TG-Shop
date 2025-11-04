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

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    logoUrl: string | null;
  }>({ slug: null, name: null, logoUrl: null });

  // Init Telegram
  useEffect(() => {
    ready();
    ensureInitDataCached();
  }, []);

  // Listen for shop context updates
  useEffect(() => {
    function onCtx(e: any) {
      const d = e.detail || {};
      setShopCtx({
        slug: d.slug ?? null,
        name: d.name ?? null,
        logoUrl: d.logoUrl ?? null,
      });
    }
    window.addEventListener("tgshop:set-shop-context", onCtx);
    return () => window.removeEventListener("tgshop:set-shop-context", onCtx);
  }, []);

  // Also listen for direct logo update events (from settings save)
  useEffect(() => {
    function onLogo(e: any) {
      const url = e.detail?.url ?? null;
      setShopCtx((prev) => ({ ...prev, logoUrl: url }));
    }
    window.addEventListener("tgshop:update-logo", onLogo);
    return () => window.removeEventListener("tgshop:update-logo", onLogo);
  }, []);

  // Restore last path once
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const saved = localStorage.getItem("tgshop:lastPath");
        const currentPath = window.location.pathname || "/";
        const hasStartParam = window.location.search.includes("tgWebAppStartParam=");
        if (saved && saved !== "/" && currentPath === "/" && !hasStartParam && saved.startsWith("/")) {
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

  // Compute title: for any shop route use shop name
  const title = useMemo(() => {
    if (isShopRoot || isShopChild) return shopCtx.name || "Shop";
    if (loc.pathname === "/") return "Home";
    if (loc.pathname.startsWith("/universal")) return "Universal Shop";
    if (loc.pathname.startsWith("/shops")) return "Shops";
    if (loc.pathname.startsWith("/orders")) return "My Orders";
    if (loc.pathname.startsWith("/cart")) return "Cart";
    if (loc.pathname.startsWith("/profile")) return "Profile";
    return "TG Shop";
  }, [loc.pathname, isShopRoot, isShopChild, shopCtx.name]);

  // Clicking the title:
  // on shop pages -> back to that shop root; otherwise use legacy mapping
  const onTitleClick = () => {
    if (isShopRoot && shopCtx.slug) {
      nav(`/shop/${shopCtx.slug}`);
      return;
    }
    if (isShopChild && shopCtx.slug) {
      nav(`/shop/${shopCtx.slug}`);
      return;
    }
    // Non-shop pages
    if (title === "Home") return nav("/");
    if (title === "Universal Shop") return nav("/universal");
    if (title === "Shops") return nav("/shops");
    if (title === "My Orders") return nav("/orders");
    if (title === "Cart") return nav("/cart");
    if (title === "Profile") return nav("/profile");
  };

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
        background: "#eee",
        backgroundImage: shopCtx.logoUrl ? `url(${shopCtx.logoUrl})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
      }}
      title="Shop profile"
    >
      {!shopCtx.logoUrl && (shopCtx.name ? shopCtx.name.slice(0, 1).toUpperCase() : "D")}
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

  return (
    <div style={appStyle}>
      {/* hide global header + menu on product detail */}
      {!isProductDetail && (
        <>
          <HeaderBar
            onOpenMenu={() => setDrawerOpen(true)}
            title={title}
            onTitleClick={onTitleClick}
            onCartClick={onCartClick}
            rightOverride={isShopRoot ? rightForShopRoot : (isShopChild ? rightForShopChild : undefined)}
          />
          <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
