import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { getInitDataRaw } from "../lib/telegram";
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
};

export default function ShopList() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState<Tenant[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");
  const [newPublish, setNewPublish] = useState<boolean>(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const loc = useLocation();

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
    setCreating(true);
    try {
      let logoImageId: string | null = null;
      if (logoFile) {
        logoImageId = await uploadLogoPreCreate(logoFile);
      }

      const payload = {
        name: newName.trim(),
        publicPhone: newPhone.trim() || null,
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
                setNewPhone("");
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
                    <span style={ownerPill}>Owner</span>
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
            {err ? <div style={{ color: "crimson" }}>{err}</div> : null}

            <label style={label}>Shop name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Dawit's Store"
              style={input}
            />

            <label style={label}>Public phone</label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+49 123 4567"
              style={input}
            />

            <label style={label}>Description</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Short description of your shop"
              style={{ ...input, minHeight: 70, resize: "vertical" as const }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 6,
              }}
            >
              <input
                id="publishUniversal"
                type="checkbox"
                checked={newPublish}
                onChange={(e) => setNewPublish(e.target.checked)}
              />
              <label htmlFor="publishUniversal" style={{ fontSize: 13 }}>
                Publish to Universal (recommended)
              </label>
            </div>

            <label style={label}>Logo</label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  border: "1px solid rgba(0,0,0,.12)",
                  overflow: "hidden",
                  background: "#fafafa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="logo preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 11, opacity: 0.55 }}>No logo</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                style={btn}
              >
                {logoFile ? "Change logo" : "Choose logo"}
              </button>

              {logoFile && (
                <span
                  style={{
                    fontSize: 12,
                    opacity: 0.8,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {logoFile.name}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
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
