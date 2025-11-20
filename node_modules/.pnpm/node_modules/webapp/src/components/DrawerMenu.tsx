// apps/webapp/src/components/DrawerMenu.tsx
import React from "react";
import { Link } from "react-router-dom";
import { lockScroll, unlockScroll } from "../lib/dom/scrollLock"; // adjust path if needed
import LanguageMenu from "./LanguageMenu";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";


type Props = { open: boolean; onClose: () => void };

export default function DrawerMenu({ open, onClose }: Props) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();

    function getCurrentPath() {
    const hash = loc.hash || "";
    const hashPath = hash.startsWith("#/") ? hash.slice(1) : null;
    const base = hashPath ?? loc.pathname;
    return base.replace(/^\/tma(?=\/|$)/, "") || "/";
  }

  function goWithMemory(memoryKey: string, path: string) {
    const from = getCurrentPath();
    localStorage.setItem(`tgshop:lastFrom:${memoryKey}`, from);
    nav(path);
  }


  // 1️⃣ existing effect for ESC
  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  // 2️⃣ NEW: prevent background scroll when menu is open
  React.useEffect(() => {
    if (open) lockScroll();
    return () => unlockScroll();
  }, [open]);

  const Item = (p: React.PropsWithChildren<{ to: string }>) => (
    <Link to={p.to} onClick={onClose} style={itemStyle}>
      {p.children}
    </Link>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.28)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity .2s ease", zIndex: 49,
        }}
      />
      <aside
        role="dialog"
        aria-modal
        style={{
          position: "fixed", top: 0, left: 0, width: "58vw", maxWidth: 280, height: "100dvh",
          background: "#fff", boxShadow: "2px 0 20px rgba(0,0,0,0.12)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .22s ease", zIndex: 50, display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid #eee", fontWeight: 700, fontSize: 18 }}>Menu</div>

        <nav style={{ padding: 8, display: "grid", gap: 4 }}>
          <li style={{ marginTop: 8 }}>
            <LanguageMenu />
          </li>

          {/* Normal links (no memory) */}
          <Item to="/">🏠 {t("nav_home")}</Item>
          <Item to="/universal">🌍 {t("nav_universal")}</Item>

          {/* With memory */}
          <button
            type="button"
            onClick={() => {
              goWithMemory("joined", "/joined");
              onClose();
            }}
            style={itemStyle}
          >
            🤝 {t("nav_joined")}
          </button>

          <button
            type="button"
            onClick={() => {
              goWithMemory("shops", "/shops?mine=1");
              onClose();
            }}
            style={itemStyle}
          >
            🏪 {t("nav_myshops")}
          </button>

          <button
            type="button"
            onClick={() => {
              goWithMemory("orders", "/orders");
              onClose();
            }}
            style={itemStyle}
          >
            📦 {t("nav_orders")}
          </button>

          {/* Cart stays global (no memory for now) */}
          <Item to="/cart">🛒 {t("nav_cart")}</Item>

          <button
            type="button"
            onClick={() => {
              goWithMemory("profile", "/profile");
              onClose();
            }}
            style={itemStyle}
          >
            👤 {t("nav_profile")}
          </button>

          <button
            type="button"
            onClick={() => {
              goWithMemory("settings", "/settings");
              onClose();
            }}
            style={itemStyle}
          >
            ⚙️ {t("nav_settings")}
          </button>
        </nav>

        <div style={{ marginTop: "auto", padding: 12 }}>
          <button
            onClick={() => { /* TODO: logout */ onClose(); }}
            style={{ width: "48vw", padding: "10px 12px", borderRadius: 10, border: "1px solid #eee", background: "#f8fafc", fontWeight: 600 }}
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",   // 👈 this is key
  gap: 10,
  padding: "12px 12px",
  borderRadius: 10,
  textDecoration: "none",
  color: "#111",
  border: "1px solid #f1f5f9",
  background: "#fff",
};
