// src/components/shop/ShopProfileDrawer.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import RightDrawer from "../common/RightDrawer";

type ShopProfileDrawerProps = {
  open: boolean;
  onClose: () => void;
  tenant?: { name?: string | null; slug?: string | null; logoWebUrl?: string | null; publishUniversal?: boolean };
};

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderBottom: "1px solid rgba(0,0,0,.04)",
  cursor: "pointer",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "rgba(0,0,0,.5)",
  padding: "12px",
};

export default function ShopProfileDrawer({ open, onClose, tenant }: ShopProfileDrawerProps) {
  const nav = useNavigate();

  // ✅ Stable slug: prefer prop, fallback to URL
  const computedSlug =
    tenant?.slug ??
    (window.location.pathname.match(/^\/shop\/([^/]+)/)?.[1] ?? null);

  const initial = (tenant?.name || computedSlug || "S").slice(0, 1).toUpperCase();

  // ✅ Safe navigation: close first, and don't navigate if it's the same path
  const go = (path: string) => {
    onClose();
    if (window.location.pathname !== path) {
      nav(path);
    }
  };

  return (
    <RightDrawer open={open} onClose={onClose} width="66vw" maxWidth={300}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderBottom: "1px solid rgba(0,0,0,.06)" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "999px",
            backgroundColor: "#eee",               // avoid 'background' shorthand
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            fontWeight: 700,
          }}
        >
          {tenant?.logoWebUrl ? (
            <img
              src={tenant.logoWebUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            initial
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{tenant?.name ?? computedSlug ?? "Shop"}</div>
          <div style={{ fontSize: 12, opacity: .6 }}>
            {tenant?.publishUniversal ? "Published to Universal" : "Private"}
          </div>
        </div>
        <button
          onClick={() => {
            if (!computedSlug) return onClose();
            const url = `${window.location.origin}/shop/${computedSlug}`;
            if (navigator.share) {
              navigator.share({ title: tenant?.name ?? "My Shop", url }).catch(() => {});
            } else {
              navigator.clipboard?.writeText(url);
              alert("Shop link copied!");
            }
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,.08)",
            background: "#fff",
            cursor: "pointer",
            fontSize: 16,
          }}
          aria-label="Share shop link"
        >
          🔗
        </button>
      </div>

      {/* Quick actions */}
      <div style={{ padding: "8px 12px" }}>
        <button
          onClick={() => {
            if (!computedSlug) return onClose();
            go(`/shop/${computedSlug}?view=customer`);
          }}
          style={{
            border: "1px solid rgba(0,0,0,.1)",
            borderRadius: 999,
            padding: "4px 12px",
            background: "#fff",
            cursor: "pointer",
            fontSize: 13,
            lineHeight: 1.2,
            width: "100%",
          }}
        >
          View as customer
        </button>
      </div>

      {/* Sections */}
      <div style={{ overflowY: "auto" }}>
        <div style={sectionTitle}>Manage</div>
        <div
          style={row}
          onClick={() => {
            if (!computedSlug) return onClose();
            go(`/shop/${computedSlug}/settings`);     // ✅ safe nav, no duplicate
          }}
        >
          ⚙️ Shop settings
        </div>
        <div
          style={row}
          onClick={() => {
            if (!computedSlug) return onClose();
            go(`/shop/${computedSlug}/categories`);
          }}
        >
          🗂️ Categories
        </div>
        <div
          style={row}
          onClick={() => {
            if (!computedSlug) return onClose();
            go(`/shop/${computedSlug}/invitations`);
          }}
        >
          👥 Invitations & roles
        </div>

        <div style={sectionTitle}>Catalog & Sales</div>
        <div
          style={row}
          onClick={() => {
            if (!computedSlug) return onClose();
            go(`/shop/${computedSlug}`);
          }}
        >
          📦 Products
        </div>
        <div
          style={row}
          onClick={() => {
            if (!computedSlug) return onClose();
            go(`/shop/${computedSlug}/orders`);
          }}
        >
          🧾 Orders
        </div>

        <div style={sectionTitle}>Analytics</div>
        <div
          style={row}
          onClick={() => {
            if (!computedSlug) return onClose();
            go(`/shop/${computedSlug}/analytics`);
          }}
        >
          📈 Overview
        </div>
        <div
          style={row}
          onClick={() => {
            if (!computedSlug) return onClose();
            go(`/shop/${computedSlug}/analytics/top-products`);
          }}
        >
          ⭐ Top products
        </div>

        <div style={sectionTitle}>Publishing</div>
        <div
          style={row}
          onClick={() => {
            if (!computedSlug) return onClose();
            go(`/shop/${computedSlug}/settings`); // toggle later in settings
          }}
          title="Toggle will be implemented later in Settings"
        >
          🌍 Publish to Universal
        </div>
      </div>
    </RightDrawer>
  );
}
