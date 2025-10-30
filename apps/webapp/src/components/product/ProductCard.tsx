import React, { useState } from "react";
import type { Product } from "../../lib/types";
import { money } from "../../lib/format";

const API_BASE = import.meta.env.VITE_API_BASE;

type Mode = "personal" | "universal";

export function ProductCard({
  p,
  onAdd,
  mode = "personal",
  onMessage,
  onCall,
  shopName,
  shopPhone,
  image,
}: {
  p: Product;
  onAdd?: (p: Product) => Promise<void>;
  mode?: Mode;
  onMessage?: () => void;
  onCall?: () => void;
  shopName?: string | null;
  shopPhone?: string | null;
  image?: string | null;
}) {
  const imgSrc = image ?? `${API_BASE}/products/${p.id}/image`;
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const isActive = (p as any).isActive ?? (p as any).active ?? true;

  async function handleAdd() {
    if (!onAdd) return;
    if (adding) return;
    setAdding(true);
    try {
      await onAdd(p);
      setAdded(true);
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light");
      setTimeout(() => setAdded(false), 1000);
    } finally { setAdding(false); }
  }

  return (
    <div style={styles.card}>
      <div style={styles.thumbWrap}>
        <img src={imgSrc} alt={p.title} style={styles.thumb} loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        {!isActive && <span style={styles.badge}>Inactive</span>}
      </div>

      <div style={{ padding: 10 }}>
        <div style={styles.title}>{p.title}</div>
        {shopName && <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{shopName}</div>}
        <div style={styles.row}>
          <span>{money(p.price, p.currency)}</span>
          {mode === "personal" && <span style={{ opacity: 0.7 }}>{(p.stock ?? 0)} in stock</span>}
        </div>

        {mode === "universal" ? (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={onMessage}>Message</button>
            {shopPhone && <button className="btn-outline" style={{ flex: 1 }} onClick={onCall}>Call</button>}
          </div>
        ) : (
          <button
            disabled={!onAdd || (p.stock ?? 0) <= 0}
            className="btn-primary"
            style={{ width: "100%", marginTop: 10 }}
            onClick={handleAdd}
          >
            {!onAdd ? "—" : adding ? "Adding…" : added ? "✓ Added" : (p.stock ?? 0) > 0 ? "Add to cart" : "Out of stock"}
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { border: "1px solid rgba(0,0,0,.08)", borderRadius: 12, overflow: "hidden", background: "var(--tg-theme-bg-color, #fff)" },
  thumbWrap: { position: "relative", aspectRatio: "1 / 1", background: "#f2f2f2" },
  thumb: { width: "100%", height: "100%", objectFit: "cover" },
  badge: { position: "absolute", top: 8, left: 8, background: "#111", color: "#fff", fontSize: 12, padding: "2px 6px", borderRadius: 8 },
  title: { fontWeight: 700, marginBottom: 6 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between" },
};
