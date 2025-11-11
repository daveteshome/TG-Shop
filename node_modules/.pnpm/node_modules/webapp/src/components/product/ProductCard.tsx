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
  shopName?: string;
  shopPhone?: string;
  onAdd?: (p: Product) => Promise<void> | void; // buyer cart hook
  onMessage?: () => void;
  onCall?: () => void;
};

export function ProductCard({
  p,
  mode = "buyer",
  image,
  shopName,
  onAdd,
}: Props) {
  const cover =
    image ||
    p.images?.[0]?.webUrl ||
    p.images?.[0]?.url ||
    p.photoUrl ||
    undefined;

  const [liked, setLiked] = useState(() => (mode === "universal" ? wish.has(p.id) : false));

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

  // inside ProductCard.tsx
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

  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,.08)",
        borderRadius: 12,
        overflow: "hidden",
        background: "#fff",
      }}
    >
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
              showHeart ? (liked ? "Remove from favorites" : "Add to favorites") : "Add to cart"
            }
            aria-pressed={showHeart ? liked : undefined}
            style={overlayBtn}
          >
            {showHeart ? (liked ? <HeartSolid /> : <HeartOutline />) : <CartIcon />}
          </button>
        )}
      </div>

      <div style={{ padding: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
          {p.title}
        </div>
        {p.price != null && p.currency && (
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
            {p.price} {p.currency}
          </div>
        )}
        {shopName && (
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.6 }}>{shopName}</div>
        )}
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

function HeartOutline() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: "#131313ff" }} // 🔴 set stroke color
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
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="#e11d48" // 🔴 solid red
    >
      <path d="M12 21l-6.3-5.8c-2-2.2-2-5.6.1-7.6 2-2 5.2-2 7.2.1 2-2.1 5.2-2.1 7.2-.1 2.1 2 2.1 5.4.1 7.6L12 21z" />
    </svg>
  );
}


function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M7 4h-2l-1 2m0 0l3 9h10l3-7H6.2M4 6h15" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <circle cx="9" cy="20" r="1.6" fill="currentColor" />
      <circle cx="17" cy="20" r="1.6" fill="currentColor" />
    </svg>
  );
}
