// apps/webapp/src/App.tsx
import React, { useState, useMemo, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { api } from "./lib/api/index";

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
import JoinedShops from "./routes/JoinedShops";
import ShopBuyer from "./routes/ShopBuyer";

import ErrorBoundary from "./components/common/ErrorBoundary";
import HeaderBar from "./components/layout/HeaderBar";
import DrawerMenu from "./components/DrawerMenu";
import ShopProfileDrawer from "./components/shop/ShopProfileDrawer";
import FooterNav from "./components/layout/FooterNav";
import Favorites from "./routes/Favorites";



import { ensureInitDataCached, ready } from "./lib/telegram";

/* ====================== Styles ====================== */

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

/* ====================== Helpers ====================== */

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
    // any other owner child (e.g., /settings, /categories, /orders) → step back
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


function useSaveLastPage() {
  const loc = useLocation();
  useEffect(() => {
    const path = loc.pathname || "/";
    // OPTIONAL: if you want to ignore some paths, do it here:
    // if (path.startsWith("/auth")) return;
    localStorage.setItem("tgshop:lastShopPage", path);
    localStorage.setItem("tgshop:lastShopPageAt", String(Date.now()));
  }, [loc.pathname]);
}

/**
 * Auto-join + resume behavior.
 * - Reads join code from Telegram initData (start_param) OR from ?tgWebAppStartParam=join_xxx
 * - Calls /invites/accept (idempotent) – expects { joined: boolean, tenant?: { slug?: string } }
 * - On success navigates to /shop/:slug and stores it in tgshop:lastShopPage
 * - If no join code or failure → resume last page (tgshop:lastShopPage) if present
 */
function useAutoJoinAndResume() {
  const nav = useNavigate();
  const hasRunRef = React.useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;         // ✅ run once per app load
    hasRunRef.current = true;

    const tg = (window as any).Telegram?.WebApp;
    const startParamFromInit = tg?.initDataUnsafe?.start_param as string | undefined;
    const usp = new URLSearchParams(window.location.search);
    const startParamFromQuery = usp.get("tgWebAppStartParam") || undefined;
    const startParam = (startParamFromInit || startParamFromQuery || "").trim();

    const code = startParam.startsWith("join_") ? startParam.slice("join_".length).trim() : "";

    const handledKey   = code ? `tgshop:join-handled:${code}` : "tgshop:join-handled";
    const lastPageKey  = "tgshop:lastShopPage";
    const lastPageAtKey= "tgshop:lastShopPageAt";
    const resumeOnceKey= "tgshop:resume-once";
    const RESUME_TTL_MS= 1000 * 60 * 60 * 12; // 12h

    function tryResumePolitely() {
      try {
        if (sessionStorage.getItem(resumeOnceKey)) return; // once per session
        const saved   = localStorage.getItem(lastPageKey);
        const savedAt = Number(localStorage.getItem(lastPageAtKey) || "0");
        if (!saved) return;
        if ((Date.now() - savedAt) > RESUME_TTL_MS) return;
        if (window.location.pathname !== "/" && window.location.pathname !== "") return; // only from root
        sessionStorage.setItem(resumeOnceKey, "1");
        nav(saved, { replace: true });
      } catch {}
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

        if (slug) {
          sessionStorage.setItem(handledKey, "1"); // only after success
          const target = `/shop/${slug}`;
          // Set a starting last page (will be overwritten by useSaveLastPage as user navigates)
          localStorage.setItem(lastPageKey, target);
          localStorage.setItem(lastPageAtKey, String(Date.now()));
          if (window.location.pathname !== target) {
            nav(target, { replace: true });
          }
        } else {
          tryResumePolitely();
        }
      } catch {
        tryResumePolitely();
      }
    })();
  }, []); // ✅ empty deps
}


