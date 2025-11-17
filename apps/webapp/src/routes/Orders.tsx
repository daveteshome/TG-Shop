import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "../components/layout/TopBar";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";
import { OrderListItem } from "../components/orders/OrderListItem";
import { api } from "../lib/api/index";
import { money } from "../lib/format";
import type { Order } from "../lib/types";

type StatusKey = "pending" | "paid" | "shipped" | "completed" | "cancelled" | string;

const STATUS_SECTIONS: { key: StatusKey; label: string }[] = [
  { key: "paid", label: "Paid" },
  { key: "shipped", label: "Shipped" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "pending", label: "Pending" },
];

// Buyer-style row (same idea as BuyerOrders)
type BuyerOrderRow = {
  id: string;
  shortCode: string | null;
  status: string;
  total: string;
  currency: string;
  createdAt: string;
};

function extractSlug(path: string | null | undefined, mode: "buyer" | "owner"): string | null {
  if (!path) return null;

  const trimmed = path.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null" || trimmed === "/") {
    return null;
  }

  const match =
    mode === "buyer"
      ? trimmed.match(/^\/s\/([^/?]+)/)
      : trimmed.match(/^\/shop\/([^/?]+)/);

  const slug = match?.[1]?.trim();
  if (!slug || slug === "undefined" || slug === "null") return null;

  return slug;
}

