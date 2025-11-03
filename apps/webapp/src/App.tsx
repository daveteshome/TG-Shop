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

  // Helpers from path
  const isProductDetail = /^\/shop\/[^/]+\/p\/[^/]+$/.test(loc.pathname);
  const isShopPage = /^\/shop\/[^/]+$/.test(loc.pathname);
  const shopMatch = loc.pathname.match(/^\/shop\/([^/]+)/);
  const currentSlug = shopMatch?.[1];

  // 1) init telegram
  useEffect(() => {
    ready();
    ensureInitDataCached();
  }, []);

  // 2) try to RESTORE (run once)
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

  // 3) SAVE current path — but ONLY after restore attempt
  useEffect(() => {
    if (!didRestore && loc.pathname === "/") return;
    try {
      localStorage.setItem("tgshop:lastPath", loc.pathname);
    } catch {}
  }, [loc.pathname, didRestore]);

  const title = useMemo(() => {
    if (loc.pathname === "/") return "Home";
    if (loc.pathname.startsWith("/universal")) return "Universal Shop";
    if (loc.pathname.startsWith("/shops")) return "Shops";
    if (loc.pathname.startsWith("/orders")) return "My Orders";
    if (loc.pathname.startsWith("/cart")) return "Cart";
    if (loc.pathname.startsWith("/profile")) return "Profile";
    if (loc.pathname.startsWith("/shop/")) return "Shop";
    return "TG Shop";
  }, [loc.pathname]);

  // Make the center title clickable like before
  // Replace your current onTitleClick with this:
const onTitleClick = () => {
  if (title === "Home") return nav("/");
  if (title === "Shop") return nav("/shops");            // ← go to My Shops
  if (title === "Universal Shop") return nav("/universal");
  if (title === "Shops") return nav("/shops");
  if (title === "My Orders") return nav("/orders");
  if (title === "Cart") return nav("/");
  if (title === "Profile") return nav("/profile");
};


  // Default cart click (when rightOverride is not provided)
  const onCartClick = () => nav("/cart");

  // Right-side override for the Shop page header (replaces Cart)
  const rightForShop = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
        onClick={() => window.dispatchEvent(new CustomEvent("tgshop:add-product"))}
        style={{
          background: "#f6f6f6",
          color: "#0c0c0cff",
          border: "1px solid #000",
          borderRadius: 10,
          padding: "6px 10px",
          fontSize: 12,
          lineHeight: 1.1,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 40,
          width: 60,
          whiteSpace: "normal",
          textAlign: "center",
        }}
      >
        <span style={{ fontWeight: 600 }}>Add</span>
        <span style={{ fontSize: 11 }}>Product</span>
      </button>

      <button
        aria-label="Shop menu"
        onClick={() => window.dispatchEvent(new CustomEvent("tgshop:open-shop-menu"))}
        style={{
          width: 34,
          height: 34,
          borderRadius: "999px",
          border: "1px solid rgba(0,0,0,.08)",
          background: "#eee",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
        }}
        title="Shop"
      >
        {currentSlug ? currentSlug[0].toUpperCase() : "S"}
      </button>
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
            // Only on /shop/:slug, replace the Cart with Add+Avatar
            rightOverride={isShopPage ? rightForShop : undefined}
          />
          <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </>
      )}

      <main
        style={{
          paddingTop: isProductDetail ? 0 : 8,
          paddingBottom: 70,
        }}
      >
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/universal" element={<Universal />} />
            <Route path="/shops" element={<ShopList />} />
            <Route path="/shop/:slug" element={<Shop />} />
            {/* detail page */}
            <Route path="/shop/:slug/p/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/products" element={<Products />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
