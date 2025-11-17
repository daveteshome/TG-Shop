import React from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

export default function ShopBottomBar() {
  const nav = useNavigate();
  const { slug } = useParams();
  const loc = useLocation();

  const isShopHome = slug && loc.pathname === `/shop/${slug}`;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 10,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(860px, 100% - 20px)",
        background: "#fff",
        border: "1px solid rgba(0,0,0,.05)",
        borderRadius: 14,
        display: "flex",
        justifyContent: "space-around",
        padding: "6px 10px",
        boxShadow: "0 8px 30px rgba(15,23,42,.06)",
        zIndex: 40,
      }}
    >
      <button
        onClick={() => slug && nav(`/shop/${slug}`)}
        style={
          isShopHome
            ? {
                border: "none",
                background: "transparent",
                fontWeight: 600,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }
            : {
                border: "none",
                background: "transparent",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }
        }
      >
        🏠
        <span style={{ fontSize: 11 }}>Shop</span>
      </button>

      <button
        onClick={() => {
          if (!slug) return;
          // Make sure owner context is remembered, then open combined Orders page
          try {
            localStorage.setItem("tgshop:lastOwnerShopPage", `/shop/${slug}`);
            localStorage.setItem(
              "tgshop:lastOwnerShopPageAt",
              String(Date.now())
            );
          } catch {}
          nav("/orders");
        }}
        style={{
          border: "none",
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        📦
        <span style={{ fontSize: 11 }}>Orders</span>
      </button>
    </nav>
  );
}
