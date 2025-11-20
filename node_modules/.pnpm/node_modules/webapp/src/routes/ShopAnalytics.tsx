// apps/webapp/src/routes/ShopAnalytics.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api/index";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";

// ========= Types from backend ==========

type OrderItem = {
  productId: string;
  quantity: number;
  unitPrice: string;
};

type Order = {
  id: string;
  status: string;
  total: string;
  currency: string;
  createdAt: string;
  // IMPORTANT: items are NOT returned by /shop/:slug/orders right now
  items?: OrderItem[];
};

type Product = {
  id: string;
  title: string;
  photoUrl?: string | null;
  images?: { webUrl?: string | null }[];
  views?: number;
  addToCart?: number;
};

// ======================================

export default function ShopAnalytics() {
  const { slug } = useParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        setLoading(true);

        const [ordersRes, productsRes] = await Promise.all([
          api<any>(`/shop/${slug}/orders?take=500`, { method: "GET" }),
          api<any>(`/shop/${slug}/products?take=500`, { method: "GET" }),
        ]);

        // Same pattern as ShopOrders: support array OR { items: [...] }
        const finalOrders: Order[] = Array.isArray(ordersRes)
          ? ordersRes
          : ordersRes?.items ?? [];

        const finalProducts: Product[] = Array.isArray(productsRes)
          ? productsRes
          : productsRes?.items ?? [];

        setOrders(finalOrders);
        setProducts(finalProducts);
      } catch (e) {
        console.error(e);
        setErr("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  // ============ COMPUTED METRICS ==============

  const totalSales = useMemo(() => {
    return orders
      .filter((o) => ["paid", "completed"].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total), 0);
  }, [orders]);

  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const dailySales = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      const d = new Date(o.createdAt).toISOString().slice(0, 10);
      if (!map[d]) map[d] = 0;
      map[d] += Number(o.total);
    });
    return Object.entries(map).map(([date, amount]) => ({ date, amount }));
  }, [orders]);

  const orderStatusBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      pending: 0,
      paid: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
    };

    orders.forEach((o) => {
      if (map[o.status] != null) map[o.status] += 1;
    });

    return map;
  }, [orders]);

  const productPerformance = useMemo(() => {
    const sold: Record<string, { units: number; revenue: number }> = {};

    // IMPORTANT: items may not be present on list endpoint → guard
    orders.forEach((o) => {
      const items = o.items ?? [];
      items.forEach((it) => {
        if (!sold[it.productId]) {
          sold[it.productId] = { units: 0, revenue: 0 };
        }
        sold[it.productId].units += it.quantity;
        sold[it.productId].revenue += Number(it.unitPrice) * it.quantity;
      });
    });

    return products.map((p) => ({
      id: p.id,
      title: p.title,
      img: p.images?.[0]?.webUrl || p.photoUrl || null,
      views: p.views || 0,
      addToCart: p.addToCart || 0,
      conversion:
        p.views && p.addToCart ? (p.addToCart / p.views) * 100 : 0,
      units: sold[p.id]?.units || 0,
      revenue: sold[p.id]?.revenue || 0,
    }));
  }, [orders, products]);

  // =============================================

  if (loading) return <Loader />;
  if (err) return <ErrorView error={err} />;

  return (
  <div style={{ padding: 16 }}>
    {/* Top Bar */}
    <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>Analysis</div>
      <div style={{ marginLeft: "auto" }}>
        <button
          style={{
            padding: "6px 14px",
            fontSize: 13,
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
          }}
        >
          Last 7 Days
        </button>
      </div>
    </div>

    {/* KPI CARDS */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <KpiCard title="Total Sales" value={`$${totalSales.toFixed(2)}`} delta={"+15.2%"} positive />
      <KpiCard title="Total Orders" value={totalOrders} delta={"+4.1%"} positive />
      <KpiCard title="Average Order Value" value={`$${avgOrderValue.toFixed(2)}`} delta={"+10.7%"} positive />
      <KpiCard title="Conversion Rate" value={"3.2%"} delta={"-0.3%"} />
    </div>

    {/* SALES OVER TIME */}
    <SectionTitle title="Sales Over Time" />
    <Card>
      <div style={{ height: 120, background: "#eaf2ff", borderRadius: 8 }}></div>
    </Card>

    {/* ORDERS BREAKDOWN + DAILY ORDER COUNT */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginTop: 16,
        marginBottom: 16,
      }}
    >
      <Card>
        <SectionSmall title="Orders Breakdown" />
        <div style={{ height: 140, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "conic-gradient(#4285f4 0% 40%, #66aaff 40% 65%, #99cfff 65% 85%, #cde5ff 85% 100%)",
            }}
          />
        </div>
      </Card>

      <Card>
        <SectionSmall title="Daily Order Count" />
        <div style={{ height: 140, display: "flex", alignItems: "flex-end", gap: 6 }}>
          {["M", "T", "W", "T", "F"].map((day, idx) => (
            <div key={day} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  height: (idx + 2) * 18,
                  background: "#4a90e2",
                  borderRadius: 6,
                }}
              ></div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{day}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>

    {/* PRODUCT PERFORMANCE TABLE */}
    <SectionTitle title="Product Performance" />
    <Card>
      <table style={{ width: "100%", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", opacity: 0.6 }}>
            <th>Product</th>
            <th>Views</th>
            <th>Add-to-Crt</th>
            <th>Units</th>
          </tr>
        </thead>
        <tbody>
          {productPerformance.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
              <td style={{ padding: "6px 0" }}>{p.title}</td>
              <td>{p.views}</td>
              <td>{p.addToCart}</td>
              <td>{p.units}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>

    {/* INSIGHTS + FUNNEL */}
    <div
      style={{
        marginTop: 18,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
      }}
    >
      <Card>
        <SectionSmall title="Top Insights" />
        <div style={{ fontSize: 13, lineHeight: "18px" }}>
          Best-selling product: <b>Product A</b>
          <br />
          Cart abandonment increased by 8%
        </div>
      </Card>

      <Card>
        <SectionSmall title="Customer Behavior" />
        <div
          style={{
            width: "100%",
            height: 150,
            background: "#cfe0ff",
            clipPath: "polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)",
          }}
        ></div>
      </Card>
    </div>
  </div>
);

}

// ========== Reusable UI ==========

function Card({ children }: { children: any }) {
  return (
    <div
      style={{
        background: "#fff",
        padding: 14,
        borderRadius: 12,
        border: "1px solid #eee",
      }}
    >
      {children}
    </div>
  );
}

function KpiCard({
  title,
  value,
  delta,
  positive,
}: {
  title: string;
  value: any;
  delta?: string;
  positive?: boolean;
}) {
  return (
    <div
      style={{
        background: "#fff",
        padding: 14,
        borderRadius: 12,
        border: "1px solid #eee",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{value}</div>

      {delta && (
        <div
          style={{
            fontSize: 12,
            marginTop: 6,
            color: positive ? "#0c8f2a" : "#c0392b",
          }}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</div>;
}

function SectionSmall({ title }: { title: string }) {
  return <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{title}</div>;
}
