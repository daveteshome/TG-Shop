// apps/webapp/src/components/shop/ShopInfoDrawer.tsx
import React from "react";
import RightDrawer from "../common/RightDrawer";
import { getTelegramWebApp } from "../../lib/telegram";

type ShopInfoDrawerProps = {
  open: boolean;
  onClose: () => void;
  shop: {
    id?: string;
    slug?: string;
    name?: string;
    shopType?: string | null;
    logoWebUrl?: string | null;
    description?: string | null;
    publicPhone?: string | null;
    publicTelegramLink?: string | null;
    instagramUrl?: string | null;
    facebookUrl?: string | null;
    twitterUrl?: string | null;
    returnPolicy?: string | null;
    shippingInfo?: string | null;
    location?: string | null;
  };
  onCall?: () => void;
  onMessage?: () => void;
};

export default function ShopInfoDrawer({
  open,
  onClose,
  shop,
  onCall,
  onMessage,
}: ShopInfoDrawerProps) {
  const initial = (shop.name || "S").slice(0, 1).toUpperCase();

  return (
    <RightDrawer open={open} onClose={onClose} width="66vw" maxWidth={300}>
      <div style={{ padding: 16 }}>
        {/* Shop Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 60,
              height: 60,
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
            {shop.logoWebUrl ? (
              <img
                src={shop.logoWebUrl}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              initial
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{shop.name}</div>
            {shop.shopType && (
              <div style={{ 
                fontSize: 12, 
                color: "#0369a1",
                marginTop: 4,
                padding: "2px 8px",
                background: "#f0f9ff",
                borderRadius: 4,
                display: "inline-block",
              }}>
                {shop.shopType}
              </div>
            )}
            {shop.description && (
              <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
                {shop.description}
              </div>
            )}
          </div>
        </div>

        {/* Contact Buttons */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {shop.publicPhone && onCall && (
            <button
              onClick={onCall}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #4CAF50",
                background: "#fff",
                color: "#4CAF50",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              📞 Call
            </button>
          )}
          {shop.publicTelegramLink && onMessage && (
            <button
              onClick={onMessage}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #0088cc",
                background: "#fff",
                color: "#0088cc",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              💬 Message
            </button>
          )}
        </div>

        {/* Social Media Links */}
        {(shop.instagramUrl || shop.facebookUrl || shop.twitterUrl) && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Follow Us</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {shop.instagramUrl && (
                <a
                  href={shop.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                    color: "#fff",
                    textDecoration: "none",
                  }}
                  title="Instagram"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}
              {shop.facebookUrl && (
                <a
                  href={shop.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    background: "#1877F2",
                    color: "#fff",
                    textDecoration: "none",
                  }}
                  title="Facebook"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              )}
              {shop.twitterUrl && (
                <a
                  href={shop.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    background: "#000",
                    color: "#fff",
                    textDecoration: "none",
                  }}
                  title="Twitter / X"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Shop Addresses */}
        {shop.location && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>📍 Shop Location(s)</div>
            {shop.location.split(" | ").map((addr, idx) => (
              <div key={idx} style={{ 
                fontSize: 13, 
                color: "#666", 
                lineHeight: 1.6,
                padding: 10,
                background: "#f9fdf9",
                borderRadius: 8,
                marginBottom: 6,
                border: "1px solid #e0f2e0",
              }}>
                {addr}
              </div>
            ))}
          </div>
        )}

        {/* Return Policy */}
        {shop.returnPolicy && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Return Policy</div>
            <div style={{ 
              fontSize: 13, 
              color: "#666", 
              lineHeight: 1.6,
              padding: 12,
              background: "#f9f9f9",
              borderRadius: 8,
              whiteSpace: "pre-wrap",
            }}>
              {shop.returnPolicy}
            </div>
          </div>
        )}

        {/* Shipping Info */}
        {shop.shippingInfo && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>🚚 Shipping Information</div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
              We deliver to the following areas:
            </div>
            <div style={{ 
              fontSize: 13, 
              color: "#666", 
              lineHeight: 1.6,
              padding: 12,
              background: "#f9fcff",
              borderRadius: 8,
              border: "1px solid #e0f0ff",
              whiteSpace: "pre-wrap",
            }}>
              {(() => {
                // Check if all regions are selected (14 total regions in Ethiopia)
                const regions = shop.shippingInfo.split(',').map(r => r.trim()).filter(r => r);
                if (regions.length >= 14) {
                  return "🇪🇹 All Ethiopia";
                }
                return shop.shippingInfo;
              })()}
            </div>
          </div>
        )}

        {/* Leave Shop Button */}
        <div style={{
          marginTop: 30,
          paddingTop: 20,
          borderTop: "1px solid rgba(0,0,0,.06)",
        }}>
          <button
            onClick={async () => {
              const confirmed = window.confirm(
                "Are you sure you want to leave this shop? You will no longer see it in your joined shops."
              );
              if (!confirmed) return;

              try {
                const { api } = await import("../../lib/api/index");
                await api(`/shop/${shop.slug}/membership`, {
                  method: "DELETE",
                });
                
                alert("You have left the shop successfully.");
                onClose();
                
                // Redirect to shops list
                window.location.href = "/shops";
              } catch (e: any) {
                console.error(e);
                alert(e?.message || "Failed to leave shop.");
              }
            }}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #DC2626",
              background: "#fff",
              color: "#DC2626",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            🚪 Leave Shop
          </button>
        </div>
      </div>
    </RightDrawer>
  );
}