export default function Orders() {
  const nav = useNavigate();

  // Slugs remembered from previous navigation
  const [buyerSlug, setBuyerSlug] = useState<string | null>(null);
  const [ownerSlug, setOwnerSlug] = useState<string | null>(null);

  // Read slugs once from localStorage
  useEffect(() => {
    try {
      const lastPage = localStorage.getItem("tgshop:lastPage") || "";

      // Try to get buyer path from multiple keys
      let lastBuyerPath =
        localStorage.getItem("tgshop:lastBuyerShopPage") ||
        localStorage.getItem("tgshop:lastShopPage") ||
        "";

      // If still empty, but lastPage looks like a buyer route (/s/...)
      if (!lastBuyerPath && lastPage.startsWith("/s/")) {
        lastBuyerPath = lastPage;
      }

      // Owner path
      let lastOwnerPath = localStorage.getItem("tgshop:lastOwnerShopPage") || "";

      // If no explicit owner path, but lastPage looks like an owner route (/shop/...)
      if (!lastOwnerPath && lastPage.startsWith("/shop/")) {
        lastOwnerPath = lastPage;
      }

      let buyer = extractSlug(lastBuyerPath, "buyer");
      const owner = extractSlug(lastOwnerPath, "owner");

      // if no buyer slug but we *do* have an owner slug, fall back to that
      if (!buyer && owner) {
        buyer = owner;
      }

      setBuyerSlug(buyer);
      setOwnerSlug(owner);

      // Optional debug logs
      console.log("Orders.tsx lastPage =", lastPage);
      console.log("Orders.tsx lastBuyerPath =", lastBuyerPath);
      console.log("Orders.tsx lastOwnerPath =", lastOwnerPath);
      console.log("Orders.tsx buyerSlug =", buyer);
      console.log("Orders.tsx ownerSlug =", owner);
    } catch {
      setBuyerSlug(null);
      setOwnerSlug(null);
    }
  }, []);

  // ---------- Buyer side: Orders You Make ----------
  const [buyerItems, setBuyerItems] = useState<BuyerOrderRow[]>([]);
  const [buyerLoading, setBuyerLoading] = useState(true);
  const [buyerErr, setBuyerErr] = useState<string | null>(null);

  useEffect(() => {
    if (!buyerSlug) {
      setBuyerItems([]);
      setBuyerLoading(false);
      setBuyerErr(null);
      return;
    }

    const qs = new URLSearchParams();
    qs.set("take", "50");
    qs.set("tenant_slug", buyerSlug);

    async function loadBuyer() {
      try {
        setBuyerLoading(true);
        setBuyerErr(null);

        const res: any = await api<any>(`/orders?${qs.toString()}`);
        const raw: any[] = Array.isArray(res) ? res : res?.items ?? [];

        const rows: BuyerOrderRow[] = raw.map((o: any) => ({
          id: String(o.id),
          shortCode: o.shortCode ?? null,
          status: String(o.status ?? "pending"),
          total:
            o.total && typeof (o.total as any).toString === "function"
              ? (o.total as any).toString()
              : String(o.total ?? "0"),
          currency: String(o.currency ?? "ETB"),
          createdAt: o.createdAt ? String(o.createdAt) : new Date().toISOString(),
        }));

        setBuyerItems(rows);
      } catch (e: any) {
        setBuyerErr(e?.message || String(e));
      } finally {
        setBuyerLoading(false);
      }
    }

    void loadBuyer();
  }, [buyerSlug]);

  // ---------- Owner side: Orders You Have ----------
  const [ownerItems, setOwnerItems] = useState<Order[]>([]);
  const [ownerLoading, setOwnerLoading] = useState(true);
  const [ownerErr, setOwnerErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerSlug) {
      setOwnerItems([]);
      setOwnerLoading(false);
      setOwnerErr(null);
      return;
    }

    const qs = new URLSearchParams();
    qs.set("take", "50");

    async function loadOwner() {
      try {
        setOwnerLoading(true);
        setOwnerErr(null);

        const res: any = await api<any>(`/shop/${ownerSlug}/orders?${qs.toString()}`);
        const raw: any[] = Array.isArray(res) ? res : res?.items ?? [];
        setOwnerItems(raw as Order[]);
      } catch (e: any) {
        setOwnerErr(e?.message || String(e));
      } finally {
        setOwnerLoading(false);
      }
    }

    void loadOwner();
  }, [ownerSlug]);

  const [expandedStatus, setExpandedStatus] = useState<StatusKey | null>(null);

  // NEW: dropdown + view-all state
  const [buyerSectionOpen, setBuyerSectionOpen] = useState(true);
  const [ownerSectionOpen, setOwnerSectionOpen] = useState(true);
  const [buyerExpanded, setBuyerExpanded] = useState(false);

  const groupedByStatus = useMemo(() => {
    const byStatus: Record<string, Order[]> = {};
    const list = ownerItems || [];
    for (const o of list) {
      const key = (o.status as StatusKey) || "unknown";
      if (!byStatus[key]) byStatus[key] = [];
      byStatus[key].push(o);
    }
    return byStatus;
  }, [ownerItems]);

  const hasAnyBuyerOrders = buyerItems.length > 0;
  const hasAnyOwnerOrders = ownerItems.length > 0;

  const noBuyerContext = !buyerSlug;
  const noOwnerContext = !ownerSlug;

  return (
    <div>
      <TopBar title="My Orders" />

      {/* If both sides error out, show a generic error */}
      {buyerErr && ownerErr && (
        <ErrorView error={buyerErr || ownerErr || "Failed to load orders."} />
      )}

      <div style={{ paddingBottom: 80 }}>
        {/* ----------- Orders You Make (buyer) ----------- */}
        {!noBuyerContext && (
          <section style={{ padding: "10px 16px 6px 16px" }}>
            {/* Header as dropdown toggle */}
            <button
              type="button"
              onClick={() => setBuyerSectionOpen((v) => !v)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "none",
                border: "none",
                padding: 0,
                marginBottom: 6,
                cursor: "pointer",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15 }}>Orders You Make</span>
              <span style={{ fontSize: 14, opacity: 0.7 }}>
                {buyerSectionOpen ? "▲" : "▼"}
              </span>
            </button>

            {buyerSectionOpen && (
              <>
                {buyerLoading && <Loader />}

                {!buyerLoading && buyerErr && (
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    Failed to load your buyer orders.
                  </div>
                )}

                {!buyerLoading && !buyerErr && !hasAnyBuyerOrders && (
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    You don't have any orders in this shop yet.
                  </div>
                )}

                {!buyerLoading && !buyerErr && hasAnyBuyerOrders && (
                  <>
                    <div style={{ display: "grid", gap: 8 }}>
                      {(buyerExpanded ? buyerItems : buyerItems.slice(0, 5)).map((o) => {
                        const short = o.shortCode || o.id.slice(0, 6);
                        const created = new Date(o.createdAt);
                        const dateStr = created.toLocaleString();

                        return (
                          <button
                            key={o.id}
                            onClick={() => {
                              if (!buyerSlug) return;
                              nav(`/s/${buyerSlug}/orders/${o.id}`);
                            }}
                            style={buyerCard}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span style={{ fontWeight: 700 }}>#{short}</span>
                              <span style={buyerStatusBadge(o.status)}>{o.status}</span>
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                opacity: 0.7,
                              }}
                            >
                              {dateStr}
                            </div>
                            <div style={{ marginTop: 6, fontWeight: 700 }}>
                              {money(Number(o.total || "0"), o.currency)}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {buyerItems.length > 5 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginTop: 4,
                          marginBottom: 4,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setBuyerExpanded((v) => !v)}
                          style={{
                            borderRadius: 999,
                            border: "1px solid rgba(0,0,0,.15)",
                            padding: "4px 12px",
                            fontSize: 12,
                            background: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          {buyerExpanded ? "Show less" : "View all"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        )}

        {/* ----------- Orders You Have (owner) ----------- */}
        {!noOwnerContext && (ownerLoading || ownerErr || hasAnyOwnerOrders) && (
          <section style={{ padding: "10px 16px 6px 16px" }}>
            {/* Header as dropdown toggle */}
            <button
              type="button"
              onClick={() => setOwnerSectionOpen((v) => !v)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "none",
                border: "none",
                padding: 0,
                marginBottom: 6,
                cursor: "pointer",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15 }}>Orders You Have</span>
              <span style={{ fontSize: 14, opacity: 0.7 }}>
                {ownerSectionOpen ? "▲" : "▼"}
              </span>
            </button>

            {ownerSectionOpen && (
              <>
                {ownerLoading && <Loader />}

                {!ownerLoading && ownerErr && (
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    Failed to load orders for your shop.
                  </div>
                )}

                {!ownerLoading && !ownerErr && hasAnyOwnerOrders && (
                  <div>
                    {STATUS_SECTIONS.map(({ key, label }) => {
                      const list = groupedByStatus[key] || [];
                      if (!list.length) return null;

                      const isExpanded = expandedStatus === key;
                      const visible = isExpanded ? list : list.slice(0, 5);

                      return (
                        <section key={key} style={{ paddingTop: 6, paddingBottom: 4 }}>
                          {/* Colorful status header */}
                          <div style={statusHeaderStyle(key, list.length)}>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{label}</span>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                              ({list.length})
                            </span>
                          </div>

                          {/* Orders list (owner mode) */}
                          <div style={{ marginTop: 4 }}>
                            {visible.map((o) => (
                              <OrderListItem
                                key={o.id}
                                order={o}
                                mode="owner"
                                onClick={() => {
                                  if (!ownerSlug) return;
                                  nav(`/shop/${ownerSlug}/orders/${o.id}`);
                                }}
                              />
                            ))}
                          </div>

                          {/* View all / Show less */}
                          {list.length > 5 && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginTop: 4,
                                marginBottom: 4,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedStatus(
                                    isExpanded ? null : (key as StatusKey)
                                  )
                                }
                                style={{
                                  borderRadius: 999,
                                  border: "1px solid rgba(0,0,0,.15)",
                                  padding: "4px 12px",
                                  fontSize: 12,
                                  background: "#fff",
                                  cursor: "pointer",
                                }}
                              >
                                {isExpanded ? "Show less" : "View all"}
                              </button>
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */

function statusHeaderStyle(statusKey: StatusKey, _count: number): React.CSSProperties {
  const key = (statusKey || "").toString().toLowerCase();

  let bg = "#f5f5f5";
  let color = "#555";

  if (key === "pending") {
    bg = "#fff4e5"; // soft yellow
    color = "#b25e09";
  } else if (key === "paid") {
    bg = "#e6f7ff"; // light blue
    color = "#096dd9";
  } else if (key === "shipped") {
    bg = "#f0f5ff"; // soft indigo
    color = "#1d39c4";
  } else if (key === "completed") {
    bg = "#f6ffed"; // light green
    color = "#389e0d";
  } else if (key === "cancelled" || key === "canceled") {
    bg = "#fff1f0"; // light red
    color = "#cf1322";
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    backgroundColor: bg,
    color,
  };
}

const buyerCard: React.CSSProperties = {
  textAlign: "left",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,.08)",
  padding: 10,
  background: "var(--tg-theme-bg-color,#fff)",
  cursor: "pointer",
};

function buyerStatusBadge(status: string): React.CSSProperties {
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
