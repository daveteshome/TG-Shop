// apps/webapp/src/routes/ShopAnalytics.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  items?: OrderItem[];
};

type Product = {
  id: string;
  title: string;
  photoUrl?: string | null;
  images?: { webUrl?: string | null }[];
  views?: number;
  addToCart?: number;
  stock?: number | null;
  price?: number;
  currency?: string;
};

type DateRange = '7d' | '30d' | '90d' | 'all';

// ======================================

export default function ShopAnalytics() {
  const { slug } = useParams();
  const nav = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [sortBy, setSortBy] = useState<'revenue' | 'units' | 'views' | 'conversion'>('revenue');

  useEffect(() => {
    window.scrollTo(0, 0);
    
    if (!slug) return;

    async function load() {
      try {
        setLoading(true);

        const [ordersRes, productsRes] = await Promise.all([
          api<any>(`/shop/${slug}/orders?take=100`, { method: "GET" }),
          api<any>(`/shop/${slug}/products?take=100`, { method: "GET" }),
        ]);

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

  // ============ DATE FILTERING ==============
  
  const getDateCutoff = (range: DateRange): Date => {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'all':
      default:
        return new Date(0);
    }
  };

  const filteredOrders = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    return orders.filter(o => new Date(o.createdAt) >= cutoff);
  }, [orders, dateRange]);

  const previousPeriodOrders = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    const periodLength = Date.now() - cutoff.getTime();
    const previousCutoff = new Date(cutoff.getTime() - periodLength);
    
    return orders.filter(o => {
      const date = new Date(o.createdAt);
      return date >= previousCutoff && date < cutoff;
    });
  }, [orders, dateRange]);

  // ============ COMPUTED METRICS ==============

  const totalSales = useMemo(() => {
    return filteredOrders
      .filter((o) => ["paid", "completed"].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total), 0);
  }, [filteredOrders]);

  const previousSales = useMemo(() => {
    return previousPeriodOrders
      .filter((o) => ["paid", "completed"].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total), 0);
  }, [previousPeriodOrders]);

  const salesDelta = previousSales > 0 
    ? ((totalSales - previousSales) / previousSales * 100).toFixed(1)
    : totalSales > 0 ? '+100' : '0';

  const totalOrdersCount = filteredOrders.length;
  const previousOrdersCount = previousPeriodOrders.length;
  const ordersDelta = previousOrdersCount > 0
    ? ((totalOrdersCount - previousOrdersCount) / previousOrdersCount * 100).toFixed(1)
    : totalOrdersCount > 0 ? '+100' : '0';

  const avgOrderValue = totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0;
  const previousAvgOrderValue = previousOrdersCount > 0 
    ? previousPeriodOrders.reduce((sum, o) => sum + Number(o.total), 0) / previousOrdersCount 
    : 0;
  const avgOrderDelta = previousAvgOrderValue > 0
    ? ((avgOrderValue - previousAvgOrderValue) / previousAvgOrderValue * 100).toFixed(1)
    : avgOrderValue > 0 ? '+100' : '0';

  const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalAddToCart = products.reduce((sum, p) => sum + (p.addToCart || 0), 0);
  const conversionRate = totalViews > 0 ? (totalAddToCart / totalViews * 100).toFixed(1) : '0';

  const dailySales = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const d = new Date(o.createdAt).toISOString().slice(0, 10);
      if (!map[d]) map[d] = 0;
      map[d] += Number(o.total);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));
  }, [filteredOrders]);

  const orderStatusBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      pending: 0,
      paid: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
    };

    filteredOrders.forEach((o) => {
      if (map[o.status] != null) map[o.status] += 1;
      else map[o.status] = 1;
    });

    return map;
  }, [filteredOrders]);

  const productPerformance = useMemo(() => {
    const sold: Record<string, { units: number; revenue: number }> = {};

    filteredOrders.forEach((o) => {
      const items = o.items ?? [];
      items.forEach((it) => {
        if (!sold[it.productId]) {
          sold[it.productId] = { units: 0, revenue: 0 };
        }
        sold[it.productId].units += it.quantity;
        sold[it.productId].revenue += Number(it.unitPrice) * it.quantity;
      });
    });

    const performance = products.map((p) => ({
      id: p.id,
      title: p.title,
      img: p.images?.[0]?.webUrl || p.photoUrl || null,
      views: p.views || 0,
      addToCart: p.addToCart || 0,
      conversion: p.views && p.addToCart ? (p.addToCart / p.views) * 100 : 0,
      units: sold[p.id]?.units || 0,
      revenue: sold[p.id]?.revenue || 0,
      stock: p.stock ?? 0,
      price: p.price || 0,
    }));

    // Sort by selected metric
    return performance.sort((a, b) => {
      switch (sortBy) {
        case 'revenue': return b.revenue - a.revenue;
        case 'units': return b.units - a.units;
        case 'views': return b.views - a.views;
        case 'conversion': return b.conversion - a.conversion;
        default: return 0;
      }
    });
  }, [filteredOrders, products, sortBy]);

  const topProducts = useMemo(() => {
    return productPerformance.slice(0, 5);
  }, [productPerformance]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5);
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter(p => (p.stock ?? 0) === 0);
  }, [products]);

  const currency = filteredOrders[0]?.currency || 'USD';

  // =============================================

  if (loading) return <Loader />;
  if (err) return <ErrorView error={err} />;

  return (
    <div style={{ padding: 16, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Analytics</h1>
        <p style={{ fontSize: 14, color: "#6B7280" }}>Track your shop's performance and insights</p>
      </div>

      {/* Quick Actions */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", 
        gap: 12, 
        marginBottom: 20 
      }}>
        <button
          onClick={() => nav(`/shop/${slug}/inventory-history`)}
          style={{
            padding: "12px 16px",
            fontSize: 14,
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
            color: "#fff",
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: 18 }}>📦</span>
          <span>Inventory History</span>
        </button>
        
        <button
          onClick={() => nav(`/shop/${slug}/team-performance`)}
          style={{
            padding: "12px 16px",
            fontSize: 14,
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
            color: "#fff",
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: 18 }}>👥</span>
          <span>Team Performance</span>
        </button>
      </div>

      {/* Date Range Filter */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", marginBottom: 8 }}>
          Time Period
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['7d', '30d', '90d', 'all'] as DateRange[]).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                borderRadius: 8,
                border: dateRange === range ? "2px solid #6366F1" : "1px solid #E5E7EB",
                background: dateRange === range ? "#EEF2FF" : "#fff",
                color: dateRange === range ? "#6366F1" : "#6B7280",
                fontWeight: dateRange === range ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : range === '90d' ? 'Last 90 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <KpiCard 
          title="Total Sales" 
          value={`${totalSales.toFixed(2)} ${currency}`} 
          delta={`${Number(salesDelta) >= 0 ? '+' : ''}${salesDelta}%`} 
          positive={Number(salesDelta) >= 0} 
        />
        <KpiCard 
          title="Total Orders" 
          value={totalOrdersCount} 
          delta={`${Number(ordersDelta) >= 0 ? '+' : ''}${ordersDelta}%`} 
          positive={Number(ordersDelta) >= 0} 
        />
        <KpiCard 
          title="Avg Order Value" 
          value={`${avgOrderValue.toFixed(2)} ${currency}`} 
          delta={`${Number(avgOrderDelta) >= 0 ? '+' : ''}${avgOrderDelta}%`} 
          positive={Number(avgOrderDelta) >= 0} 
        />
        <KpiCard 
          title="Conversion Rate" 
          value={`${conversionRate}%`} 
          subtitle={`${totalAddToCart} / ${totalViews} views`}
        />
      </div>

      {/* ALERTS */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          <AlertCard>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Inventory Alerts</span>
            </div>
            {outOfStockProducts.length > 0 && (
              <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 4 }}>
                🔴 {outOfStockProducts.length} product{outOfStockProducts.length !== 1 ? 's' : ''} out of stock
              </div>
            )}
            {lowStockProducts.length > 0 && (
              <div style={{ fontSize: 13, color: '#f59e0b' }}>
                🟡 {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} low on stock (≤5 units)
              </div>
            )}
          </AlertCard>
        </div>
      )}

      {/* TOP PRODUCTS */}
      {topProducts.length > 0 && (
        <>
          <SectionTitle title="Top Products" />
          {/* Outer scroll container */}
          <div style={{
            overflowX: 'auto',
            paddingBottom: 4,
            WebkitOverflowScrolling: 'touch',
            marginBottom: 16,
          }}>
            {/* Inner flex row */}
            <div style={{ display: 'flex', gap: 12 }}>
              {topProducts.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => nav(`/shop/${slug}/p/${p.id}`)}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #eee',
                    padding: 12,
                    cursor: 'pointer',
                    position: 'relative',
                    flex: '0 0 calc((100% - 24px) / 2.2)', // 2 full cards + 20% of third
                    minWidth: 140,
                    maxWidth: 180,
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: '#4a90e2',
                    color: '#fff',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    zIndex: 1,
                  }}>
                    {idx + 1}
                  </div>
                  {p.img && (
                    <div style={{
                      width: '100%',
                      height: 100,
                      borderRadius: 8,
                      backgroundImage: `url(${p.img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: '#f5f5f5',
                      marginBottom: 8,
                    }} />
                  )}
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {p.units} sold • {p.revenue.toFixed(2)} {currency}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* SALES OVER TIME */}
      <SectionTitle title="Sales Over Time" />
      <Card>
        <SimpleLineChart data={dailySales} height={140} />
      </Card>

      {/* ORDERS BREAKDOWN + DAILY ORDER COUNT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginTop: 16,
          marginBottom: 16,
        }}
      >
        <Card>
          <SectionSmall title="Orders by Status" />
          <SimpleDonutChart data={orderStatusBreakdown} />
        </Card>

        <Card>
          <SectionSmall title="Daily Orders" />
          <SimpleBarChart data={dailySales.slice(-7)} />
        </Card>
      </div>

      {/* PRODUCT PERFORMANCE TABLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionTitle title="Product Performance" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{
            padding: '6px 10px',
            fontSize: 13,
            borderRadius: 6,
            border: '1px solid #ddd',
            background: '#fff',
          }}
        >
          <option value="revenue">Sort by Revenue</option>
          <option value="units">Sort by Units Sold</option>
          <option value="views">Sort by Views</option>
          <option value="conversion">Sort by Conversion</option>
        </select>
      </div>
      <Card>
        <div style={{ 
          overflowX: 'auto',
          position: 'relative',
        }}>
          {/* Scroll hint indicator */}
          <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 40,
            background: 'linear-gradient(to left, rgba(255,255,255,0.98), transparent)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
          
          <table style={{ fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ padding: '8px 4px', width: 220, maxWidth: 220 }}>Product</th>
                <th style={{ padding: '8px 4px', width: 60 }}>Stock</th>
                <th style={{ padding: '8px 4px', width: 70 }}>Views</th>
                <th style={{ padding: '8px 4px', width: 80 }}>Cart</th>
                <th style={{ padding: '8px 4px', width: 70 }}>Conv %</th>
                <th style={{ padding: '8px 4px', width: 60 }}>Units</th>
                <th style={{ padding: '8px 4px', width: 90 }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {productPerformance.map((p) => (
                <tr 
                  key={p.id} 
                  onClick={() => nav(`/shop/${slug}/p/${p.id}`)}
                  style={{ 
                    borderBottom: "1px solid #f5f5f5",
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: "8px 4px", width: 220, maxWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', maxWidth: 220 }}>
                      {p.img && (
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          backgroundImage: `url(${p.img})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundColor: '#f5f5f5',
                          flexShrink: 0,
                        }} />
                      )}
                      <span style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}>
                        {p.title}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "8px 4px" }}>
                    <span style={{
                      color: p.stock === 0 ? '#dc2626' : p.stock <= 5 ? '#f59e0b' : '#10b981',
                      fontWeight: 500,
                    }}>
                      {p.stock}
                    </span>
                  </td>
                  <td style={{ padding: "8px 4px" }}>{p.views}</td>
                  <td style={{ padding: "8px 4px" }}>{p.addToCart}</td>
                  <td style={{ padding: "8px 4px" }}>{p.conversion.toFixed(1)}%</td>
                  <td style={{ padding: "8px 4px", fontWeight: 500 }}>{p.units}</td>
                  <td style={{ padding: "8px 4px", fontWeight: 600 }}>{p.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ========== Simple Chart Components ==========

function SimpleLineChart({ data, height }: { data: { date: string; amount: number }[]; height: number }) {
  if (data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
      No data available
    </div>;
  }

  const maxValue = Math.max(...data.map(d => d.amount), 1);
  const width = 100;
  const padding = 10;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * (width - padding * 2) + padding;
    const y = height - (d.amount / maxValue) * (height - padding * 2) - padding;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="#4a90e2"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {data.map((d, i) => {
        const x = (i / (data.length - 1 || 1)) * (width - padding * 2) + padding;
        const y = height - (d.amount / maxValue) * (height - padding * 2) - padding;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="0.5"
            fill="#4a90e2"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}

function SimpleDonutChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([_, v]) => v > 0);
  if (entries.length === 0) {
    return <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
      No orders yet
    </div>;
  }

  const total = entries.reduce((sum, [_, v]) => sum + v, 0);
  const colors: Record<string, string> = {
    pending: '#fbbf24',
    paid: '#4a90e2',
    shipped: '#8b5cf6',
    completed: '#10b981',
    cancelled: '#ef4444',
  };

  let currentAngle = 0;
  const segments = entries.map(([status, count]) => {
    const percentage = count / total;
    const angle = percentage * 360;
    const segment = { status, count, percentage, startAngle: currentAngle, angle, color: colors[status] || '#999' };
    currentAngle += angle;
    return segment;
  });

  return (
    <div style={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <svg width="90" height="90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#f0f0f0" strokeWidth="20" />
        {segments.map((seg, idx) => {
          const startAngle = (seg.startAngle - 90) * Math.PI / 180;
          const endAngle = (seg.startAngle + seg.angle - 90) * Math.PI / 180;
          const largeArc = seg.angle > 180 ? 1 : 0;
          
          const x1 = 50 + 40 * Math.cos(startAngle);
          const y1 = 50 + 40 * Math.sin(startAngle);
          const x2 = 50 + 40 * Math.cos(endAngle);
          const y2 = 50 + 40 * Math.sin(endAngle);
          
          return (
            <path
              key={idx}
              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={seg.color}
              opacity="0.8"
            />
          );
        })}
        <circle cx="50" cy="50" r="25" fill="white" />
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', fontSize: 11 }}>
        {segments.map((seg, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color }} />
            <span>{seg.status}: {seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleBarChart({ data }: { data: { date: string; amount: number }[] }) {
  if (data.length === 0) {
    return <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
      No data available
    </div>;
  }

  const maxValue = Math.max(...data.map(d => d.amount), 1);

  return (
    <div style={{ height: 140, display: "flex", alignItems: "flex-end", gap: 6, padding: '0 8px' }}>
      {data.map((d, idx) => {
        const height = (d.amount / maxValue) * 120;
        const date = new Date(d.date);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' })[0];
        
        return (
          <div key={idx} style={{ flex: 1, textAlign: "center", display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 10, marginBottom: 4, color: '#666' }}>
              {d.amount > 0 ? d.amount : ''}
            </div>
            <div
              style={{
                width: '100%',
                height: Math.max(height, 2),
                background: "#4a90e2",
                borderRadius: 4,
              }}
            />
            <div style={{ fontSize: 11, marginTop: 4, color: '#999' }}>{day}</div>
          </div>
        );
      })}
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

function AlertCard({ children }: { children: any }) {
  return (
    <div
      style={{
        background: "#fff3cd",
        padding: 14,
        borderRadius: 12,
        border: "1px solid #ffc107",
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
  subtitle,
}: {
  title: string;
  value: any;
  delta?: string;
  positive?: boolean;
  subtitle?: string;
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
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{value}</div>

      {delta && (
        <div
          style={{
            fontSize: 12,
            marginTop: 6,
            color: positive ? "#0c8f2a" : "#c0392b",
            fontWeight: 500,
          }}
        >
          {delta}
        </div>
      )}
      
      {subtitle && (
        <div style={{ fontSize: 11, marginTop: 4, color: '#999' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, marginTop: 16 }}>{title}</div>;
}

function SectionSmall({ title }: { title: string }) {
  return <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{title}</div>;
}
