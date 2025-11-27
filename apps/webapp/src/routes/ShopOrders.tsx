// apps/webapp/src/routes/ShopOrders.tsx
import React, { useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";
import { OrderListItem } from "../components/orders/OrderListItem";
import { useAsync } from "../lib/hooks/useAsync";
import { api } from "../lib/api/index";
import type { Order } from "../lib/types";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  pending: { label: "Pending", bg: "#FEF3C7", text: "#92400E", icon: "⏳" },
  confirmed: { label: "Confirmed", bg: "#DBEAFE", text: "#1E40AF", icon: "✓" },
  paid: { label: "Paid", bg: "#D1FAE5", text: "#065F46", icon: "💳" },
  shipped: { label: "Shipped", bg: "#E0E7FF", text: "#3730A3", icon: "🚚" },
  delivered: { label: "Delivered", bg: "#D1FAE5", text: "#065F46", icon: "✓" },
  completed: { label: "Completed", bg: "#D1FAE5", text: "#065F46", icon: "✓" },
  cancelled: { label: "Cancelled", bg: "#FEE2E2", text: "#991B1B", icon: "✕" },
};

export default function ShopOrders() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const loc = useLocation();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["pending", "confirmed", "paid"])
  );

  const q = useAsync<Order[]>(
    async () => {
      if (!slug) return [];
      const qs = new URLSearchParams();
      qs.set("take", "50");
      const res: any = await api<any>(`/shop/${slug}/orders?${qs.toString()}`);
      const raw: any[] = Array.isArray(res) ? res : res?.items ?? [];
      return raw as Order[];
    },
    [slug]
  );

  const params = new URLSearchParams(loc.search || "");
  const searchQ = (params.get("q") || "").trim().toLowerCase();

  const filteredList = useMemo(() => {
    const list = q.data || [];
    if (!searchQ) return list;
    return list.filter((o) => {
      const id = o.id.toLowerCase();
      const status = (o.status || "").toLowerCase();
      const notes = String((o as any).notes || "").toLowerCase();
      const addr = String((o as any).shippingAddress || "").toLowerCase();
      const createdAtStr = new Date((o as any).createdAt || "").toLocaleString().toLowerCase();
      return (
        id.includes(searchQ) ||
        status.includes(searchQ) ||
        notes.includes(searchQ) ||
        addr.includes(searchQ) ||
        createdAtStr.includes(searchQ)
      );
    });
  }, [q.data, searchQ]);

  const groupedByStatus = useMemo(() => {
    const byStatus: Record<string, Order[]> = {};
    for (const o of filteredList) {
      const key = (o.status as string) || "unknown";
      if (!byStatus[key]) byStatus[key] = [];
      byStatus[key].push(o);
    }
    return byStatus;
  }, [filteredList]);

  const toggleSection = (status: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  if (q.loading) return <Loader />;
  if (q.error) return <ErrorView error={q.error} />;

  const hasAnyOrders = (q.data || []).length > 0;
  const hasAnyVisibleOrders = filteredList.length > 0;

  if (!hasAnyOrders) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📦</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No Orders Yet</div>
        <div style={{ fontSize: 14, color: "#666" }}>Orders from customers will appear here</div>
      </div>
    );
  }

  if (!hasAnyVisibleOrders) {
    return (
      <div style={{ padding: 16, opacity: 0.7 }}>No orders match your search.</div>
    );
  }

  const statuses = Object.keys(groupedByStatus);

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        {statuses.map((status) => {
          const orders = groupedByStatus[status];
          const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
          const isExpanded = expandedSections.has(status);

          return (
            <div
              key={status}
              style={{
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                overflow: "hidden",
              }}
            >
              {/* Status Header - Clickable */}
              <div
                onClick={() => toggleSection(status)}
                style={{
                  padding: "12px 16px",
                  background: config.bg,
                  borderBottom: isExpanded ? "1px solid #E5E7EB" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{config.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: config.text }}>
                      {config.label}
                    </div>
                    <div style={{ fontSize: 11, color: config.text, opacity: 0.8 }}>
                      {orders.length} {orders.length === 1 ? "order" : "orders"}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: config.text,
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s",
                  }}
                >
                  ▼
                </div>
              </div>

              {/* Orders List */}
              {isExpanded && (
                <div>
                  {orders.map((o, idx) => (
                    <OrderListItem
                      key={o.id}
                      order={o}
                      mode="owner"
                      onClick={() => nav(`/shop/${slug}/orders/${o.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
