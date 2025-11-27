// Admin: User Detail & Management
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api/index";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

type UserDetail = {
  tgId: string;
  name: string;
  username: string;
  phone: string;
  platformRole: "USER" | "ADMIN" | "MOD";
  createdAt: string;
  stats: {
    shopsOwned: number;
    ordersCount: number;
    totalSpent: number;
    favoritesCount: number;
  };
  shops: Array<{
    id: string;
    slug: string;
    name: string;
    role: string;
    productsCount: number;
    ordersCount: number;
  }>;
  recentOrders: Array<{
    id: string;
    total: number;
    currency: string;
    status: string;
    createdAt: string;
    shopName: string;
  }>;
};

export default function AdminUserDetail() {
  const { tgId } = useParams<{ tgId: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (tgId) loadUser();
  }, [tgId]);

  async function loadUser() {
    try {
      setLoading(true);
      const data = await api<UserDetail>(`/admin/users/${tgId}/detail`);
      setUser(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(newRole: "USER" | "MOD" | "ADMIN") {
    if (!user) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to change ${user.name || user.username}'s role to ${newRole}?`
    );
    if (!confirmed) return;

    try {
      setUpdating(true);
      await api(`/admin/users/${tgId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ platformRole: newRole }),
      });
      setUser({ ...user, platformRole: newRole });
      alert(`Role updated to ${newRole}`);
    } catch (e: any) {
      alert(e?.message || "Failed to update role");
    } finally {
      setUpdating(false);
    }
  }

  async function banUser() {
    if (!user) return;
    
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to BAN this user?\n\nUser: ${user.name || user.username}\nThis will close all their shops and prevent access.`
    );
    if (!confirmed) return;

    try {
      setUpdating(true);
      await api(`/admin/users/${tgId}/ban`, {
        method: "POST",
      });
      alert("User banned successfully");
      nav("/admin/users");
    } catch (e: any) {
      alert(e?.message || "Failed to ban user");
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading user details...
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={{ padding: "20px" }}>
        <Card padding="lg">
          <div style={{ color: "var(--color-error)" }}>
            {error || "User not found"}
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
            {user.name || "Unknown"}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
            @{user.username || user.tgId}
          </p>
        </div>
        <Badge
          variant={
            user.platformRole === "ADMIN"
              ? "error"
              : user.platformRole === "MOD"
              ? "warning"
              : "neutral"
          }
        >
          {user.platformRole}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <StatCard label="Shops Owned" value={user.stats.shopsOwned} />
        <StatCard label="Orders" value={user.stats.ordersCount} />
        <StatCard
          label="Total Spent"
          value={`${user.stats.totalSpent.toLocaleString()} ETB`}
        />
        <StatCard label="Favorites" value={user.stats.favoritesCount} />
      </div>

      {/* User Info */}
      <Card padding="md" style={{ marginBottom: "16px" }}>
        <SectionTitle title="User Information" />
        <InfoRow label="Telegram ID" value={user.tgId} />
        <InfoRow label="Username" value={`@${user.username || "Not set"}`} />
        <InfoRow label="Phone" value={user.phone || "Not set"} />
        <InfoRow label="Platform Role" value={user.platformRole} />
        <InfoRow
          label="Joined"
          value={new Date(user.createdAt).toLocaleDateString()}
        />
      </Card>

      {/* Role Management */}
      <Card padding="md" style={{ marginBottom: "16px" }}>
        <SectionTitle title="Role Management" />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {user.platformRole !== "USER" && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => updateRole("USER")}
              disabled={updating}
            >
              👤 Set as Regular User
            </Button>
          )}
          {user.platformRole !== "MOD" && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => updateRole("MOD")}
              disabled={updating}
            >
              🛡️ Promote to Moderator
            </Button>
          )}
          {user.platformRole !== "ADMIN" && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => updateRole("ADMIN")}
              disabled={updating}
            >
              👑 Promote to Admin
            </Button>
          )}
        </div>
      </Card>

      {/* Danger Zone */}
      <Card padding="md" style={{ marginBottom: "16px", borderColor: "var(--color-error)" }}>
        <SectionTitle title="⚠️ Danger Zone" />
        <Button
          variant="danger"
          fullWidth
          onClick={banUser}
          disabled={updating}
        >
          🚫 Ban User
        </Button>
      </Card>

      {/* User's Shops */}
      {user.shops.length > 0 && (
        <>
          <SectionTitle title="Shops" />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
            {user.shops.map((shop) => (
              <Card
                key={shop.id}
                padding="sm"
                hover
                onClick={() => nav(`/admin/shops/${shop.slug}`)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>
                      {shop.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                      {shop.productsCount} products • {shop.ordersCount} orders
                    </div>
                  </div>
                  <Badge variant="neutral" size="sm">
                    {shop.role}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Recent Orders */}
      {user.recentOrders.length > 0 && (
        <>
          <SectionTitle title="Recent Orders" />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {user.recentOrders.map((order) => (
              <Card key={order.id} padding="sm">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>
                      {order.total} {order.currency}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                      {order.shopName}
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
        </>
      )}
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
