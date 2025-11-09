// apps/webapp/src/components/layout/FooterNav.tsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Props = { onOpenMenu: () => void };

export default function FooterNav({ onOpenMenu }: Props) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const nav = useNavigate();

  const inShop = pathname.startsWith("/shop/");
  const slug = inShop ? pathname.split("/")[2] : null;

  const isUniversal =
    pathname === "/" ||
    pathname.startsWith("/universal") ||
    (!inShop && pathname !== "/my");

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const handleHome = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = isUniversal ? "/" : (slug ? `/shop/${slug}` : "/");
    if (pathname !== target) {
      nav(target);
      // let the route change, then scroll
      setTimeout(scrollToTop, 0);
    } else {
      scrollToTop();
    }
  };

  return (
    <footer
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 0,
        width: "100%",
        maxWidth: 860,
        zIndex: 45,
        background: "#fff",
        borderTop: "1px solid #eee",
        boxShadow: "0 -4px 18px rgba(0,0,0,0.06)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <nav
        aria-label="Bottom Navigation"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          height: 60,
          alignItems: "center",
        }}
      >
        {/* 1) Menu */}
        <button onClick={onOpenMenu} style={navBtn}>
          <div style={navIcon}>≡</div>
          <div style={navLabel}>{t("nav_menu", "Menu")}</div>
        </button>

        {/* 2) My Shop (universal) or Universal (in shop) */}
        {isUniversal ? (
          <Link to="/shops?mine=1" style={navBtn}>
            <div style={navIcon}>🏪</div>
            <div style={navLabel}>{t("nav_myshops", "My Shop")}</div>
          </Link>
        ) : (
          <Link to="/universal" style={navBtn}>
            <div style={navIcon}>🌍</div>
            <div style={navLabel}>{t("nav_universal", "Universal")}</div>
          </Link>
        )}

        {/* 3) Joined (universal) or Orders (in shop) */}
        {isUniversal ? (
          <Link to="/joined" style={navBtn}>
            <div style={navIcon}>🛍️</div>
            <div style={navLabel}>{t("nav_joined", "Joined Shops")}</div>
          </Link>
        ) : (
          <Link to={slug ? `/shop/${slug}/orders` : "/orders"} style={navBtn}>
            <div style={navIcon}>📦</div>
            <div style={navLabel}>{t("nav_orders", "Orders")}</div>
          </Link>
        )}

        {/* 4) Home (context-aware + scroll-to-top) */}
        <a
          href={isUniversal ? "/" : (slug ? `/shop/${slug}` : "/")}
          onClick={handleHome}
          style={navBtn}
        >
          <div style={navIcon}>🏠</div>
          <div style={navLabel}>{t("nav_home", "Home")}</div>
        </a>
      </nav>
    </footer>
  );
}

const navBtn: React.CSSProperties = {
  height: "100%",
  padding: "6px 4px",
  display: "flex",
  gap: 2,
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  color: "#111",
  background: "#fff",
  border: "none",
};

const navIcon: React.CSSProperties = { lineHeight: 1, fontSize: 18 };
const navLabel: React.CSSProperties = { fontSize: 11, opacity: 0.8 };