/* ====================== App ====================== */

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); // Global profile drawer
  const [didRestore, setDidRestore] = useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const loc = useLocation();
  const nav = useNavigate();

    // True Back behavior for center area


  // 🔑 Auto-join + resume (runs once)
  useAutoJoinAndResume();
  useSaveLastPage();

  // Route helpers
  const isProductDetail =
  /^(?:\/shop|\/s)\/[^/]+\/p\/[^/]+$/.test(loc.pathname) ||
  /^\/universal\/p\/[^/]+$/.test(loc.pathname);const isShopRoot = /^\/shop\/[^/]+$/.test(loc.pathname);
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
  useEffect(() => {
    function onOpenShopMenu() {
      setProfileOpen(true);
    }
    window.addEventListener("tgshop:open-shop-menu", onOpenShopMenu);
    return () => window.removeEventListener("tgshop:open-shop-menu", onOpenShopMenu);
  }, []);

  // Restore last path once (but skip if a join was handled)
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

  // Save current path
  useEffect(() => {
    if (!didRestore && loc.pathname === "/") return;
    try {
      localStorage.setItem("tgshop:lastPath", loc.pathname);
    } catch {}
  }, [loc.pathname, didRestore]);

  // Also persist last visited shop page for resume logic
  useEffect(() => {
    if (loc.pathname.startsWith("/shop/")) {
      try {
        localStorage.setItem("tgshop:lastShopPage", loc.pathname);
      } catch {}
    }
  }, [loc.pathname]);

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

  const backTarget = useMemo(() => getBackTarget(loc.pathname), [loc.pathname]);
  const headerTitle = backTarget ? "←" : computedTitle;

const onTitleClick =
  backTarget != null
    ? () => {
        if (typeof backTarget === "number") {
          // If history is too shallow (e.g., direct link), fall back smartly
          const isBuyer = /^\/s\//.test(loc.pathname);
          const isOwner = /^\/shop\//.test(loc.pathname);

          if (window.history.length > 1) {
            nav(backTarget as number);
          } else if (isBuyer) {
            // fallback when landing directly on buyer detail
            const m = loc.pathname.match(/^\/s\/([^/]+)/);
            nav(m ? `/s/${m[1]}` : "/joined", { replace: true });
          } else if (isOwner) {
            const m = loc.pathname.match(/^\/shop\/([^/]+)/);
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
    const m = loc.pathname.match(/^\/s\/([^/]+)/);
    if (m) nav(`/s/${m[1]}/cart`);
    else nav("/cart");
  };


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
      {/* keep your conditional wrapper */}
      {!isProductDetail && (
        <>
          <HeaderBar
            onOpenMenu={() => setDrawerOpen(true)} // kept for compatibility, header won’t show hamburger
            title={headerTitle}
            onTitleClick={onTitleClick}
            onCartClick={onCartClick}
            rightOverride={
              loc.pathname === "/shops"
                ? rightForShopsPage
                : (isShopRoot
                    ? rightForShopRoot
                    : (isShopChild ? rightForShopChild : undefined))
            }
          />

          <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />

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
            <Route path="/" element={<Universal  />} />
            <Route path="/universal" element={<Universal />} />
            <Route path="/universal/p/:id" element={<ProductDetail />} />

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
            <Route path="/joined" element={<JoinedShops />} />

            <Route path="/s/:slug" element={<ShopBuyer />} />
            <Route path="/s/:slug/p/:id" element={<ProductDetail />} />
            <Route path="/s/:slug/orders" element={<ShopOrders />} />

            <Route path="/favorites" element={<Favorites />} />

            // existing routes…
                       {/* legacy/global */}
            <Route path="/s/:slug/cart" element={<Cart />} />     {/* buyer-scoped */}

            {/* If you still use OrderDetail: */}
            {/* <Route path="/orders/:id" element={<OrderDetail />} /> */}
          </Routes>
        </ErrorBoundary>
      </main>
      {/* ✅ New: bottom nav controls the same DrawerMenu */}
      {!isProductDetail && (
        <FooterNav onOpenMenu={() => setDrawerOpen(true)} />
      )}
    </div>
  );
}
