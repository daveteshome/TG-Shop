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
  const [isAdmin, setIsAdmin] = React.useState(false);

  // Check if user is admin
  React.useEffect(() => {
    async function checkAdmin() {
      try {
        // Import the api helper
        const { api } = await import('../lib/api/index');
        const data = await api<any>('/profile');
        console.log('Profile data:', data); // Debug log
        setIsAdmin(data.platformRole === 'ADMIN');
      } catch (e) {
        console.error('Failed to check admin status', e);
      }
    }
    checkAdmin();
  }, []);

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
        {/* Header with gradient */}
        <div style={{ 
          padding: "20px 16px", 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          fontWeight: 700, 
          fontSize: 20,
          letterSpacing: "0.5px",
        }}>
          Menu
        </div>

        <nav style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6, flex: 1, overflowY: "auto" }}>
          {/* Language Selector - Temporarily Hidden */}
          {/* <div style={{ marginBottom: 8 }}>
            <LanguageMenu />
          </div> */}

          {/* Main Navigation */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Navigation</div>
            <Item to="/universal"><span style={iconStyle}>🌍</span> {t("nav_universal", "Explore")}</Item>
            
            <button
              type="button"
              onClick={() => {
                goWithMemory("joined", "/joined");
                onClose();
              }}
              style={itemStyle}
            >
              <span style={iconStyle}>🤝</span> {t("nav_joined", "Joined Shops")}
            </button>

            <button
              type="button"
              onClick={() => {
                goWithMemory("shops", "/shops?mine=1");
                onClose();
              }}
              style={itemStyle}
            >
              <span style={iconStyle}>🏪</span> {t("nav_myshops", "My Shops")}
            </button>

            <button
              type="button"
              onClick={() => {
                goWithMemory("orders", "/orders");
                onClose();
              }}
              style={itemStyle}
            >
              <span style={iconStyle}>📦</span> {t("nav_orders", "Orders")}
            </button>
          </div>

          {/* Account Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Account</div>
            <button
              type="button"
              onClick={() => {
                goWithMemory("profile", "/profile");
                onClose();
              }}
              style={itemStyle}
            >
              <span style={iconStyle}>👤</span> {t("nav_profile", "Profile")}
            </button>

            <button
              type="button"
              onClick={() => {
                goWithMemory("settings", "/settings");
                onClose();
              }}
              style={itemStyle}
            >
              <span style={iconStyle}>⚙️</span> {t("nav_settings", "Settings")}
            </button>
          </div>

          {/* Admin Panel - Only visible to admins */}
          {isAdmin && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  nav("/admin");
                  onClose();
                }}
                style={{
                  ...itemStyle,
                  background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                  color: "#fff",
                  fontWeight: 600,
                  border: "none",
                  boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
                }}
              >
                <span style={iconStyle}>🛡️</span> Admin Panel
              </button>
            </div>
          )}
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

const sectionStyle: React.CSSProperties = {
  marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "#94a3b8",
  marginBottom: 8,
  paddingLeft: 4,
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 10,
  textDecoration: "none",
  color: "#111",
  border: "none",
  background: "#f8fafc",
  fontSize: 15,
  fontWeight: 500,
  marginBottom: 4,
  transition: "all 0.2s ease",
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
};

const iconStyle: React.CSSProperties = {
  fontSize: 18,
  width: 22,
  height: 22,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
