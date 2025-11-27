// apps/webapp/src/routes/Settings.tsx
import React, { useState, useEffect } from "react";
import { TopBar } from "../components/layout/TopBar";
import { useTranslation } from "react-i18next";
import { clearRecentlyViewed, clearSearchHistory } from "../lib/browsingHistory";
import { api } from "../lib/api/index";

type DeletedShop = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  logoWebUrl?: string | null;
  deletedAt: string;
  daysRemaining: number;
};

export default function Settings() {
  const { t } = useTranslation();
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [deletedShops, setDeletedShops] = useState<DeletedShop[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  function handleClearHistory() {
    if (window.confirm(t('confirm_clear_browsing_history'))) {
      clearRecentlyViewed();
      showSuccessMessage(t('history_cleared'));
    }
  }

  function handleClearSearchHistory() {
    if (window.confirm(t('confirm_clear_search_history'))) {
      clearSearchHistory();
      showSuccessMessage(t('search_history_cleared'));
    }
  }

  function showSuccessMessage(msg: string) {
    setShowSuccess(msg);
    setTimeout(() => setShowSuccess(null), 3000);
  }

  // Load deleted shops
  useEffect(() => {
    (async () => {
      try {
        const response = await api<{ deletedShops: DeletedShop[] }>("/shops/deleted");
        setDeletedShops(response.deletedShops || []);
      } catch (e) {
        console.error("Failed to load deleted shops:", e);
      } finally {
        setLoadingDeleted(false);
      }
    })();
  }, []);

  async function handleRestoreShop(shop: DeletedShop) {
    if (!window.confirm(`Restore "${shop.name}"? It will appear in your shops list again.`)) {
      return;
    }

    setRestoring(shop.id);
    try {
      await api(`/shop/${shop.slug}/restore`, { method: "POST" });
      showSuccessMessage(`"${shop.name}" has been restored!`);
      // Remove from deleted list
      setDeletedShops((prev) => prev.filter((s) => s.id !== shop.id));
    } catch (e: any) {
      alert(e?.message || "Failed to restore shop");
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <TopBar title={t("nav_settings", "Settings")} />

      <div style={{ padding: 16 }}>
        {/* Success Message */}
        {showSuccess && (
          <div style={{
            padding: "12px 16px",
            background: "#D1FAE5",
            color: "#065F46",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 14,
            fontWeight: 500,
          }}>
            ✓ {showSuccess}
          </div>
        )}

        {/* Language Section - Temporarily Hidden */}
        {/* <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🌐 {t('language')}</div>
          <div style={cardStyle}>
            <LanguageMenu />
          </div>
        </div> */}

        {/* Deleted Shops Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🗑️ Deleted Shops</div>
          
          {loadingDeleted ? (
            <div style={infoCardStyle}>Loading...</div>
          ) : deletedShops.length === 0 ? (
            <div style={infoCardStyle}>
              <div style={{ fontSize: 14, color: "#666" }}>
                No deleted shops. Deleted shops can be restored within 30 days.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deletedShops.map((shop) => (
                <div key={shop.id} style={deletedShopCardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    <ShopAvatar name={shop.name} url={shop.logoWebUrl || null} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>
                        {shop.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                        Deleted {formatDeletedDate(shop.deletedAt)}
                      </div>
                      <div style={getDaysRemainingStyle(shop.daysRemaining)}>
                        {shop.daysRemaining === 0
                          ? "⚠️ Expires today"
                          : shop.daysRemaining === 1
                          ? "⚠️ 1 day remaining"
                          : `${shop.daysRemaining} days remaining`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreShop(shop)}
                    disabled={restoring === shop.id}
                    style={restoreButtonStyle}
                  >
                    {restoring === shop.id ? "..." : "Restore"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Privacy Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🔒 {t('settings_privacy_data')}</div>
          
          <button onClick={handleClearHistory} style={actionButtonStyle}>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('clear_history')}</div>
              <div style={{ fontSize: 13, color: "#666" }}>
                {t('clear_history_desc')}
              </div>
            </div>
            <span style={{ fontSize: 20, opacity: 0.5 }}>🗑️</span>
          </button>

          <button onClick={handleClearSearchHistory} style={actionButtonStyle}>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('clear_search_history')}</div>
              <div style={{ fontSize: 13, color: "#666" }}>
                {t('clear_search_history_desc')}
              </div>
            </div>
            <span style={{ fontSize: 20, opacity: 0.5 }}>🗑️</span>
          </button>
        </div>

        {/* About Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>ℹ️ {t('about')}</div>
          
          <div style={infoCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "#666" }}>{t('app_version')}</span>
              <span style={{ fontWeight: 600 }}>1.0.0</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "#666" }}>{t('platform')}</span>
              <span style={{ fontWeight: 600 }}>{t('telegram_mini_app')}</span>
            </div>
          </div>

          <a
            href="https://telegram.org/tos"
            target="_blank"
            rel="noopener noreferrer"
            style={linkButtonStyle}
          >
            <span>📄 {t('link_terms')}</span>
            <span style={{ fontSize: 18 }}>→</span>
          </a>

          <a
            href="https://telegram.org/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={linkButtonStyle}
          >
            <span>🔐 {t('link_privacy')}</span>
            <span style={{ fontSize: 18 }}>→</span>
          </a>
        </div>

        {/* Help Section */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>❓ {t('help_support')}</div>
          
          <div style={infoCardStyle}>
            <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
              {t('help_support_desc')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Styles */
const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#111",
  marginBottom: 12,
  paddingLeft: 4,
};

const actionButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 16,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  marginBottom: 8,
  cursor: "pointer",
  textAlign: "left",
};

const infoCardStyle: React.CSSProperties = {
  background: "#f9fafb",
  borderRadius: 12,
  padding: 16,
  border: "1px solid #e5e7eb",
  marginBottom: 8,
};

const linkButtonStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 16,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  marginBottom: 8,
  textDecoration: "none",
  color: "#111",
  fontWeight: 500,
};

const deletedShopCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: 12,
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
};

const restoreButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

function getDaysRemainingStyle(days: number): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 6,
    display: "inline-block",
  };

  if (days <= 1) {
    return {
      ...baseStyle,
      background: "#FEE2E2",
      color: "#991B1B",
    };
  } else if (days <= 7) {
    return {
      ...baseStyle,
      background: "#FEF3C7",
      color: "#92400E",
    };
  } else {
    return {
      ...baseStyle,
      background: "#E0E7FF",
      color: "#3730A3",
    };
  }
}

function formatDeletedDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function ShopAvatar({ name, url }: { name: string; url: string | null }) {
  const size = 40;
  const [errored, setErrored] = React.useState(false);

  const initials =
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        backgroundColor: "#eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {url && !errored ? (
        <img
          src={url}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={() => setErrored(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
