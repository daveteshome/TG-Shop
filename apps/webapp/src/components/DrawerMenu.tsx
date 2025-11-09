// apps/webapp/src/components/DrawerMenu.tsx
import React from "react";
import { Link } from "react-router-dom";
import { lockScroll, unlockScroll } from "../lib/dom/scrollLock"; // adjust path if needed
import LanguageMenu from "./LanguageMenu";
import { useTranslation } from "react-i18next";


type Props = { open: boolean; onClose: () => void };

export default function DrawerMenu({ open, onClose }: Props) {
  const { t } = useTranslation();
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
          <Item to="/">🏠 {t("nav_home")}</Item>
          <Item to="/universal">🌍 {t("nav_universal")}</Item>
          <Item to="/joined">🤝 {t("nav_joined")}</Item>
          <Item to="/shops?mine=1">🏪 {t("nav_myshops")}</Item>
          <Item to="/orders">📦 {t("nav_orders")}</Item>
          <Item to="/cart">🛒 {t("nav_cart")}</Item>
          <Item to="/profile">👤 {t("nav_profile")}</Item>
          <Item to="/settings">⚙️ {t("nav_settings")}</Item>
         
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
  display: "block",
  padding: "12px 12px",
  borderRadius: 10,
  textDecoration: "none",
  color: "#111",
  border: "1px solid #f1f5f9",
  background: "#fff",
};
