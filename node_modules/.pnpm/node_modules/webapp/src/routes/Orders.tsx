// apps/webapp/src/routes/Orders.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api/index";
import { money } from "../lib/format";

type Order = {
  id: string;
  shortCode: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  itemCount: number;
  shop: {
    id: string;
    slug: string;
    name: string;
  };
  buyer?: {
    tgId: string;
    name?: string;
    username?: string;
  };
};

type OrdersData = {
  buyer: {
    byShop: Record<string, Order[]>;
    total: number;
  };
  owner: {
    byShop: Record<string, Order[]>;
    total: number;
    shops: Array<{ id: string; slug: string; name: string }>;
  };
};

export default function Orders() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OrdersData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"buyer" | "owner">("buyer");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const result = await api<OrdersData>("/user/orders/all");
        setData(result);
      } catch (e: any) {
        setErr(e?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
        <div>{t("loading", "Loading...")}</div>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#EF4444" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>❌</div>
        <div>{err}</div>
      </div>
    );
  }

  if (!data) return null;

  const buyerShops = Object.keys(data.buyer.byShop);
  const ownerShops = Object.keys(data.owner.byShop);
  const hasBuyerOrders = data.buyer.total > 0;
  const hasOwnerOrders = data.owner.total > 0;

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, marginBottom: 4 }}>
          📦 {t("my_orders", "My Orders")}
        </h1>
        <div style={{ fontSize: 13, color: "#666" }}>
          {t("orders_subtitle", "Track all your orders")}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: "flex", 
        gap: 8, 
        padding: "0 16px 16px",
        borderBottom: "1px solid #E5E7EB",
      }}>
        <button
          onClick={() => setActiveTab("buyer")}
          style={{
            flex: 1,
            padding: "10px",
            border: "none",
            borderRadius: "8px 8px 0 0",
            background: activeTab === "buyer" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#F3F4F6",
            color: activeTab === "buyer" ? "#fff" : "#6B7280",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            position: "relative",
          }}
        >
          🛍️ {t("orders_i_made", "Orders I Made")}
          {hasBuyerOrders && (
            <span style={{
              position: "absolute",
              top: 4,
              right: 4,
              background: activeTab === "buyer" ? "rgba(255,255,255,0.3)" : "#667eea",
              color: activeTab === "buyer" ? "#fff" : "#fff",
              borderRadius: 999,
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 700,
            }}>
              {data.buyer.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("owner")}
          style={{
            flex: 1,
            padding: "10px",
            border: "none",
            borderRadius: "8px 8px 0 0",
            background: activeTab === "owner" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#F3F4F6",
            color: activeTab === "owner" ? "#fff" : "#6B7280",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            position: "relative",
          }}
        >
          🏪 {t("orders_i_received", "Orders I Received")}
          {hasOwnerOrders && (
            <span style={{
              position: "absolute",
              top: 4,
              right: 4,
              background: activeTab === "owner" ? "rgba(255,255,255,0.3)" : "#667eea",
              color: activeTab === "owner" ? "#fff" : "#fff",
              borderRadius: 999,
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 700,
            }}>
              {data.owner.total}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        {activeTab === "buyer" ? (
          // Orders I Made
          buyerShops.length === 0 ? (
            <EmptyState
              icon="🛍️"
              title={t("no_orders_made", "No Orders Yet")}
              subtitle={t("no_orders_made_desc", "Start shopping to see your orders here")}
              action={{
                label: t("browse_shops", "Browse Shops"),
                onClick: () => nav("/joined"),
              }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {buyerShops.map((shopId) => {
                const orders = data.buyer.byShop[shopId];
                const shop = orders[0].shop;
                return (
                  <ShopOrdersSection
                    key={shopId}
                    shop={shop}
                    orders={orders}
                    type="buyer"
                    onOrderClick={(orderId) => nav(`/s/${shop.slug}/orders/${orderId}`)}
                  />
                );
              })}
            </div>
          )
        ) : (
          // Orders I Received
          ownerShops.length === 0 ? (
            <EmptyState
              icon="🏪"
              title={t("no_orders_received", "No Orders Received")}
              subtitle={t("no_orders_received_desc", "Orders from your customers will appear here")}
              action={{
                label: t("go_to_my_shops", "Go to My Shops"),
                onClick: () => nav("/shops"),
              }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {ownerShops.map((shopId) => {
                const orders = data.owner.byShop[shopId];
                const shop = orders[0].shop;
                return (
                  <ShopOrdersSection
                    key={shopId}
                    shop={shop}
                    orders={orders}
                    type="owner"
                    onOrderClick={(orderId) => nav(`/shop/${shop.slug}/orders/${orderId}`)}
                  />
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ShopOrdersSection({
  shop,
  orders,
  type,
  onOrderClick,
}: {
  shop: { slug: string; name: string };
  orders: Order[];
  type: "buyer" | "owner";
  onOrderClick: (orderId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      border: "1px solid #E5E7EB",
      overflow: "hidden",
    }}>
      {/* Shop Header - Clickable */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: "12px 16px",
          background: "linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)",
          borderBottom: isExpanded ? "1px solid #E5E7EB" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "999px",
            background: "#667eea",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
          }}>
            {shop.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{shop.name}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 18,
          color: "#6B7280",
          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.3s",
        }}>
          ▼
        </div>
      </div>

      {/* Orders List - Collapsible */}
      {isExpanded && (
        <div>
          {orders.map((order, idx) => (
            <OrderRow
              key={order.id}
              order={order}
              isLast={idx === orders.length - 1}
              onClick={() => onOrderClick(order.id)}
              showBuyer={type === "owner"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderRow({
  order,
  isLast,
  onClick,
  showBuyer,
}: {
  order: Order;
  isLast: boolean;
  onClick: () => void;
  showBuyer?: boolean;
}) {
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
    confirmed: { bg: "#DBEAFE", text: "#1E40AF", label: "Confirmed" },
    shipped: { bg: "#E0E7FF", text: "#3730A3", label: "Shipped" },
    delivered: { bg: "#D1FAE5", text: "#065F46", label: "Delivered" },
    cancelled: { bg: "#FEE2E2", text: "#991B1B", label: "Cancelled" },
  };

  const status = statusColors[order.status] || statusColors.pending;
  const date = new Date(order.createdAt).toLocaleDateString();

  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 16px",
        borderBottom: isLast ? "none" : "1px solid #F3F4F6",
        cursor: "pointer",
        transition: "background 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
            #{order.shortCode || order.id.slice(0, 8)}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>
            {date} • {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
          </div>
          {showBuyer && order.buyer && (
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
              👤 {order.buyer.name || order.buyer.username || "Customer"}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {money(order.total, order.currency)}
          </div>
          <div style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 6,
            background: status.bg,
            color: status.text,
            fontSize: 11,
            fontWeight: 600,
          }}>
            {status.label}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: string;
  title: string;
  subtitle: string;
  action: { label: string; onClick: () => void };
}) {
  return (
    <div style={{
      textAlign: "center",
      padding: "60px 20px",
      background: "#fff",
      borderRadius: 12,
      border: "1px solid #E5E7EB",
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
        {subtitle}
      </div>
      <button
        onClick={action.onClick}
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "12px 24px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
        }}
      >
        {action.label}
      </button>
    </div>
  );
}
