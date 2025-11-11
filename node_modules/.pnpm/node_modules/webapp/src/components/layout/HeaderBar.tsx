// apps/webapp/src/components/layout/HeaderBar.tsx
import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Props = {
  onOpenMenu?: () => void;
  title?: string;
  onTitleClick?: () => void;
  onCartClick?: () => void;
  rightOverride?: React.ReactNode;
};

export default function HeaderBar({
  title,
  onTitleClick,
  onCartClick,
  rightOverride,
}: Props) {
  const { t } = useTranslation();
  const loc = useLocation();
  const nav = useNavigate();

  const path = loc.pathname;

  // --- Context detection ---
  const isUniversalHome = path === "/" || path === "/universal";
  const isOwnerShopHome = /^\/shop\/[^/]+$/.test(path);
  const isBuyerShopHome = /^\/s\/[^/]+$/.test(path);
  const isMyShopHome = path === "/shops" || path === "/my";

  const inOwnerShop = path.startsWith("/shop/");
  const inBuyerShop = path.startsWith("/s/");
  const inShop = inOwnerShop || inBuyerShop;

  const slug = inShop ? path.split("/")[2] : null;
  const isRootLike =
    isUniversalHome || isOwnerShopHome || isBuyerShopHome || isMyShopHome;

  const showBack = !isRootLike;

  // --- Render ---
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "#fff",
        borderBottom: "1px solid #eee",
      }}
    >
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
        }}
      >
        {/* ← Back only on non-root pages */}
        {showBack ? (
          <button
            aria-label="Back"
            onClick={() => nav(-1)}
            style={iconBtn}
          >
            ←
          </button>
        ) : (
          <button
            onClick={onTitleClick}
            style={{
              ...iconBtn,
              visibility: onTitleClick ? "visible" : "hidden",
            }}
            aria-label="Title action"
          >
            {title === "←" ? "←" : "·"}
          </button>
        )}

        {/* 🔍 Search bar */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              background: "#f5f7fb",
              border: "1px solid #eef2f7",
              borderRadius: 12,
            }}
          >
            <span style={{ opacity: 0.6 }}>🔎</span>
            <input
              placeholder={
                isUniversalHome
                  ? t("search_global_placeholder", "Search products or shops…")
                  : inShop
                  ? t("search_shop_placeholder", "Search in this shop…")
                  : t("search_placeholder", "Search…")
              }
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                fontSize: 14,
              }}
            />
          </div>
        </div>

        {/* ❤️ or 🛒 on right side */}
        {rightOverride ? (
          rightOverride
        ) : isUniversalHome ? (
          // Universal shop → show Favorites
          <Link to="/favorites" aria-label="Favorites" style={iconBtn}>
            ♥
          </Link>
        ) : inShop && slug ? (
          // Shop pages (owner or buyer) → show Cart
          <button aria-label="Cart" onClick={onCartClick} style={iconBtn}>
            🛒
          </button>
        ) : (
          <span style={{ ...iconBtn, visibility: "hidden" }} />
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
  border: "1px solid #eef2f7",
  background: "#fff",
};
