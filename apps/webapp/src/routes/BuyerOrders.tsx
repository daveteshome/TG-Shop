// apps/webapp/src/routes/BuyerOrders.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";
import { money } from "../lib/format";

type OrderRow = {
  id: string;
  shortCode: string | null;
  status: string;
  total: string;
  currency: string;
  createdAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  pending: { label: "Pending", bg: "#FEF3C7", text: "#92400E", icon: "⏳" },
  confirmed: { label: "Confirmed", bg: "#DBEAFE", text: "#1E40AF", icon: "✓" },
  paid: { label: "Paid", bg: "#D1FAE5", text: "#065F46", icon: "💳" },
  shipped: { label: "Shipped", bg: "#E0E7FF", text: "#3730A3", icon: "🚚" },
  delivered: { label: "Delivered", bg: "#D1FAE5", text: "#065F46", icon: "✓" },
  completed: { label: "Completed", bg: "#D1FAE5", text: "#065F46", icon: "✓" },
  cancelled: { label: "Cancelled", bg: "#FEE2E2", text: "#991B1B", icon: "✕" },
};

export default function BuyerOrders() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const loc = useLocation();

  const [items, setItems] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["pending", "confirmed", "paid"]));

  useEffect(() => {
    if (!slug) return;

    const qs = new URLSearchParams();
    qs.set("take", "50");
    qs.set("tenant_slug", slug);

    async function load() {
      try {
        setLoading(true);
        setErr(null);
        const res: any = await api<any>(`/orders?${qs.toString()}`);
        const raw: any[] = Array.isArray(res) ? res : res?.items ?? [];
        const rows: OrderRow[] = raw.map((o: any) => ({
          id: String(o.id),
          shortCode: o.shortCode ?? null,
          status: String(o.status ?? "pending"),
          total: o.total?.toString() ?? String(o.total ?? "0"),
          currency: String(o.currency ?? "ETB"),
          createdAt: o.createdAt ? String(o.createdAt) : new Date().toISOString(),
        }));
        setItems(rows);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [slug]);

  const params = new URLSearchParams(loc.search || "");
  const q = (params.get("q") || "").trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!q) return items;
    return items.filter((o) => {
      const short = (o.shortCode || "").toLowerCase();
      const id = o.id.toLowerCase();
      const status = o.status.toLowerCase();
      const dateStr = new Date(o.createdAt).toLocaleString().toLowerCase();
      return short.includes(q) || id.includes(q) || status.includes(q) || dateStr.includes(q);
    });
  }, [items, q]);

  const groupedByStatus = useMemo(() => {
    const byStatus: Record<string, OrderRow[]> = {};
    for (const o of filteredItems) {
      const key = o.status || "unknown";
      if (!byStatus[key]) byStatus[key] = [];
      byStatus[key].push(o);
    }
    return byStatus;
  }, [filteredItems]);

  const toggleSection = (status: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  if (loading) return <Loader />;
  if (err) return <ErrorView error={err} />;

  if (!items.length) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📦</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No Orders Yet</div>
        <div style={{ fontSize: 14, color: "#666" }}>Your orders will appear here</div>
      </div>
    );
  }

  const statuses = Object.keys(groupedByStatus);

  return (
    <div style={{ paddingBottom: 80 }}>
      {statuses.length === 0 ? (
        <div style={{ padding: 16, opacity: 0.7 }}>No orders match your search.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
          {statuses.map((status) => {
            const orders = groupedByStatus[status];
            const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
            const isExpanded = expandedSections.has(status);

            return (
              <div key={status} style={{
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                overflow: "hidden",
              }}>
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
                  <div style={{
                    fontSize: 16,
                    color: config.text,
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.3s",
                  }}>
                    ▼
                  </div>
                </div>

                {/* Orders List */}
                {isExpanded && (
                  <div>
                    {orders.map((o, idx) => {
                      const short = o.shortCode || o.id.slice(0, 6);
                      const date = new Date(o.createdAt).toLocaleDateString();
                      return (
                        <div
                          key={o.id}
                          onClick={() => nav(`/s/${slug}/orders/${o.id}`)}
                          style={{
                            padding: "12px 16px",
                            borderBottom: idx === orders.length - 1 ? "none" : "1px solid #F3F4F6",
                            cursor: "pointer",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                                #{short}
                              </div>
                              <div style={{ fontSize: 12, color: "#6B7280" }}>{date}</div>
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>
                              {money(Number(o.total || "0"), o.currency)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
