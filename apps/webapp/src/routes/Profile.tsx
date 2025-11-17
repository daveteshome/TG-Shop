import React, { useEffect, useState } from "react";
import { TopBar } from "../components/layout/TopBar";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";
import { FormField, inputStyle } from "../components/common/FormField";
import { AddressForm } from "../components/profile/AddressForm";
import { useAsync } from "../lib/hooks/useAsync";
import { getProfile, updateProfile } from "../lib/api/profile";
import type { Profile as TProfile } from "../lib/types";

// 20 random avatars from DiceBear (no local files needed)
const DEFAULT_AVATARS = Array.from({ length: 20 }).map((_, i) => {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=Avatar${i + 1}`;
});

// Deterministic default avatar per user (based on tgId)
function getDefaultAvatar(tgId?: string | null): string {
  if (!tgId) return DEFAULT_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < tgId.length; i++) {
    hash = (hash * 31 + tgId.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[idx];
}

export default function Profile() {
  const q = useAsync<TProfile>(() => getProfile(), []);
  const [form, setForm] = useState<TProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

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
          {/* Current avatar (chosen or deterministic default) */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <img
              src={form.avatarUrl || getDefaultAvatar(form.tgId)}
              alt="Profile"
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          </div>

          {/* Avatar chooser (only predefined random avatars, no upload) */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
              Choose an avatar
            </div>
            <div style={avatarGrid}>
              {DEFAULT_AVATARS.map((url) => {
                const isSelected = form.avatarUrl === url;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setForm({ ...form, avatarUrl: url })}
                    style={{
                      border: isSelected
                        ? "2px solid var(--tg-theme-button-color, #2ea6ff)"
                        : "1px solid rgba(0,0,0,.1)",
                      padding: 2,
                      borderRadius: "50%",
                      background: "transparent",
                    }}
                  >
                    <img
                      src={url}
                      alt="avatar option"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Identity summary */}
          <div style={kv}>
            <span style={k}>User</span>
            <span style={v}>{form.username || form.name || form.tgId}</span>
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

const avatarGrid: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};
