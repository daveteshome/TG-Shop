import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { getInitDataRaw, getTelegramUser } from "../lib/telegram";
import { createTenantFull } from "../lib/api/index";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/layout/TopBar";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  publicPhone?: string | null;
  logoImageId?: string | null;
  logoWebUrl?: string | null;
  description?: string | null;
  userRole?: string; // User's role in this shop
};

export default function ShopList() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState<Tenant[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState<string>("+251 ");
  const [newTelegram, setNewTelegram] = useState<string>("");
  const [newShopType, setNewShopType] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");
  const [newPublish, setNewPublish] = useState<boolean>(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const loc = useLocation();

  // Auto-fill from user profile and Telegram when opening create form
  useEffect(() => {
    if (showCreate) {
      (async () => {
        try {
          // Load from profile
          const profile = await api<{ phone?: string | null; username?: string | null }>("/profile");
          if (profile?.phone && !newPhone.replace("+251 ", "").trim()) {
            setNewPhone(profile.phone);
          }
          
          // Load Telegram username
          const tgUser = getTelegramUser();
          if (tgUser?.username && !newTelegram.trim()) {
            setNewTelegram(`@${tgUser.username}`);
          } else if (profile?.username && !newTelegram.trim()) {
            setNewTelegram(`@${profile.username}`);
          }
        } catch (e) {
          console.error("Failed to load profile:", e);
        }
      })();
    }
  }, [showCreate]);


  const logoPreviewUrl = useMemo(() => {
    if (!logoFile) return null;
    return URL.createObjectURL(logoFile);
  }, [logoFile]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await api<{
          universal: any;
          myShops: Tenant[];
          joinedShops: Tenant[];
        }>("/shops/list");
        setOwned(r.myShops || []);
        if (!r.myShops || r.myShops.length === 0) {
          setShowCreate(true);
        }
      } catch (e: any) {
        setErr(e?.message || "Failed to load shops");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function uploadLogoPreCreate(file: File): Promise<string | null> {
    const initData = getInitDataRaw();
    if (!initData) throw new Error("no_tma_auth");

    const form = new FormData();
    form.append("file", file);

    const r = await fetch("/api/uploads/image", {
      method: "POST",
      body: form,
      headers: { Authorization: `tma ${initData}` },
    });

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.error || "upload_failed");
    }
    const j = await r.json();
    return j?.imageId || null;
  }

  async function handleCreateShop() {
    setErr(null);
    if (!newName.trim()) {
      setErr("Please enter a shop name.");
      return;
    }

    if (!newPhone.trim() || newPhone.trim() === "+251") {
      setErr("Phone number is required.");
      return;
    }

    // Validate Ethiopian phone number format
    const phoneRegex = /^\+251\s?[79]\d{8}$/;
    if (!phoneRegex.test(newPhone.trim())) {
      setErr("Please enter a valid Ethiopian phone number (e.g., +251 912 345 678)");
      return;
    }

    setCreating(true);
    try {
      let logoImageId: string | null = null;
      if (logoFile) {
        logoImageId = await uploadLogoPreCreate(logoFile);
      }

      const payload = {
        name: newName.trim(),
        publicPhone: newPhone.trim() || null,
        publicTelegramLink: newTelegram.trim() || null,
        shopType: newShopType.trim() || null,
        description: newDesc.trim() || null,
        publishUniversal: newPublish,
        logoImageId: logoImageId || null,
      };

      const { tenant } = await createTenantFull(payload);

      if (tenant?.slug) {
        navigate(`/shop/${tenant.slug}`);
      } else {
        setErr("Created but no slug returned.");
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to create shop");
    } finally {
      setCreating(false);
    }
  }

  const hasShops = owned.length > 0;

  const params = new URLSearchParams(loc.search || "");
  const q = (params.get("q") || "").trim().toLowerCase();

  const filteredOwned = !q
    ? owned
    : owned.filter((s) => {
        const name = (s.name || "").toLowerCase();
        const slug = (s.slug || "").toLowerCase();
        return name.includes(q) || slug.includes(q);
      });

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--tg-theme-secondary-bg-color,#f5f5f7)",
        }}
      >
        <TopBar title={t("title_my_shops")} />
        <div style={{ padding: "12px 16px" }}>Loading…</div>
      </div>
    );
  }

  if (err && !showCreate && !hasShops) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--tg-theme-secondary-bg-color,#f5f5f7)",
        }}
      >
        <TopBar title={t("title_my_shops")} />
        <div style={{ padding: "12px 16px", color: "crimson" }}>
          Error: {err}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--tg-theme-secondary-bg-color,#f5f5f7)",
      }}
    >
      <TopBar
        title={t("title_my_shops")}
        right={
          <button
            onClick={() => {
              setShowCreate((v) => !v);
              if (!showCreate) {
                setNewName("");
                setNewPhone("+251 ");
                setNewTelegram("");
                setNewShopType("");
                setNewDesc("");
                setNewPublish(true);
                setLogoFile(null);
              }
            }}
            style={topRightBtn}
          >
            + New
          </button>
        }
      />

      <div
        style={{
          padding: "12px 16px 24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {hasShops ? (
          filteredOwned.length === 0 ? (
            <div style={mutedCard}>No shops match your search.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredOwned.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/shop/${s.slug}`)}
                  style={cardButton}
                >
                  <ShopAvatar
                    name={s.name || s.slug || "Shop"}
                    url={s.logoWebUrl || null}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        color: "#111827",
                      }}
                    >
                      {s.name || "Unnamed shop"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6B7280",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        marginTop: 2,
                      }}
                    >
                      {s.description?.trim() || `@${s.slug}`}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      marginLeft: 8,
                    }}
                  >
                    <span style={getRolePillStyle(s.userRole)}>
                      {getRoleLabel(s.userRole)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : (
          <div style={mutedCard}>You don’t own any shops yet.</div>
        )}

        {showCreate && (
          <div
            style={{
              marginTop: 4,
              border: "1px dashed rgba(0,0,0,.12)",
              borderRadius: 16,
              padding: 14,
              display: "grid",
              gap: 10,
              background: "var(--tg-theme-bg-color,#fff)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Create Your Shop</div>
            
            {err && <div style={{ color: "crimson", fontSize: 13, padding: 10, background: "#fee", borderRadius: 8 }}>{err}</div>}

            {/* Account Info Banner */}
            {(() => {
              const tgUser = getTelegramUser();
              if (tgUser) {
                return (
                  <div style={{ 
                    fontSize: 12, 
                    padding: 12, 
                    background: "#f0f9ff", 
                    borderRadius: 10,
                    border: "1px solid #bae6fd",
                    color: "#0369a1",
                    marginBottom: 8,
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>✓ Logged in as</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: "50%", 
                        background: "#0284c7",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 14,
                      }}>
                        {(tgUser.firstName || tgUser.username || "U")[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{tgUser.firstName} {tgUser.lastName || ""}</div>
                        {tgUser.username && <div style={{ fontSize: 11, opacity: 0.8 }}>@{tgUser.username}</div>}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Basic Info Section */}
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 8, color: "#374151" }}>
              📋 Basic Information
            </div>

            <label style={label}>Shop Name *</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Dawit's Electronics"
              style={input}
            />

            <label style={label}>Shop Type</label>
            <select
              value={newShopType}
              onChange={(e) => setNewShopType(e.target.value)}
              style={input}
            >
              <option value="">Select shop type...</option>
              <option value="Electronics & Gadgets">📱 Electronics & Gadgets</option>
              <option value="Clothing & Fashion">👕 Clothing & Fashion</option>
              <option value="Food & Beverage">🍕 Food & Beverage</option>
              <option value="Home & Furniture">🛋️ Home & Furniture</option>
              <option value="Beauty & Personal Care">💄 Beauty & Personal Care</option>
              <option value="Books & Stationery">📚 Books & Stationery</option>
              <option value="Sports & Fitness">⚽ Sports & Fitness</option>
              <option value="Automotive">🚗 Automotive</option>
              <option value="Services">🔧 Services</option>
              <option value="Grocery & Supermarket">🛒 Grocery & Supermarket</option>
              <option value="Pharmacy & Health">💊 Pharmacy & Health</option>
              <option value="Toys & Kids">🧸 Toys & Kids</option>
              <option value="Jewelry & Accessories">💍 Jewelry & Accessories</option>
              <option value="Pet Supplies">🐾 Pet Supplies</option>
              <option value="Other">📦 Other</option>
            </select>

            <label style={label}>Description</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Tell customers what you sell..."
              style={{ ...input, minHeight: 70, resize: "vertical" as const }}
            />

            {/* Contact Section */}
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 8, color: "#374151" }}>
              📞 Contact Information
            </div>

            <label style={label}>Phone Number *</label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => {
                let val = e.target.value;
                if (!val.startsWith("+251")) {
                  val = "+251 " + val.replace(/^\+251\s?/, "");
                }
                setNewPhone(val);
              }}
              placeholder="+251 912 345 678"
              style={input}
            />

            <label style={label}>Telegram Contact</label>
            <input
              value={newTelegram}
              onChange={(e) => setNewTelegram(e.target.value)}
              placeholder="@yourshop or https://t.me/yourshop"
              style={input}
            />
            <div style={{ fontSize: 11, color: "#666", marginTop: -6, marginBottom: 12 }}>
              Customers can message you directly on Telegram
            </div>

            {/* Branding Section */}
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 8, color: "#374151" }}>
              🎨 Branding
            </div>

            <label style={label}>Shop Logo</label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  border: "2px dashed rgba(0,0,0,.12)",
                  overflow: "hidden",
                  background: "#fafafa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="logo preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 24 }}>🏪</span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    ...btn,
                    width: "100%",
                    background: logoFile ? "#fff" : "#f3f4f6",
                    fontWeight: 500,
                  }}
                >
                  {logoFile ? "✓ Change Logo" : "Upload Logo"}
                </button>
                {logoFile && (
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {logoFile.name}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={handleCreateShop}
                disabled={creating}
                style={btn}
              >
                {creating ? "Creating…" : "Create shop"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setErr(null);
                }}
                style={btn}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* styles */
const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.15)",
  display: "inline-block",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};

const input: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.12)",
  borderRadius: 10,
  padding: "9px 11px",
  fontSize: 14,
  background: "#fff",
  outline: "none",
};

const label: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  fontWeight: 600,
  opacity: 0.9,
};

const mutedCard: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(0,0,0,.06)",
  padding: 14,
  fontSize: 14,
  opacity: 0.75,
  background: "var(--tg-theme-bg-color,#fff)",
};

const cardButton: React.CSSProperties = {
  background: "var(--tg-theme-bg-color,#fff)",
  border: "1px solid rgba(0,0,0,.06)",
  borderRadius: 16,
  padding: 12,
  display: "flex",
  alignItems: "center",
  gap: 12,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

// Helper functions for role display
function getRoleLabel(role?: string): string {
  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'COLLABORATOR':
      return 'Manager';
    case 'HELPER':
      return 'Sales';
    case 'MEMBER':
      return 'Member';
    default:
      return 'Owner'; // fallback
  }
}

function getRolePillStyle(role?: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    fontWeight: 500,
  };

  switch (role) {
    case 'OWNER':
      return {
        ...baseStyle,
        background: "rgba(37,99,235,0.08)",
        color: "#1D4ED8",
      };
    case 'COLLABORATOR':
      return {
        ...baseStyle,
        background: "rgba(16,185,129,0.08)",
        color: "#059669",
      };
    case 'HELPER':
      return {
        ...baseStyle,
        background: "rgba(245,158,11,0.08)",
        color: "#D97706",
      };
    case 'MEMBER':
      return {
        ...baseStyle,
        background: "rgba(107,114,128,0.08)",
        color: "#4B5563",
      };
    default:
      return {
        ...baseStyle,
        background: "rgba(37,99,235,0.08)",
        color: "#1D4ED8",
      };
  }
}

const ownerPill: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(37,99,235,0.08)",
  color: "#1D4ED8",
  fontWeight: 500,
};

const topRightBtn: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(37,99,235,0.2)",
  background: "#fff",
  fontSize: 13,
  fontWeight: 500,
  color: "#1D4ED8",
  cursor: "pointer",
};

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
        borderRadius: "999px",
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
