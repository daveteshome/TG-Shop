// apps/webapp/src/components/product/ProductCard.tsx
import React, { useState } from "react";
import * as wish from "../../lib/wishlist";

type Mode = "buyer" | "universal" | "owner";

export type Product = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  photoUrl?: string | null;
  images?: { url?: string | null; webUrl?: string | null }[];
  tenant?: { name?: string | null } | null;
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
      price: p.price ?? null,
      currency: p.currency ?? null,
      image: cover ?? null,
      tenantName: p.tenant?.name ?? shopName ?? null,
    });
    setLiked(now);
  };

  const onCart = async (e: React.MouseEvent | React.PointerEvent) => {
    stopAll(e);
    if (onAdd) await onAdd(p);
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
        border: "1px solid rgba(0,0,0,.08)",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* IMAGE + ♥ / 🛒 overlay (unchanged) */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            aspectRatio: "1 / 1",
            background: "#eee",
            backgroundImage: cover ? `url(${cover})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {(showHeart || showCart) && (
          <button
            type="button"
            onPointerDownCapture={stopAll}
            onClick={showHeart ? onHeart : onCart}
            aria-label={
              showHeart
                ? liked
                  ? "Remove from favorites"
                  : "Add to favorites"
                : "Add to cart"
            }
            aria-pressed={showHeart ? liked : undefined}
            style={overlayBtn}
          >
            {showHeart ? (liked ? <HeartSolid /> : <HeartOutline />) : <CartIcon />}
          </button>
        )}
      </div>

      {/* TEXT + PRICE + CALL/MSG */}
      <div style={{ padding: 10 }}>
        {/* Name */}
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
          {p.title}
        </div>

        {/* Description – max 2 lines */}
        {p.description && (
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              opacity: 0.75,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            }}
          >
            {p.description}
          </div>
        )}

                {/* Price + call/msg icons */}
        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {/* Price */}
          {p.price != null && p.currency && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                opacity: 0.9,
              }}
            >
              {p.price} {p.currency}
            </div>
          )}

          {/* Call + Message icons (right side) */}
          {(onCall || shopPhone || onMessage) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
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

        {/* 🔍 TEMP DEBUG: show phone + telegram so we see what comes from backend */}
        {(shopPhone || shopTelegram) && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              opacity: 0.6,
              lineHeight: 1.3,
            }}
          >
            {shopPhone && <div>Phone: {shopPhone}</div>}
            {shopTelegram && <div>Telegram: {shopTelegram}</div>}
          </div>
        )}

        {/* We removed visible shop name as you requested */}


        {/* We removed visible shop name as you requested */}
      </div>
    </div>
  );
}

const overlayBtn: React.CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,.1)",
  background: "rgba(255,255,255,.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  pointerEvents: "auto",
};

const smallCircleBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,.08)",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

function HeartOutline() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: "#131313ff" }}
    >
      <path
        d="M12.1 8.64l-.1.1-.1-.1C10.14 6.9 7.36 7 5.7 8.66c-1.66 1.66-1.76 4.44-.1 6.3l.1.1L12 21l6.4-5.9.1-.1c1.66-1.86 1.56-4.64-.1-6.3-1.66-1.66-4.44-1.76-6.3-.06z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
    </svg>
  );
}

function HeartSolid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#e11d48">
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
