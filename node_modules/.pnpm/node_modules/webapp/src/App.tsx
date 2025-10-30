import React, { useEffect, useState } from "react";
import Home from "./routes/Home";                // you can keep this as a fallback/legacy
import Cart from "./routes/Cart";
import Profile from "./routes/Profile";
import Orders from "./routes/Orders";
import OrderDetail from "./routes/OrderDetail";
import Categories from "./routes/Categories";
import Products from "./routes/Products";
import Universal from "./routes/Universal";

import ErrorBoundary from "./components/common/ErrorBoundary";
import { Routes, Route, useLocation, useNavigate, useParams } from "react-router-dom";
import { NavBar } from "./components/layout/NavBar";
import type { Tab } from "./components/layout/NavBar";
import HeaderBar from "./components/layout/HeaderBar";
import DrawerMenu from "./components/DrawerMenu";

import { ready } from "./lib/telegram";
import { refreshCartCount } from "./lib/store";

import ShopList from "./routes/shopList";
import Shop from "./routes/shop";

function tabForPath(pathname: string): Tab {
  if (pathname.startsWith("/universal")) return "universal";
  if (pathname.startsWith("/cart")) return "cart";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/profile")) return "profile";
  return "shop"; // default tab lands on Shop List
}

function pathForTab(t: Tab): string {
  if (t === "cart") return "/cart";
  if (t === "orders") return "/orders";
  if (t === "profile") return "/profile";
  if (t === "universal") return "/universal";
  return "/";  // shop list
}

export default function App() {
  useEffect(() => {
    ready();
    refreshCartCount();
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const tab = tabForPath(location.pathname);
  const setTab = (t: Tab) => navigate(pathForTab(t));

  return (
    <div style={app}>
      <ErrorBoundary>
        <HeaderBar onOpenMenu={() => setMenuOpen(true)} title="TG Shop" />
        <DrawerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

        <main style={{ paddingBottom: 72 }}>
          <Routes>
            {/* Shop list is the landing page */}
            <Route path="/" element={
              <ShopList
                onOpenUniversal={() => navigate("/universal")}
                onOpenShop={(slug) => navigate(`/shop/${slug}`)}
                onCreate={() => navigate("/profile")} // or open a “create shop” modal later
              />
            } />

            {/* A single tenant’s storefront by slug */}
            <Route path="/shop/:slug" element={<ShopRoute />} />

            {/* Legacy pages you kept */}
            <Route path="/categories" element={<Categories />} />
            <Route path="/c/:categoryId" element={<Products />} />

            <Route path="/universal" element={<Universal />} />

            <Route path="/orders" element={<Orders onOpen={(id) => navigate(`/orders/${id}`)} />} />
            <Route path="/orders/:id" element={<OrderDetailRoute />} />

            <Route path="/cart" element={<Cart />} />
            <Route path="/profile" element={<Profile />} />

            <Route path="*" element={<ShopList onOpenUniversal={() => navigate("/universal")} onOpenShop={(slug) => navigate(`/shop/${slug}`)} onCreate={() => navigate("/profile")} />} />
          </Routes>
        </main>

        <NavBar tab={tab} setTab={setTab} />
      </ErrorBoundary>
    </div>
  );
}

function OrderDetailRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <OrderDetail id={id!} onBack={() => navigate(-1)} />;
}

function ShopRoute() {
  const { slug } = useParams();
  return <Shop slug={slug!} />;
}

const app: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: 10,
  fontFamily:
    "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif",
  background: "var(--tg-theme-bg-color, #fff)",
  color: "var(--tg-theme-text-color, #111)",
};
