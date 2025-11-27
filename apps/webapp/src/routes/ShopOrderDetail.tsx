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
  // Payment information
  paymentMethod?: string | null;
  paymentProof?: {
    transactionRef?: string;
    receiptImageId?: string;
    receiptWebUrl?: string;
  } | null;
  paymentStatus?: string | null;
  // Delivery information
  shipLine1?: string | null;
  shipLine2?: string | null;
  shipCity?: string | null;
  shipRegion?: string | null;
  shipCountry?: string | null;
  shipPostal?: string | null;
  // Customer info
  user?: {
    name?: string | null;
    username?: string | null;
    phone?: string | null;
  } | null;
};

type ProductBrief = {
  thumbUrl: string | null; // cover image (first)
  imageUrls: string[]; // all images for slider
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

  // status update
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // productId -> product brief (images + basic info)
  const [productInfo, setProductInfo] = useState<Record<string, ProductBrief | null>>({});

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
            it.unitPrice && typeof (it.unitPrice as any).toString === "function"
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
          createdAt: res.createdAt ? String(res.createdAt) : new Date().toISOString(),
          items,
          // Payment info
          paymentMethod: res.paymentMethod ?? null,
          paymentProof: res.paymentProof ?? null,
          paymentStatus: res.paymentStatus ?? null,
          // Delivery info
          shipLine1: res.shipLine1 ?? null,
          shipLine2: res.shipLine2 ?? null,
          shipCity: res.shipCity ?? null,
          shipRegion: res.shipRegion ?? null,
          shipCountry: res.shipCountry ?? null,
          shipPostal: res.shipPostal ?? null,
          // Customer info
          user: res.user ?? null,
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

  /* ---------------- Status change handler ---------------- */

  async function handleStatusChange(nextStatus: string) {
    if (!order || !slug || !orderId) return;
    if (nextStatus === order.status) return;

    // Confirmation for critical actions
    if (nextStatus === "completed") {
      const confirmed = window.confirm(
        "Mark this order as completed? This action confirms the order has been delivered and finished."
      );
      if (!confirmed) return;
    }

    if (nextStatus === "cancelled") {
      const confirmed = window.confirm(
        "Cancel this order? This will reject the order."
      );
      if (!confirmed) return;
    }

    setStatusSaving(true);
    setStatusErr(null);
    setShowStatusMenu(false);

    const prevStatus = order.status;

    // Optimistic update
    setOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev));

    try {
      await api<any>(`/shop/${slug}/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ status: nextStatus }),
      });
    } catch (e: any) {
      // revert on failure
      setOrder((prev) => (prev ? { ...prev, status: prevStatus } : prev));
      setStatusErr(e?.message || "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }

  /* ---------------- Load product info (images + details) ---------------- */

  async function loadProductInfo(productId: string, currentSlug: string) {
    // already loaded (even if null)
    if (productInfo[productId] !== undefined) return;

    try {
      const res: any = await api<any>(`/shop/${currentSlug}/products/${productId}`);

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
          typeof rawProduct?.description === "string" ? rawProduct.description : null,
        price:
          rawProduct?.price != null
            ? String(
                typeof rawProduct.price.toString === "function"
                  ? rawProduct.price.toString()
                  : rawProduct.price
              )
            : null,
        currency: (rawProduct?.currency && String(rawProduct.currency)) || null,
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

  const paymentMethod = order.paymentMethod || "COD";
  const isBankTransfer = paymentMethod === "BANK";
  const isCOD = paymentMethod === "COD";
  const isPending = order.status === "pending";
  const isPaid = order.status === "paid";
  const isShipped = order.status === "shipped";

  // Receipt image URL (provided by backend)
  const receiptUrl = order.paymentProof?.receiptWebUrl || null;

  // Customer name
  const customerName = order.user
    ? order.user.name ||
      order.user.username ||
      "Customer"
    : "Customer";

  // Delivery address
  const deliveryAddress = [
    order.shipLine1,
    order.shipLine2,
    order.shipCity,
    order.shipRegion,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <TopBar title={`Order #${short}`} />
      <div style={{ padding: 10, paddingBottom: 80 }}>
        {/* Header summary */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, opacity: 0.7 }}>Order</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>#{short}</div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>{dateStr}</div>

          {/* Status badge */}
          <div style={{ marginTop: 8 }}>
            <span style={getStatusBadgeStyle(order.status)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>

          {statusErr && (
            <div style={{ fontSize: 11, color: "#cf1322", marginTop: 6, padding: "6px 10px", background: "#fff1f0", borderRadius: 6 }}>
              {statusErr}
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div style={sectionCard}>
          <div style={sectionTitle}>👤 Customer Information</div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            <strong>Name:</strong> {customerName}
          </div>
          {order.user?.phone && (
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              <strong>Phone:</strong> {order.user.phone}
            </div>
          )}
          {order.user?.username && (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              @{order.user.username}
            </div>
          )}
        </div>

        {/* Delivery Address */}
        {deliveryAddress && (
          <div style={sectionCard}>
            <div style={sectionTitle}>📍 Delivery Address</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {deliveryAddress}
            </div>
          </div>
        )}

        {/* Payment Information */}
        <div style={sectionCard}>
          <div style={sectionTitle}>💳 Payment Information</div>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            <strong>Method:</strong>{" "}
            {isCOD ? "💵 Cash on Delivery" : "🏦 Bank Transfer / Mobile Money"}
          </div>

          {isBankTransfer && order.paymentProof?.transactionRef && (
            <>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <strong>Transaction Ref:</strong>{" "}
                <span style={{ fontFamily: "monospace", background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>
                  {order.paymentProof.transactionRef}
                </span>
              </div>

              {receiptUrl && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Payment Receipt:
                  </div>
                  <img
                    src={receiptUrl}
                    alt="Payment receipt"
                    style={{
                      width: "100%",
                      maxWidth: 300,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(receiptUrl, "_blank")}
                  />
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                    Click to view full size
                  </div>
                </div>
              )}

              {order.paymentStatus && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <strong>Payment Status:</strong>{" "}
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: order.paymentStatus === "pending" ? "#fff4e5" : "#f6ffed",
                    color: order.paymentStatus === "pending" ? "#b25e09" : "#389e0d",
                  }}>
                    {order.paymentStatus}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Order Total & Note */}
        <div style={sectionCard}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <span>Total</span>
            <span>{money(Number(order.total || "0"), order.currency)}</span>
          </div>
          {order.note && (
            <div
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid rgba(0,0,0,.06)",
                fontSize: 12,
                opacity: 0.8,
                whiteSpace: "pre-wrap",
              }}
            >
              <strong>Note:</strong> {order.note}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ marginBottom: 12 }}>
          {/* Pending + Bank Transfer: Verify or Reject Payment */}
          {isPending && isBankTransfer && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleStatusChange("paid")}
                disabled={statusSaving}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 8,
                  border: "none",
                  background: statusSaving ? "#999" : "#10B981",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: statusSaving ? "default" : "pointer",
                }}
              >
                {statusSaving ? "Processing..." : "✓ Verify Payment"}
              </button>
              <button
                onClick={() => handleStatusChange("cancelled")}
                disabled={statusSaving}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 8,
                  border: "none",
                  background: statusSaving ? "#999" : "#EF4444",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: statusSaving ? "default" : "pointer",
                }}
              >
                {statusSaving ? "Processing..." : "✕ Reject"}
              </button>
            </div>
          )}

          {/* Pending + COD: Mark as Shipped */}
          {isPending && isCOD && (
            <button
              onClick={() => handleStatusChange("shipped")}
              disabled={statusSaving}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: statusSaving ? "#999" : "#3B82F6",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: statusSaving ? "default" : "pointer",
              }}
            >
              {statusSaving ? "Processing..." : "📦 Mark as Shipped"}
            </button>
          )}

          {/* Paid: Mark as Shipped */}
          {isPaid && (
            <button
              onClick={() => handleStatusChange("shipped")}
              disabled={statusSaving}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: statusSaving ? "#999" : "#3B82F6",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: statusSaving ? "default" : "pointer",
              }}
            >
              {statusSaving ? "Processing..." : "📦 Mark as Shipped"}
            </button>
          )}

          {/* Shipped: Mark as Completed */}
          {isShipped && (
            <button
              onClick={() => handleStatusChange("completed")}
              disabled={statusSaving}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: statusSaving ? "#999" : "#10B981",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: statusSaving ? "default" : "pointer",
              }}
            >
              {statusSaving ? "Processing..." : "✓ Mark as Completed"}
            </button>
          )}

          {/* Change Status Menu - for other transitions */}
          {!statusSaving && order.status !== "completed" && order.status !== "cancelled" && (
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fff",
                color: "#666",
                fontWeight: 500,
                fontSize: 13,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              {showStatusMenu ? "▲ Hide Options" : "▼ More Status Options"}
            </button>
          )}

          {/* Status Options Dropdown */}
          {showStatusMenu && (
            <div style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#f9f9f9",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#666" }}>
                Change status to:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {order.status !== "shipped" && (
                  <button
                    onClick={() => handleStatusChange("shipped")}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #3B82F6",
                      background: "#fff",
                      color: "#3B82F6",
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    📦 Shipped
                  </button>
                )}
                {order.status === "pending" && isBankTransfer && (
                  <button
                    onClick={() => handleStatusChange("paid")}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #10B981",
                      background: "#fff",
                      color: "#10B981",
                      fontSize: 13,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    ✓ Paid (Payment Verified)
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange("cancelled")}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #EF4444",
                    background: "#fff",
                    color: "#EF4444",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  ✕ Cancel Order
                </button>
              </div>
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
                ? ((currentIndex % images.length) + images.length) % images.length
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
                [it.productId]: (safeIndex - 1 + images.length) % images.length,
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

                {/* Expanded content: image + arrows + thumbnails + name + price + description */}
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

/* ---------- Helper Functions ---------- */

function getStatusBadgeStyle(status: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  };

  switch (status.toLowerCase()) {
    case "pending":
      return { ...baseStyle, background: "#fff4e5", color: "#b25e09" };
    case "paid":
      return { ...baseStyle, background: "#e6f7ff", color: "#096dd9" };
    case "shipped":
      return { ...baseStyle, background: "#f0f5ff", color: "#1d39c4" };
    case "completed":
      return { ...baseStyle, background: "#f6ffed", color: "#389e0d" };
    case "cancelled":
      return { ...baseStyle, background: "#fff1f0", color: "#cf1322" };
    default:
      return { ...baseStyle, background: "#f5f5f5", color: "#555" };
  }
}

/* ---------- Styles ---------- */

const sectionCard: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,.06)",
  padding: 12,
  marginBottom: 12,
  background: "#fff",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  marginBottom: 8,
  color: "#111",
};

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
