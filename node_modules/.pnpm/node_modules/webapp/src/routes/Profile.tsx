import React, { useEffect, useState, useRef } from "react";
import { TopBar } from "../components/layout/TopBar";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";
import { FormField, inputStyle } from "../components/common/FormField";
import { AddressForm } from "../components/profile/AddressForm";
import { useAsync } from "../lib/hooks/useAsync";
import { getProfile, updateProfile } from "../lib/api/profile";
import { getInitDataRaw } from "../lib/telegram";
import type { Profile as TProfile } from "../lib/types";

// Derive initials for fallback avatar
function getInitials(
  name?: string | null,
  username?: string | null,
  tgId?: string | null
): string {
  const base = name || username || tgId || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts[0][0]?.toUpperCase() || "?";
}

// Heuristic: is the string a URL or just an imageId?
function looksLikeUrl(s?: string | null): boolean {
  if (!s) return false;
  return /^https?:\/\//i.test(s);
}

export default function Profile() {
  const q = useAsync<TProfile>(() => getProfile(), []);
  const [form, setForm] = useState<TProfile | null>(null);
  const [saving, setSaving] = useState(false);

  // UI-only preview URL (R2 web URL)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // For choosing local file BEFORE upload (optional – we upload immediately on change)
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
  if (q.data) {
    setForm(q.data);

    if (q.data.avatarWebUrl) {
      // preferred path: URL from backend
      setAvatarPreview(q.data.avatarWebUrl);
    } else if (looksLikeUrl(q.data.avatarUrl)) {
      // backward compat: if avatarUrl is still a full URL
      setAvatarPreview(q.data.avatarUrl as string);
    } else {
      setAvatarPreview(null);
    }
  }
}, [q.data]);


  async function handleUploadAvatar(file: File) {
    const initData = getInitDataRaw();
    if (!initData) {
      alert("No Telegram auth data. Please reopen the Mini App.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/uploads/image", {
        method: "POST",
        body: fd,
        headers: { Authorization: `tma ${initData}` },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Avatar upload failed", res.status, text);
        alert("Avatar upload failed");
        return;
      }

      const { imageId, webUrl } = await res.json();

      // Store imageId in form.avatarUrl (DB field), preview URL in local state
      setForm((prev) =>
        prev
          ? {
              ...prev,
              avatarUrl: imageId || null,
            }
          : prev
      );
      setAvatarPreview(webUrl || null);
    } catch (e) {
      console.error(e);
      alert("Avatar upload failed");
    }
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      await updateProfile({
        phone: form.phone || null,
        name: form.name || null,
        username: form.username || null,
        country: form.country || null,
        city: form.city || null,
        place: form.place || null,
        specialReference: form.specialReference || null,
        // avatarUrl now stores the R2 image ID (or null)
        avatarUrl: form.avatarUrl || null,
      });
      alert("Profile saved");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <TopBar title="Profile" />
      {q.loading && <Loader />}
      {!q.loading && q.error && <ErrorView error={q.error} />}

      {form && (
        <div style={panel}>
          {/* Avatar + Upload/Remove */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background:
                  "var(--tg-theme-bg-color, radial-gradient(circle at 30% 30%, #4f46e5, #0ea5e9))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                fontWeight: 700,
                fontSize: 26,
                margin: "0 auto 8px auto",
                color: "#fff",
              }}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  onError={() => {
                    // fallback to initials if preview URL breaks
                    setAvatarPreview(null);
                  }}
                />
              ) : (
                getInitials(form.name, form.username, (form as any).tgId)
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                // Upload immediately, like ShopSettings
                void handleUploadAvatar(f);
              }}
            />

            {/* Upload / Remove button */}
            {avatarPreview ? (
              <button
                type="button"
                style={secondaryBtn}
                onClick={() => {
                  // Remove avatar → back to initials
                  setAvatarPreview(null);
                  setForm({ ...form, avatarUrl: null });
                }}
              >
                Remove photo
              </button>
            ) : (
              <button
                type="button"
                style={secondaryBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload photo
              </button>
            )}
          </div>

          {/* Identity summary */}
          <div style={kv}>
            <span style={k}>User</span>
            <span style={v}>
              {form.username || form.name || (form as any).tgId}
            </span>
          </div>

          {/* Name */}
          <FormField label="Name">
            <input
              style={inputStyle}
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your full name"
            />
          </FormField>

          {/* Username */}
          <FormField label="Username">
            <input
              style={inputStyle}
              value={form.username || ""}
              onChange={(e) =>
                setForm({ ...form, username: e.target.value })
              }
              placeholder="Telegram username (without @)"
            />
          </FormField>

          {/* Phone */}
          <FormField label="Phone">
            <input
              style={inputStyle}
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone number"
            />
          </FormField>

          {/* Country */}
          <FormField label="Country">
            <input
              style={inputStyle}
              value={form.country || ""}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="Country (e.g. Ethiopia, Germany)"
            />
          </FormField>

          {/* Address */}
          <AddressForm
            city={form.city || ""}
            place={form.place || ""}
            specialReference={form.specialReference || ""}
            onChange={(f) =>
              setForm({
                ...form,
                city: f.city,
                place: f.place,
                specialReference: f.specialReference,
              })
            }
          />

          <button style={primaryBtn} onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

const panel: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 12,
  padding: 12,
  marginTop: 12,
};

const kv: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1fr",
  gap: 8,
  alignItems: "center",
  marginBottom: 8,
};

const k: React.CSSProperties = { opacity: 0.7 };

const v: React.CSSProperties = { fontWeight: 600 };

const primaryBtn: React.CSSProperties = {
  border: "none",
  background: "var(--tg-theme-button-color, #2ea6ff)",
  color: "var(--tg-theme-button-text-color, #fff)",
  padding: "10px 12px",
  borderRadius: 10,
  width: "100%",
  marginTop: 8,
};

const secondaryBtn: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.12)",
  background: "#fff",
  color: "#111827",
  padding: "6px 14px",
  borderRadius: 999,
  fontSize: 13,
  cursor: "pointer",
};

