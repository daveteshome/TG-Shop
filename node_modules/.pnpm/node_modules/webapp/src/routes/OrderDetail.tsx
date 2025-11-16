// apps/webapp/src/routes/OrderDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api/index";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";
import { money } from "../lib/format";
import { TopBar } from "../components/layout/TopBar";

type OrderItemRow = {
  productId: string;
  variantId?: string | null;
  title: string;
  variant?: string | null;
  quantity: number;
  unitPrice: string;
  currency: string;
};

type OrderDetail = {
  id: string;
  shortCode: string | null;
  status: string;
  total: string;
  currency: string;
  note?: string | null;
  createdAt: string;
  items: OrderItemRow[];
};

type ProductBrief = {
  thumbUrl: string | null;   // cover image (first)
  imageUrls: string[];       // all images for slider
  title: string;
  description: string | null;
  price: string | null;
  currency: string | null;
};

export default function OrderDetail() {
  // Owner route: /shop/:slug/orders/:orderId
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // productId -> product brief (images + basic info)
  const [productInfo, setProductInfo] = useState<
    Record<string, ProductBrief | null>
  >({});

  // which line is expanded (productId + variantId)
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // per-product current image index for the slider
  const [imageIndex, setImageIndex] = useState<Record<string, number>>({});

  /* ---------------- Load order once ---------------- */

  useEffect(() => {
    if (!orderId || !slug) return;

    async function load() {
      try {
        setLoading(true);
        setErr(null);

        // 🔑 owner endpoint
        const res: any = await api<any>(`/shop/${slug}/orders/${orderId}`);

        const total =
          res.total && typeof (res.total as any).toString === "function"
            ? (res.total as any).toString()
            : String(res.total ?? "0");

        const items: OrderItemRow[] = (res.items ?? []).map((it: any) => ({
          productId: String(it.productId),
          variantId: it.variantId ?? null,
          title: String(it.title ?? it.titleSnapshot ?? ""),
          variant: it.variant ?? it.variantSnapshot ?? null,
          quantity: Number(it.quantity ?? 1),
          unitPrice:
            it.unitPrice &&
            typeof (it.unitPrice as any).toString === "function"
              ? (it.unitPrice as any).toString()
              : String(it.unitPrice ?? "0"),
          currency: String(it.currency ?? res.currency ?? "ETB"),
        }));

        const dto: OrderDetail = {
          id: String(res.id),
          shortCode: res.shortCode ?? null,
          status: String(res.status ?? "pending"),
          total,
          currency: String(res.currency ?? "ETB"),
          note: res.note ?? null,
          createdAt: res.createdAt
            ? String(res.createdAt)
            : new Date().toISOString(),
          items,
        };

        setOrder(dto);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [orderId, slug]);

  /* ---------------- Load product info (images + details) ---------------- */

  async function loadProductInfo(productId: string, currentSlug: string) {
    // already loaded (even if null)
    if (productInfo[productId] !== undefined) return;

    try {
      const res: any = await api<any>(
        `/shop/${currentSlug}/products/${productId}`
      );

      const rawProduct = res?.product ?? res;

      // Collect ALL image URLs for slider
      const imageUrls: string[] = Array.isArray(res?.images)
        ? (res.images as any[])
            .map((im: any) => {
              if (!im) return null;
              return im.webUrl || im.url || null;
            })
            .filter((u: string | null): u is string => !!u)
        : [];

      // Cover image is the first image if present
      let thumbUrl: string | null = imageUrls[0] ?? null;

      // Fallback: product.photoUrl or shared /image route
      if (!thumbUrl) {
        if (rawProduct?.photoUrl && typeof rawProduct.photoUrl === "string") {
          thumbUrl = rawProduct.photoUrl;
          imageUrls.push(rawProduct.photoUrl);
        } else {
          thumbUrl = `/api/products/${productId}/image`;
          imageUrls.push(thumbUrl);
        }
      }

      const brief: ProductBrief = {
        thumbUrl,
        imageUrls,
        title: String(rawProduct?.title ?? ""),
        description:
          typeof rawProduct?.description === "string"
            ? rawProduct.description
            : null,
        price:
          rawProduct?.price != null
            ? String(
                typeof rawProduct.price.toString === "function"
                  ? rawProduct.price.toString()
                  : rawProduct.price
              )
            : null,
        currency:
          (rawProduct?.currency && String(rawProduct.currency)) || null,
      };

      setProductInfo((prev) => ({ ...prev, [productId]: brief }));
      setImageIndex((prev) =>
        prev[productId] === undefined ? { ...prev, [productId]: 0 } : prev
      );
    } catch {
      // on failure, mark as "no info"
      setProductInfo((prev) => ({ ...prev, [productId]: null }));
    }
  }

  // Ensure product info is loaded once we have order + slug
  useEffect(() => {
    if (!order || !slug) return;
    for (const it of order.items) {
      if (productInfo[it.productId] === undefined) {
        void loadProductInfo(it.productId, slug);
      }
    }
  }, [order, slug, productInfo]);

  /* ---------------- Render ---------------- */

  if (loading) {
    return (
      <div>
        <TopBar title="Order" />
        <Loader />
      </div>
    );
  }

  if (err) {
    return (
      <div>
        <TopBar title="Order" />
        <ErrorView error={err} />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <TopBar title="Order" />
        <div style={{ padding: 10 }}>
          <div style={{ marginBottom: 8 }}>No order loaded.</div>
        </div>
      </div>
    );
  }

  const short = order.shortCode || order.id.slice(0, 6);
  const created = new Date(order.createdAt);
  const dateStr = created.toLocaleString();

  return (
    <div>
      <TopBar title={`Order #${short}`} />
      <div style={{ padding: 10, paddingBottom: 80 }}>
        {/* Header summary */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>Order</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>#{short}</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
            {dateStr}
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={statusBadge(order.status)}>{order.status}</span>
          </div>
        </div>

        {/* Total & note */}
        <div
          style={{
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,.06)",
            padding: 10,
            marginBottom: 12,
            background: "rgba(0,0,0,.02)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
            }}
          >
            <span>Total</span>
            <span>{money(Number(order.total || "0"), order.currency)}</span>
          </div>
          {order.note && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                opacity: 0.8,
                whiteSpace: "pre-wrap",
              }}
            >
              Note: {order.note}
            </div>
          )}
        </div>

        {/* Items – cover image + expand for slider + details */}
        <div style={{ marginBottom: 6, fontWeight: 700 }}>Items</div>
        <div style={{ display: "grid", gap: 8 }}>
          {order.items.map((it, idx) => {
            const lineTotal =
              Number(it.unitPrice || "0") * Number(it.quantity || 1);

            const key = it.productId + (it.variantId || "");
            const isExpanded = expandedKey === key;

            const info = productInfo[it.productId] ?? null;
            const images = info?.imageUrls ?? [];
            const title = info?.title || it.title;
            const unitPriceDisplay = info?.price
              ? money(Number(info.price), info.currency || it.currency)
              : money(Number(it.unitPrice), it.currency);

            const currentIndex = imageIndex[it.productId] ?? 0;
            const safeIndex =
              images.length > 0
                ? ((currentIndex % images.length) + images.length) %
                  images.length
                : 0;
            const currentImage =
              images.length > 0 ? images[safeIndex] : info?.thumbUrl ?? null;

            const thumb = info?.thumbUrl ?? null;

            const handleToggle = () => {
              setExpandedKey((prev) => (prev === key ? null : key));
            };

            const handlePrev = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (!images.length) return;
              setImageIndex((prev) => ({
                ...prev,
                [it.productId]:
                  (safeIndex - 1 + images.length) % images.length,
              }));
            };

            const handleNext = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (!images.length) return;
              setImageIndex((prev) => ({
                ...prev,
                [it.productId]: (safeIndex + 1) % images.length,
              }));
            };

            return (
              <div
                key={idx}
                style={{
                  ...itemCard,
                  cursor: "pointer",
                }}
                onClick={handleToggle}
              >
                {/* Main row with cover image */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  {/* Cover thumbnail */}
                  <div
                    style={{
                      ...thumbBox,
                      backgroundImage: thumb ? `url(${thumb})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />

                  {/* Text column */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                      title={title}
                    >
                      {title}
                    </div>
                    {it.variant && (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Option: {it.variant}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                      }}
                    >
                      <span>
                        {it.quantity} × {unitPriceDisplay}
                      </span>
                      <span>{money(lineTotal, it.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded content: ONE image + arrows + thumbnails + name + price + description */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid rgba(0,0,0,.06)",
                    }}
                  >
                    {/* Single image with < > controls */}
                    {currentImage && (
                      <div
                        style={{
                          width: "100%",
                          maxWidth: 260,
                          margin: "0 auto 8px",
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "#f2f2f2",
                          position: "relative",
                        }}
                      >
                        <img
                          src={currentImage}
                          alt={title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />

                        {images.length > 1 && (
                          <>
                            <button
                              onClick={handlePrev}
                              style={{ ...navBtn, left: 6 }}
                              type="button"
                            >
                              ‹
                            </button>
                            <button
                              onClick={handleNext}
                              style={{ ...navBtn, right: 6 }}
                              type="button"
                            >
                              ›
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* thumbnail strip under main image */}
                    {images.length > 1 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 6,
                          marginBottom: 8,
                        }}
                      >
                        {images.map((url, i) => (
                          <div
                            key={i}
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageIndex((prev) => ({
                                ...prev,
                                [it.productId]: i,
                              }));
                            }}
                            style={{
                              ...thumbImg,
                              backgroundImage: `url(${url})`,
                              border:
                                i === safeIndex
                                  ? "2px solid #000"
                                  : "1px solid rgba(0,0,0,.15)",
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Name & price */}
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      {title}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    >
                      {unitPriceDisplay}
                    </div>

                    {/* Description */}
                    {info?.description && (
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.85,
                          whiteSpace: "pre-wrap",
                          marginBottom: 4,
                        }}
                      >
                        {info.description}
                      </div>
                    )}

                    {!info && (
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.7,
                        }}
                      >
                        Loading product details…
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

const itemCard: React.CSSProperties = {
  textAlign: "left",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.06)",
  padding: 8,
  background: "var(--tg-theme-bg-color,#fff)",
};

const thumbBox: React.CSSProperties = {
  width: 52,
  height: 52,
  flex: "0 0 52px",
  borderRadius: 10,
  overflow: "hidden",
  background: "#f2f2f2",
};

const navBtn: React.CSSProperties = {
  pointerEvents: "auto",
  border: "none",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 16,
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  cursor: "pointer",
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
};

const thumbImg: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundColor: "#ddd",
  cursor: "pointer",
};

function statusBadge(status: string): React.CSSProperties {
  let bg = "rgba(0,0,0,.06)";
  let color = "#333";
  if (status === "pending") {
    bg = "rgba(255, 193, 7, 0.15)";
    color = "#8a6d00";
  } else if (status === "paid") {
    bg = "rgba(25, 135, 84, 0.15)";
    color = "#155724";
  } else if (status === "shipped") {
    bg = "rgba(13, 110, 253, 0.15)";
    color = "#0b5ed7";
  } else if (status === "completed") {
    bg = "rgba(25, 135, 84, 0.15)";
    color = "#155724";
  } else if (status === "cancelled") {
    bg = "rgba(220, 53, 69, 0.15)";
    color = "#842029";
  }

  return {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    background: bg,
    color,
    textTransform: "capitalize",
  };
}
