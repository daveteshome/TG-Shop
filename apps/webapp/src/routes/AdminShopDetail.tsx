// Admin: Shop Detail & Management
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api/index";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

type ShopDetail = {
  id: string;
  slug: string;
  name: string;
  status: "open" | "closed" | "paused";
  autoApproveProducts: boolean;
  description: string;
  location: string;
  publicPhone: string;
  publicTelegramLink: string;
  createdAt: string;
  owner: {
    tgId: string;
    name: string;
    username: string;
  };
  stats: {
    productsCount: number;
    activeProducts: number;
    ordersCount: number;
    completedOrders: number;
    revenue: number;
    members: number;
    pendingProducts: number;
  };
  recentProducts: Array<{
    id: string;
    title: string;
    price: number;
    currency: string;
    stock: number;
    createdAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    total: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
};

export default function AdminShopDetail() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Remember this page for back navigation
  useEffect(() => {
    if (slug) {
      localStorage.setItem("tgshop:lastAdminPage", `/admin/shops/${slug}`);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) loadShop();
  }, [slug]);

  async function loadShop() {
    try {
      setLoading(true);
      const data = await api<ShopDetail>(`/admin/shops/${slug}/detail`);
      setShop(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load shop");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: "open" | "closed" | "paused") {
    if (!shop) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to ${newStatus} this shop?`
    );
    if (!confirmed) return;

    try {
      setUpdating(true);
      await api(`/admin/shops/${slug}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setShop({ ...shop, status: newStatus });
    } catch (e: any) {
      alert(e?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  async function toggleTrusted() {
    if (!shop) return;
    
    const newStatus = !shop.autoApproveProducts;
    const confirmed = window.confirm(
      newStatus
        ? `✅ Grant trusted status to "${shop.name}"?\n\nTheir products will be auto-approved for universal marketplace.`
        : `⚠️ Revoke trusted status from "${shop.name}"?\n\nTheir new products will need manual approval.`
    );
    if (!confirmed) return;

    try {
      setUpdating(true);
      await api(`/admin/shops/${slug}/trusted`, {
        method: "PATCH",
        body: JSON.stringify({ autoApproveProducts: newStatus }),
      });
      setShop({ ...shop, autoApproveProducts: newStatus });
      alert(newStatus ? "Shop is now trusted!" : "Trusted status revoked");
    } catch (e: any) {
      alert(e?.message || "Failed to update trusted status");
    } finally {
      setUpdating(false);
    }
  }

  async function deleteShop() {
    if (!shop) return;
    
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to DELETE this shop? This action cannot be undone!\n\nShop: ${shop.name}\nOwner: ${shop.owner.name || shop.owner.username}`
    );
    if (!confirmed) return;

    const doubleCheck = window.prompt(
      `Type "${shop.slug}" to confirm deletion:`
    );
    if (doubleCheck !== shop.slug) {
      alert("Deletion cancelled - slug didn't match");
      return;
    }

    try {
      setUpdating(true);
      await api(`/admin/shops/${slug}`, { method: "DELETE" });
      alert("Shop deleted successfully");
      nav("/admin/shops");
    } catch (e: any) {
      alert(e?.message || "Failed to delete shop");
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading shop details...
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div style={{ padding: "20px" }}>
        <Card padding="lg">
          <div style={{ color: "var(--color-error)" }}>
            {error || "Shop not found"}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "2px" }}>
            {shop.name}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
            @{shop.slug}
          </p>
        </div>
        <Badge
          variant={
            shop.status === "open"
              ? "success"
              : shop.status === "paused"
              ? "warning"
              : "neutral"
          }
        >
          {shop.status}
        </Badge>
      </div>

      {/* Trusted Badge */}
      {shop.autoApproveProducts && (
        <Card padding="sm" style={{ marginBottom: "16px", background: "var(--color-success-bg)", borderColor: "var(--color-success)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "var(--color-success-dark)" }}>
            ✅ Trusted Shop - Products auto-approved for universal
          </div>
        </Card>
      )}

      {/* Pending Products Alert */}
      {shop.stats.pendingProducts > 0 && (
        <Card padding="sm" style={{ marginBottom: "16px", background: "var(--color-warning-bg)", borderColor: "var(--color-warning)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "var(--color-warning-dark)" }}>
            ⏳ {shop.stats.pendingProducts} products pending approval
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <StatCard label="Products" value={shop.stats.productsCount} />
        <StatCard label="Orders" value={shop.stats.ordersCount} />
        <StatCard
          label="Revenue"
          value={`${shop.stats.revenue.toLocaleString()} ETB`}
        />
        <StatCard label="Members" value={shop.stats.members} />
      </div>

      {/* Shop Info */}
      <Card padding="md" style={{ marginBottom: "16px" }}>
        <SectionTitle title="Shop Information" />
        <InfoRow label="Owner" value={shop.owner.name || shop.owner.username} />
        <InfoRow label="Telegram" value={`@${shop.owner.username || shop.owner.tgId}`} />
        <InfoRow label="Phone" value={shop.publicPhone || "Not set"} />
        <InfoRow label="Location" value={shop.location || "Not set"} />
        <InfoRow
          label="Created"
          value={new Date(shop.createdAt).toLocaleDateString()}
        />
      </Card>

      {/* Actions */}
      <Card padding="md" style={{ marginBottom: "16px" }}>
        <SectionTitle title="Admin Actions" />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Trusted Status Toggle */}
          <Button
            variant={shop.autoApproveProducts ? "secondary" : "success"}
            fullWidth
            onClick={toggleTrusted}
            disabled={updating}
          >
            {shop.autoApproveProducts ? "🔓 Revoke Trusted Status" : "✅ Grant Trusted Status"}
          </Button>

          {shop.status !== "open" && (
            <Button
              variant="success"
              fullWidth
              onClick={() => updateStatus("open")}
              disabled={updating}
            >
              ✅ Open Shop
            </Button>
          )}
          {shop.status !== "paused" && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => updateStatus("paused")}
              disabled={updating}
            >
              ⏸️ Pause Shop
            </Button>
          )}
          {shop.status !== "closed" && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => updateStatus("closed")}
              disabled={updating}
            >
              🔒 Close Shop
            </Button>
          )}
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              // Store where we're coming from
              sessionStorage.setItem('viewShopFrom', `/admin/shops/${shop.slug}`);
              nav(`/s/${shop.slug}`);
            }}
          >
            👁️ View Shop
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={deleteShop}
            disabled={updating}
          >
            🗑️ Delete Shop
          </Button>
        </div>
      </Card>

      {/* Recent Products */}
      <SectionTitle title="Recent Products" />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {shop.recentProducts.map((product) => (
          <Card
            key={product.id}
            padding="sm"
            hover
            onClick={() => nav(`/s/${shop.slug}/p/${product.id}`)}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>
                  {product.title}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  Stock: {product.stock}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>
                  {product.price} {product.currency}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <SectionTitle title="Recent Orders" />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {shop.recentOrders.map((order) => (
          <Card key={order.id} padding="sm">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>
                  {order.total} {order.currency}
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </div>
              </div>
              <Badge
                variant={
                  order.status === "completed"
                    ? "success"
                    : order.status === "pending"
                    ? "warning"
                    : "neutral"
                }
                size="sm"
              >
                {order.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card padding="md">
      <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700 }}>{value}</div>
    </Card>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontSize: "15px",
        fontWeight: 600,
        marginBottom: "12px",
        color: "var(--color-text-primary)",
      }}
    >
      {title}
    </h2>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "1px solid var(--color-border-light)",
      }}
    >
      <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
        {label}
      </span>
      <span style={{ fontSize: "13px", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
