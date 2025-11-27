// apps/webapp/src/components/product/ProductCard.tsx
import React, { useState } from "react";
import * as wish from "../../lib/wishlist";

type Mode = "buyer" | "universal" | "owner";

export type Product = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | string | null;          // 👈 allow string from API
  currency?: string | null;
  photoUrl?: string | null;
  images?: { url?: string | null; webUrl?: string | null }[];
  tenant?: { name?: string | null } | null;
  compareAtPrice?: number | string | null; // 👈 allow string from API
};

type Props = {
  p: Product;
  mode?: Mode;
  image?: string;
  shopName?: string;           // used only for wishlist metadata
  shopPhone?: string;          // used as fallback for call
  shopTelegram?: string | null;
  onAdd?: (p: Product) => Promise<void> | void; // buyer cart hook
  onMessage?: () => void;      // will be passed from screen
  onCall?: () => void;         // will be passed from screen
};

export function ProductCard({
  p,
  mode = "buyer",
  image,
  shopName,
  shopPhone,
  shopTelegram,
  onAdd,
  onMessage,
  onCall,
}: Props) {
  const cover =
    image ||
    p.images?.[0]?.webUrl ||
    p.images?.[0]?.url ||
    p.photoUrl ||
    undefined;

  // ---------- Discount logic (robust: handle string or number) ----------
  const rawPrice = p.price;
  const rawCompare = p.compareAtPrice;

  const price =
    rawPrice === null || rawPrice === undefined
      ? null
      : typeof rawPrice === "number"
      ? rawPrice
      : Number(rawPrice);

  const compareAtPrice =
    rawCompare === null || rawCompare === undefined
      ? null
      : typeof rawCompare === "number"
      ? rawCompare
      : Number(rawCompare);

  const hasDiscount =
    price !== null &&
    compareAtPrice !== null &&
    !Number.isNaN(price) &&
    !Number.isNaN(compareAtPrice) &&
    compareAtPrice > price;

  const [liked, setLiked] = useState(
    () => (mode === "universal" ? wish.has(p.id) : false)
  );

  const showHeart = mode === "universal";
  const showCart = mode === "buyer";

  // cancel navigation early
  const stopAll = (e: any) => {
    try {
      e.preventDefault?.();
      e.stopPropagation?.();
      e.nativeEvent?.stopImmediatePropagation?.();
    } catch {}
  };

  const onHeart = (e: React.MouseEvent | React.PointerEvent) => {
    stopAll(e);
    const now = wish.toggle({
      id: p.id,
      title: p.title,
      // use numeric price if available, fallback to raw
      price: price ?? (typeof rawPrice === "number" ? rawPrice : null),
      currency: p.currency ?? null,
      image: cover ?? null,
      tenantName: p.tenant?.name ?? shopName ?? null,
    });
    setLiked(now);
  };

  const onCart = async (e: React.MouseEvent | React.PointerEvent) => {
    stopAll(e);
    if (onAdd) {
      try {
        await onAdd(p);
      } catch (err) {
        console.error("Cart add failed:", err);
      }
    }
  };

  const handleCall = (e: React.MouseEvent | React.PointerEvent) => {
    stopAll(e);
    if (onCall) {
      onCall();
      return;
    }
    if (shopPhone) {
      window.location.href = `tel:${shopPhone}`;
    }
  };

  const handleMessage = (e: React.MouseEvent | React.PointerEvent) => {
    stopAll(e);
    if (onMessage) onMessage();
  };

  return (
    <div
      style={{
        border: "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "var(--color-bg-primary)",
        boxShadow: "var(--shadow-sm)",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* IMAGE + ♥ / 🛒 overlay */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            aspectRatio: "1 / 1",
            background: "linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)",
            backgroundImage: cover ? `url(${cover})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        
        {/* Discount badge */}
        {hasDiscount && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "var(--color-error)",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: "var(--radius-full)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {Math.round(((compareAtPrice! - price!) / compareAtPrice!) * 100)}% OFF
          </div>
        )}

        {(showHeart || showCart) && (
          <button
            type="button"
            onPointerDown={(e) => {
              stopAll(e);
            }}
            onClick={(e) => {
              stopAll(e);
              if (showHeart) {
                onHeart(e);
              } else {
                onCart(e);
              }
            }}
            aria-label={
              showHeart
                ? liked
                  ? "Remove from favorites"
                  : "Add to favorites"
                : "Add to cart"
            }
            aria-pressed={showHeart ? liked : undefined}
            style={{
              ...overlayBtn,
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(8px)",
            }}
          >
            {showHeart ? (liked ? <HeartSolid /> : <HeartOutline />) : <CartIcon />}
          </button>
        )}
      </div>

      {/* TEXT + PRICE + CALL/MSG */}
      <div style={{ padding: "12px" }}>
        {/* Name */}
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            lineHeight: 1.3,
            color: "var(--color-text-primary)",
            marginBottom: "4px",
          }}
        >
          {p.title}
        </div>

        {/* Description – max 2 lines */}
        {p.description && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
              lineHeight: 1.4,
              marginBottom: "8px",
            }}
          >
            {p.description}
          </div>
        )}

        {/* Price + call/msg icons */}
        <div
          style={{
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          {/* Price (with discount support) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {hasDiscount && p.currency && (
              <div
                style={{
                  fontSize: "11px",
                  textDecoration: "line-through",
                  color: "var(--color-text-tertiary)",
                  fontWeight: 500,
                }}
              >
                {compareAtPrice} {p.currency}
              </div>
            )}

            {price !== null && p.currency && !Number.isNaN(price) && (
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--color-primary)",
                }}
              >
                {price} {p.currency}
              </div>
            )}
          </div>

          {/* Call + Message icons (right side) */}
          {(onCall || shopPhone || onMessage) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {(onCall || shopPhone) && (
                <button
                  type="button"
                  onClick={handleCall}
                  onPointerDownCapture={stopAll}
                  aria-label="Call shop"
                  style={smallCircleBtn}
                >
                  <PhoneIcon />
                </button>
              )}
              {onMessage && (
                <button
                  type="button"
                  onClick={handleMessage}
                  onPointerDownCapture={stopAll}
                  aria-label="Message shop"
                  style={smallCircleBtn}
                >
                  <ChatIcon />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const overlayBtn: React.CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 32,
  height: 32,
  borderRadius: "var(--radius-full)",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  pointerEvents: "auto",
  transition: "all 0.2s ease",
  boxShadow: "var(--shadow-sm)",
};

const smallCircleBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "var(--radius-full)",
  border: "1px solid var(--color-border-main)",
  background: "var(--color-bg-primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.2s ease",
  color: "var(--color-text-secondary)",
};

function HeartOutline() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: "#6B7280" }}
    >
      <path
        d="M12.1 8.64l-.1.1-.1-.1C10.14 6.9 7.36 7 5.7 8.66c-1.66 1.66-1.76 4.44-.1 6.3l.1.1L12 21l6.4-5.9.1-.1c1.66-1.86 1.56-4.64-.1-6.3-1.66-1.66-4.44-1.76-6.3-.06z"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
      />
    </svg>
  );
}

function HeartSolid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#EF4444">
      <path d="M12 21l-6.3-5.8c-2-2.2-2-5.6.1-7.6 2-2 5.2-2 7.2.1 2-2.1 5.2-2.1 7.2-.1 2.1 2 2.1 5.4.1 7.6L12 21z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 4h-2l-1 2m0 0l3 9h10l3-7H6.2M4 6h15"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <circle cx="9" cy="20" r="1.6" fill="currentColor" />
      <circle cx="17" cy="20" r="1.6" fill="currentColor" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.5 4.5l2-1.5 2 3-1.5 1.5a10 10 0 004 4l1.5-1.5 3 2-1.5 2A3 3 0 0114 16c-4.4-1.6-7.4-4.6-9-9a3 3 0 011.5-2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6a4 4 0 014-4h8a4 4 0 014 4v5a4 4 0 01-4 4h-3.5L8 21.5V15H8a4 4 0 01-4-4V6z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}
