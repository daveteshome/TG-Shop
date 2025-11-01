// src/App.tsx
import React, { useState, useMemo, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

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
  const loc = useLocation();

  useEffect(() => {
    ready();
    ensureInitDataCached();
  }, []);

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
            {/* 👇 just render Shop */}
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
