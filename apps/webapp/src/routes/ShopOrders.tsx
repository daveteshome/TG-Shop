import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TopBar } from "../components/layout/TopBar";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";
import { OrderListItem } from "../components/orders/OrderListItem";
import { useAsync } from "../lib/hooks/useAsync";
import { api } from "../lib/api/index";
import type { Order } from "../lib/types";

type StatusKey = "pending" | "paid" | "shipped" | "completed" | "cancelled" | string;

const STATUS_SECTIONS: { key: StatusKey; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "shipped", label: "Shipped" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function ShopOrders() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();

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

  const [expandedStatus, setExpandedStatus] = React.useState<StatusKey | null>(null);

  const groupedByStatus = React.useMemo(() => {
    const byStatus: Record<string, Order[]> = {};
    const list = q.data || [];
    for (const o of list) {
      const key = (o.status as StatusKey) || "unknown";
      if (!byStatus[key]) byStatus[key] = [];
      byStatus[key].push(o);
    }
    return byStatus;
  }, [q.data]);

  const hasAnyOrders = (q.data || []).length > 0;

  return (
    <div>
      <TopBar title="Shop Orders" />

      {q.loading ? <Loader /> : <ErrorView error={q.error} />}

      {!q.loading && !q.error && !hasAnyOrders && (
        <div style={{ opacity: 0.7, padding: 16 }}>No orders yet.</div>
      )}

      {!q.loading && hasAnyOrders && (
        <div>
          {STATUS_SECTIONS.map(({ key, label }) => {
            const list = groupedByStatus[key] || [];
            if (!list.length) return null;

            const isExpanded = expandedStatus === key;
            const visible = isExpanded ? list : list.slice(0, 5);

            return (
              <section key={key} style={{ padding: "10px 16px 6px 16px" }}>
                {/* Colorful status header */}
                <div style={statusHeaderStyle(key, list.length)}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>({list.length})</span>
                </div>

                {/* Orders list */}
                <div style={{ marginTop: 4 }}>
                  {visible.map((o) => (
                    <OrderListItem
                      key={o.id}
                      order={o}
                      mode="owner"
                      onClick={() => {
                        if (!slug) return;
                        nav(`/shop/${slug}/orders/${o.id}`);
                      }}
                    />
                  ))}
                </div>

                {/* View all / Show less at bottom-right */}
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
                        setExpandedStatus(isExpanded ? null : (key as StatusKey))
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
    </div>
  );
}

function statusHeaderStyle(statusKey: StatusKey, count: number): React.CSSProperties {
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
