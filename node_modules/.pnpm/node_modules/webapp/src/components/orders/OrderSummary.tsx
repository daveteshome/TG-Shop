import React, { useEffect, useState } from "react";
import type { Order } from "../../lib/types";
import { money } from "../../lib/format";
import { api } from "../../lib/api/index";

type AnyItem = any;
type ProductCache = Record<string, any>;

export function OrderSummary({ order }: { order: Order }) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [productCache, setProductCache] = useState<ProductCache>({});

  // ---------- Helpers to normalize item shape ----------

  function getItemId(it: AnyItem): string {
    return String(it.id ?? `${it.productId ?? "nop"}-${it.variantId ?? "nov"}`);
  }

  function getItemTitle(it: AnyItem): string {
    return String(it.title ?? it.titleSnapshot ?? "Item");
  }

  function getItemQty(it: AnyItem): number {
    return Number(it.qty ?? it.quantity ?? 1);
  }

  function getItemUnitPrice(it: AnyItem): number {
    const raw = it.price ?? it.unitPrice ?? 0;
    if (typeof raw === "string") return Number(raw);
    if (typeof raw === "number") return raw;
    if (raw && typeof raw === "object" && typeof raw.toNumber === "function") {
      return raw.toNumber();
    }
    return Number(raw || 0);
  }

  function getItemProductId(it: AnyItem): string | null {
    return it.productId ? String(it.productId) : null;
  }

  // ---------- Product fetch + image extraction ----------

  async function ensureProductLoaded(productId: string) {
    if (!productId || productCache[productId]) return;

    const candidates = [
      `/products/${productId}`,
      `/product/${productId}`,
    ];

    for (const url of candidates) {
      try {
        const res: any = await api<any>(url);
        const p = res?.product ?? res;
        if (p && p.id) {
          setProductCache((prev) => ({ ...prev, [productId]: p }));
          return;
        }
      } catch {
        // try next candidate
      }
    }
  }

  function extractImageUrls(productId: string): string[] {
    const p = productCache[productId];
    if (!p) return [];

    const urls: string[] = [];

    if (Array.isArray(p.images) && p.images.length) {
      for (const im of p.images) {
        if (im?.webUrl) urls.push(im.webUrl);
        else if (im?.url) urls.push(im.url);
      }
    }

    if (!urls.length && p.photoUrl) {
      urls.push(p.photoUrl);
    }

    return urls;
  }

  function extractThumb(productId: string): string | null {
    const urls = extractImageUrls(productId);
    return urls[0] ?? null;
  }

  // Prefetch thumbs for all products in this order (best-effort)
  useEffect(() => {
    const ids = Array.from(
      new Set(
        (order.items as AnyItem[])
          .map((it) => getItemProductId(it))
          .filter((id): id is string => !!id),
      ),
    );

    ids.forEach((id) => {
      void ensureProductLoaded(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  // ---------- Render ----------

  return (
    <div style={panel}>
      <div style={rowBetween}>
        <span>Status</span>
        <strong>{order.status}</strong>
      </div>

      {(order as any).shippingAddress && (
        <div style={{ marginTop: 8 }}>
          <div style={{ opacity: 0.7 }}>Shipping address</div>
          <div>{(order as any).shippingAddress}</div>
        </div>
      )}

      <div style={{ marginTop: 12, fontWeight: 600 }}>Items</div>

      {(order.items as AnyItem[]).map((it) => {
        const itemId = getItemId(it);
        const title = getItemTitle(it);
        const qty = getItemQty(it);
        const unitPrice = getItemUnitPrice(it);
        const lineTotal = unitPrice * qty;
        const productId = getItemProductId(it);
        const thumb = productId ? extractThumb(productId) : null;
        const isExpanded = expandedItemId === itemId;

        const handleToggle = () => {
          const next = isExpanded ? null : itemId;
          setExpandedItemId(next);
          if (!isExpanded && productId) {
            void ensureProductLoaded(productId);
          }
        };

        const bigImages = productId ? extractImageUrls(productId) : [];

        return (
          <div key={itemId} style={itemCard}>
            {/* Collapsed row (like cart) */}
            <button
              type="button"
              onClick={handleToggle}
              style={itemHeaderBtn}
            >
              <div style={thumbBox}>
                {thumb ? (
                  <img
                    src={thumb}
                    alt={title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 10,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 10,
                      background: "#f2f2f2",
                    }}
                  />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={itemTitle} title={title}>
                  {title}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {qty} × {money(unitPrice, order.currency)}
                </div>
              </div>

              <div style={{ textAlign: "right", fontWeight: 600, fontSize: 13 }}>
                {money(lineTotal, order.currency)}
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                  {isExpanded ? "Hide" : "Details"}
                </div>
              </div>
            </button>

            {/* Expanded section: big image(s) like ProductDetail */}
            {isExpanded && (
              <div style={expandedBox}>
                {bigImages.length > 0 ? (
                  <div style={bigImageScroller}>
                    {bigImages.map((src, idx) => (
                      <div key={idx} style={bigImageWrap}>
                        <img
                          src={src}
                          alt={title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: 12,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={noImageBox}>No images for this product.</div>
                )}

                {/* Placeholder for more product info later (description, SKU, etc.) */}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 12, ...rowBetween }}>
        <div>Total</div>
        <div style={{ fontWeight: 700 }}>{money(order.total, order.currency)}</div>
      </div>
    </div>
  );
}

const panel: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 12,
  padding: 12,
  marginTop: 12,
};

const rowBetween: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
};

const itemCard: React.CSSProperties = {
  marginTop: 8,
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,.06)",
  background: "var(--tg-theme-bg-color,#fff)",
  overflow: "hidden",
};

const itemHeaderBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 8,
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  textAlign: "left",
  cursor: "pointer",
};

const thumbBox: React.CSSProperties = {
  width: 52,
  height: 52,
  flex: "0 0 52px",
  borderRadius: 10,
  overflow: "hidden",
  background: "#f2f2f2",
};

const itemTitle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const expandedBox: React.CSSProperties = {
  padding: "0 8px 8px",
};

const bigImageScroller: React.CSSProperties = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  paddingTop: 4,
};

const bigImageWrap: React.CSSProperties = {
  minWidth: 220,
  maxWidth: 260,
  height: 180,
  borderRadius: 12,
  overflow: "hidden",
  background: "#f2f2f2",
};

const noImageBox: React.CSSProperties = {
  marginTop: 8,
  padding: 12,
  borderRadius: 10,
  background: "#f8f8f8",
  fontSize: 13,
  opacity: 0.7,
};
