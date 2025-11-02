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
  const [didRestore, setDidRestore] = useState(false); // 👈 new flag
  const loc = useLocation();
  const nav = useNavigate();

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
        // 👈 VERY IMPORTANT: mark that we already tried to restore
        setDidRestore(true);
      }
    }, 50);

    return () => clearTimeout(t);
  }, [nav]);

  // 3) SAVE current path — but ONLY after restore attempt
  useEffect(() => {
    // if we haven't tried to restore yet AND we're still on "/" -> don't save yet
    if (!didRestore && loc.pathname === "/") return;

    try {
      localStorage.setItem("tgshop:lastPath", loc.pathname);
    } catch {
      // ignore
    }
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

  return (
    <div style={appStyle}>
      <HeaderBar onOpenMenu={() => setDrawerOpen(true)} title={title} />
      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main style={{ paddingTop: 8, paddingBottom: 70 }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/universal" element={<Universal />} />
            <Route path="/shops" element={<ShopList />} />
            <Route path="/shop/:slug" element={<Shop />} />
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
