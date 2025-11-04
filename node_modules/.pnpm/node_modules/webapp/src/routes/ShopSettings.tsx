// apps/webapp/src/routes/ShopSettings.tsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api/index";
import { getInitDataRaw } from "../lib/telegram";

type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  publicPhone?: string | null;
  description?: string | null;
  logoImageId?: string | null;   // stored ID
  logoWebUrl?: string | null;    // resolved server URL
  publishUniversal?: boolean;
};

export default function ShopSettings() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [publish, setPublish] = useState(false);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoImageId, setLogoImageId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initData = getInitDataRaw();

  // ---------------- Load shop info ----------------
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const data = await api<TenantInfo>(`/shop/${slug}`);
        setTenant(data);
        setName(data.name);
        setPhone(data.publicPhone || "");
        setDescription(data.description || "");
        setPublish(!!data.publishUniversal);
        setLogoImageId(data.logoImageId || null);
        setLogoPreview(data.logoWebUrl || null);

        window.dispatchEvent(
          new CustomEvent("tgshop:set-shop-context", {
            detail: { slug, name: data.name, logoUrl: data.logoWebUrl || null },
          })
        );
      } catch (e: any) {
        console.error(e);
        setErr("Failed to load shop info");
      }
    })();
  }, [slug]);

  // ---------------- Save changes ----------------
  async function handleSave() {
    if (!slug) return;
    setSaving(true);

    try {
      let finalImageId = logoImageId;

      // If a new logo file chosen → upload it
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        const uploadRes = await fetch(`/api/shop/${slug}/uploads/image`, {
          method: "POST",
          headers: initData ? { Authorization: `tma ${initData}` } : undefined,
          body: fd, // FormData with fd.append("file", logoFile)
        });

        if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => "");
      console.error("Upload failed", uploadRes.status, text);
      alert(`Upload failed ${uploadRes.status}`);
      return;
}
        const { imageId, webUrl } = await uploadRes.json();
        finalImageId = imageId;         // <-- IMPORTANT: use the freshly uploaded id in the PATCH
        setLogoImageId(imageId);        // keep state in sync
        setLogoPreview(webUrl || null); // instant preview

      }

      // Persist tenant updates
      await api(`/shop/${slug}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          publicPhone: phone.trim() || null,
          description: description.trim() || null,
          publishUniversal: publish,
          logoImageId: finalImageId,
        }),
        headers: { "Content-Type": "application/json" },
      });

      // Re-fetch to stay synced with server
      const refreshed = await api<TenantInfo>(`/shop/${slug}`);
      setTenant(refreshed);
      setName(refreshed.name);
      setPhone(refreshed.publicPhone || "");
      setDescription(refreshed.description || "");
      setPublish(!!refreshed.publishUniversal);
      setLogoImageId(refreshed.logoImageId || null);
      setLogoPreview(refreshed.logoWebUrl || null);
      setDirty(false);

      window.dispatchEvent(
        new CustomEvent("tgshop:set-shop-context", {
          detail: { slug, name: refreshed.name, logoUrl: refreshed.logoWebUrl || null },
        })
      );
      window.dispatchEvent(
        new CustomEvent("tgshop:update-logo", {
          detail: { url: refreshed.logoWebUrl || null },
        })
      );

      alert("Saved successfully!");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ---------------- UI ----------------
  if (err) return <div style={{ padding: 16, color: "crimson" }}>{err}</div>;
  if (!tenant) return <div style={{ padding: 16 }}>Loading shop info…</div>;

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Shop Settings</h2>

      <label style={lbl}>Shop name</label>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setDirty(true);
        }}
        style={input}
      />

      <label style={lbl}>Public phone</label>
      <input
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          setDirty(true);
        }}
        style={input}
      />

      <label style={lbl}>Short bio / description</label>
      <textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          setDirty(true);
        }}
        style={{ ...input, minHeight: 70 }}
      />

      <label style={lbl}>Logo</label>
      {logoPreview ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={logoPreview}
            alt="logo"
            style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }}
          />
          <button
            onClick={() => {
              setLogoPreview(null);
              setLogoFile(null);
              setLogoImageId(null);
              setDirty(true);
            }}
            style={btnSecondary}
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setLogoFile(f);
              setLogoPreview(URL.createObjectURL(f));
              setDirty(true);
            }}
          />
          <button onClick={() => fileInputRef.current?.click()} style={btnSecondary}>
            Upload logo
          </button>
        </>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <input
          type="checkbox"
          checked={publish}
          onChange={(e) => {
            setPublish(e.target.checked);
            setDirty(true);
          }}
        />
        <span style={{ fontSize: 14 }}>🌍 Publish to Universal</span>
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button disabled={saving} onClick={handleSave} style={btnPrimary}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => {
            if (!dirty || window.confirm("Discard unsaved changes?")) nav(`/shop/${slug}`);
          }}
          style={btnSecondary}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontWeight: 500, fontSize: 14 };

const input: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.05)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 14,
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  background: "#000",
  color: "#fff",
  border: "1px solid #000",
  borderRadius: 999,
  padding: "6px 16px",
  fontSize: 13,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  background: "#fff",
  color: "#000",
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 999,
  padding: "6px 16px",
  fontSize: 13,
  cursor: "pointer",
};
