// src/components/shop/ShopProfileDrawer.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import RightDrawer from "../common/RightDrawer";
import { api, getUserRole } from "../../lib/api/index";
import type { ShopRole } from "../../lib/permissions";

type ShopProfileDrawerProps = {
  open: boolean;
  onClose: () => void;
  tenant?: {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
    logoWebUrl?: string | null;
    publishUniversal?: boolean;
  };
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

  // ✅ Prefer prop.slug, fallback to URL
  const computedSlug =
    tenant?.slug ?? (typeof window !== "undefined" ? (window.location.pathname.match(/^\/shop\/([^/]+)/)?.[1] ?? null) : null);

  const [tenantId, setTenantId] = React.useState<string | null>(tenant?.id ?? null);
  const [copyBusy, setCopyBusy] = React.useState(false);
  const [userRole, setUserRole] = React.useState<ShopRole | null>(null);

  // Load user role
  React.useEffect(() => {
    if (open && computedSlug) {
      getUserRole(computedSlug).then((role) => setUserRole(role as ShopRole | null));
    }
  }, [open, computedSlug]);

  // Load tenantId if missing (needed for invite creation)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open) return;
      if (tenantId || !computedSlug) return;
      try {
        const t = await api<{ id: string; slug: string; name: string; logoWebUrl?: string | null }>(`/shop/${computedSlug}`);
        if (mounted) setTenantId(t.id);
      } catch {
        // ignore; copy button will guard
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, computedSlug, tenantId]);

  const initial = (tenant?.name || computedSlug || "S").slice(0, 1).toUpperCase();

  // ✅ Safe navigation helper
  const go = (path: string) => {
    onClose();
    if (typeof window !== "undefined" && window.location.pathname !== path) {
      nav(path);
    }
  };

  // ✅ Create invite and copy/share Telegram startapp link
  async function handleCopyInviteLink() {
    if (!computedSlug) return onClose();
    try {
      setCopyBusy(true);

      // Ensure we have tenantId
      let id = tenantId;
      if (!id) {
        const t = await api<{ id: string }>(`/shop/${computedSlug}`);
        id = t.id;
        setTenantId(id);
      }

      // Create invite (default role: MEMBER/buyer)
      const res = await api<{ invite: any; deepLink: string; deepLinkBot?: string }>(`/tenants/${id}/invites`, {
        method: "POST",
        body: JSON.stringify({ role: "MEMBER" }),
      });

      const deepLink = res.deepLink; // e.g. https://t.me/<BOT>?startapp=join_<code>

      // Prefer native share if available, else copy to clipboard
      if (navigator.share) {
        try {
          await navigator.share({ title: tenant?.name ?? "Join my shop", url: deepLink });
        } catch {
          // if user cancels share, fall back to copy (no alert needed)
          await navigator.clipboard?.writeText(deepLink);
          alert("Invite link copied!");
        }
      } else {
        await navigator.clipboard?.writeText(deepLink);
        alert("Invite link copied!");
      }
    } catch (e) {
      alert("Failed to create invite link. Please try again.");
    } finally {
      setCopyBusy(false);
    }
  }

  return (
    <RightDrawer open={open} onClose={onClose} width="66vw" maxWidth={300}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderBottom: "1px solid rgba(0,0,0,.06)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
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

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tenant?.name ?? computedSlug ?? "Shop"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            {tenant?.publishUniversal ? "Published to Universal" : "Private"}
          </div>
        </div>

        {/* 🔗 Copy Telegram startapp invite */}
        <button
          onClick={handleCopyInviteLink}
          disabled={copyBusy || !computedSlug}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,.08)",
            background: "#fff",
            cursor: copyBusy ? "default" : "pointer",
            fontSize: 16,
          }}
          aria-label="Copy invite link"
          title="Copy invite link"
        >
          {copyBusy ? "…" : "🔗"}
        </button>
      </div>

      {/* Quick actions */}
      <div style={{ padding: "8px 12px" }}>
        <button
          onClick={() => {
            if (!computedSlug) return onClose();
            // Store where we're coming from
            sessionStorage.setItem('viewShopFrom', `/shop/${computedSlug}`);
            onClose();
            nav(`/s/${computedSlug}`);
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
          👁️ View Shop
        </button>
      </div>

      {/* Sections */}
      <div style={{ overflowY: "auto" }}>
        {/* Manage Section - Owner & Collaborator only */}
        {(userRole === "OWNER" || userRole === "COLLABORATOR") && (
          <>
            <div style={sectionTitle}>Manage</div>

            <div
              style={row}
              onClick={() => {
                if (!computedSlug) return onClose();
                go(`/shop/${computedSlug}/settings`);
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

            {/* Invitations - Owner & Collaborator */}
            <div
              style={row}
              onClick={() => {
                if (!computedSlug) return onClose();
                go(`/shop/${computedSlug}/invitations`);
              }}
            >
              👥 Team
            </div>
          </>
        )}

        {/* Catalog & Sales - All roles */}
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

        {/* Analytics - Owner & Collaborator only */}
        {(userRole === "OWNER" || userRole === "COLLABORATOR") && (
          <>
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
          </>
        )}

        {/* Publishing - Owner only */}
        {userRole === "OWNER" && (
          <>
            <div style={sectionTitle}>Publishing</div>

            <div
              style={row}
              onClick={() => {
                if (!computedSlug) return onClose();
                go(`/shop/${computedSlug}/settings`);
              }}
              title="Toggle will be implemented later in Settings"
            >
              🌍 Publish to Universal
            </div>
          </>
        )}
      </div>
    </RightDrawer>
  );
}
