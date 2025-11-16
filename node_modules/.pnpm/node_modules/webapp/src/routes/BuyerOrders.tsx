import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

export default function BuyerOrders() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();

  const [items, setItems] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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

        // backend returns plain array, but support { items: [...] } just in case
        const raw: any[] = Array.isArray(res) ? res : res?.items ?? [];

        const rows: OrderRow[] = raw.map((o: any) => ({
          id: String(o.id),
          shortCode: o.shortCode ?? null,
          status: String(o.status ?? "pending"),
          total:
            o.total && typeof (o.total as any).toString === "function"
              ? (o.total as any).toString()
              : String(o.total ?? "0"),
          currency: String(o.currency ?? "ETB"),
          createdAt: o.createdAt
            ? String(o.createdAt)
            : new Date().toISOString(),
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

  if (loading) return <Loader />;
  if (err) return <ErrorView error={err} />;

  if (!items.length) {
    return (
      <div style={{ padding: 16, opacity: 0.7 }}>
        You don't have any orders in this shop yet.
      </div>
    );
  }

  return (
    <div style={{ padding: 10, paddingBottom: 80 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>My Orders</div>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((o) => {
          const short = o.shortCode || o.id.slice(0, 6);
          const created = new Date(o.createdAt);
          const dateStr = created.toLocaleString();

          return (
            <button
              key={o.id}
              onClick={() => nav(`/s/${slug}/orders/${o.id}`)}
              style={card}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>#{short}</span>
                <span style={statusBadge(o.status)}>{o.status}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>
                {dateStr}
              </div>
              <div style={{ marginTop: 6, fontWeight: 700 }}>
                {money(Number(o.total || "0"), o.currency)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  textAlign: "left",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,.08)",
  padding: 10,
  background: "var(--tg-theme-bg-color,#fff)",
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
