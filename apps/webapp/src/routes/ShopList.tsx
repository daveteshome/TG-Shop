// apps/webapp/src/routes/ShopList.tsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api/index";
import { getInitDataRaw } from "../lib/telegram";
import { createTenantFull } from "../lib/api/index";

type Tenant = { id: string; slug: string; name: string; publicPhone?: string | null };

export default function ShopList() {
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState<Tenant[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // form state (match Shop Settings fields)
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");
  const [newPublish, setNewPublish] = useState<boolean>(true); // default TRUE
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  // Preview (small icon like in Settings)
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
        const r = await api<{ universal: any; myShops: Tenant[]; joinedShops: Tenant[] }>("/shops/list");
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

  // generic pre-create upload (no slug yet)
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
    console.log("[create-shop] submit", { newName, newPhone, hasDesc: Boolean(newDesc), newPublish, hasLogo: Boolean(logoFile) });

    // 1) Optional logo upload
    let logoImageId: string | null = null;
    if (logoFile) {
      console.log("[create-shop] uploading logo…");
      logoImageId = await uploadLogoPreCreate(logoFile);
      console.log("[create-shop] upload done", { logoImageId });
    } else {
      console.log("[create-shop] no logo selected");
    }

    // 2) Create tenant with full data
    const payload = {
      name: newName.trim(),
      publicPhone: newPhone.trim() || null,
      description: newDesc.trim() || null,
      publishUniversal: newPublish,
      logoImageId: logoImageId || null,
    };
    console.log("[create-shop] POST /tenants payload", payload);

    const { tenant } = await createTenantFull(payload);
    console.log("[create-shop] response", tenant);

    if (tenant?.slug) {
      console.log("[create-shop] navigate", tenant.slug);
      navigate(`/shop/${tenant.slug}`);
    } else {
      setErr("Created but no slug returned.");
    }
  } catch (e: any) {
    console.error("[create-shop][ERROR]", e);
    setErr(e?.message || "Failed to create shop");
  } finally {
    setCreating(false);
  }
}


  if (loading) return <div style={{ padding: 12 }}>Loading…</div>;
  if (err && !showCreate) return <div style={{ padding: 12, color: "crimson" }}>Error: {err}</div>;

  const hasShops = owned.length > 0;

  return (
    <div style={{ padding: 12, display: "grid", gap: 14 }}>
      {/* Header: 🏪 My Shops + (+) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>🏪 My Shops</h2>
        {hasShops && (
          <button
            onClick={() => {
              setShowCreate((v) => !v);
              setNewName("");
              setNewPhone("");
              setNewDesc("");
              setNewPublish(true);
              setLogoFile(null);
            }}
            style={circleBtn}
            title="Create new shop"
          >
            +
          </button>
        )}
      </div>

      {/* list of shops */}
      {hasShops ? (
        <ul style={list}>
          {owned.map((s) => (
            <li key={s.id}>
              <button onClick={() => navigate(`/shop/${s.slug}`)} style={linkBtnButton}>
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div style={muted}>You don’t own any shops yet.</div>
      )}

      {/* create form (match Shop Settings styling patterns) */}
      {showCreate && (
        <div
          style={{
            marginTop: 10,
            border: "1px dashed rgba(0,0,0,.15)",
            borderRadius: 10,
            padding: 12,
            display: "grid",
            gap: 10,
          }}
        >
          {err ? <div style={{ color: "crimson" }}>{err}</div> : null}

          {/* Name */}
          <label style={label}>Shop name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Dawit's Store"
            style={input}
          />

          {/* Phone */}
          <label style={label}>Public phone</label>
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="+49 123 4567"
            style={input}
          />

          {/* Description */}
          <label style={label}>Description</label>
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Short description of your shop"
            style={{ ...input, minHeight: 70, resize: "vertical" as const }}
          />

          {/* Publish toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
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

          {/* Logo */}
          <label style={label}>Logo</label>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Preview chip (same idea as Settings: small rounded image) */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
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
              <span style={{ fontSize: 12, opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis" }}>
                {logoFile.name}
              </span>
            )}
          </div>

          {/* Submit */}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={handleCreateShop} disabled={creating} style={btn}>
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
};

const list: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: 6,
};

const linkBtnButton: React.CSSProperties = {
  textDecoration: "underline",
  color: "inherit",
  background: "transparent",
  border: "none",
  padding: 0,
  fontSize: 14,
  cursor: "pointer",
};

const muted: React.CSSProperties = { opacity: 0.65 };

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

const circleBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "999px",
  border: "1px solid rgba(0,0,0,.15)",
  background: "#fff",
  fontSize: 20,
  lineHeight: "28px",
  textAlign: "center",
  cursor: "pointer",
};
