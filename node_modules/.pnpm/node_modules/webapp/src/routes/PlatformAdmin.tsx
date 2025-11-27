// Platform Admin Dashboard - Super Admin View
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api/index";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

type PlatformStats = {
  totalShops: number;
  activeShops: number;
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  recentShops: Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    productsCount: number;
    ordersCount: number;
  }>;
  recentUsers: Array<{
    tgId: string;
    name: string;
    username: string;
    createdAt: string;
  }>;
  topShops: Array<{
    id: string;
    name: string;
    slug: string;
    revenue: number;
    ordersCount: number;
  }>;
};

export default function PlatformAdmin() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Remember this page for back navigation
  useEffect(() => {
    localStorage.setItem("tgshop:lastAdminPage", "/admin");
  }, []);

  useEffect(() => {
    loadStats();
  }, []);

  // Scroll to section if needed
  useEffect(() => {
    if (!stats) return;
    
    // Check if we should scroll to a specific section
    const scrollTo = localStorage.getItem("tgshop:adminScrollTo");
    if (scrollTo) {
      localStorage.removeItem("tgshop:adminScrollTo");
      const element = document.getElementById(scrollTo);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [stats]);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await api<PlatformStats>("/admin/stats");
      setStats(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load platform stats");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <div style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
          Loading platform stats...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <Card padding="lg">
          <div style={{ color: "var(--color-error)", marginBottom: "12px" }}>
            {error}
          </div>
          <button
            onClick={loadStats}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--color-border-main)",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={{ padding: "16px", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>
          Platform Admin
        </h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
          Manage shops, users, and platform settings
        </p>
      </div>

      {/* Quick Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <StatCard
          title="Total Shops"
          value={stats.totalShops}
          subtitle={`${stats.activeShops} active`}
          color="primary"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          color="info"
        />
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          color="success"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          color="warning"
        />
      </div>

      {/* Revenue Card */}
      <Card padding="lg" style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
          Total Platform Revenue
        </div>
        <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--color-primary)" }}>
          {stats.totalRevenue.toLocaleString()} ETB
        </div>
      </Card>

      {/* Action Buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <ActionButton
          icon="🏪"
          label="Manage Shops"
          onClick={() => nav("/admin/shops")}
        />
        <ActionButton
          icon="👥"
          label="Manage Users"
          onClick={() => nav("/admin/users")}
        />
        <ActionButton
          icon="📦"
          label="All Products"
          onClick={() => nav("/admin/products")}
        />
        <ActionButton
          icon="📊"
          label="Reports"
          onClick={() => nav("/admin/reports")}
        />
        <ActionButton
          icon="📁"
          label="Categories"
          onClick={() => nav("/admin/categories")}
        />
        <ActionButton
          icon="⚙️"
          label="Settings"
          onClick={() => nav("/admin/settings")}
        />
        <ActionButton
          icon="🌐"
          label="Universal Shop"
          onClick={() => nav("/admin/universal")}
        />
      </div>

      {/* Top Shops */}
      <div id="top-shops">
        <SectionTitle title="Top Performing Shops" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
        {stats.topShops.map((shop) => (
          <Card
            key={shop.id}
            padding="md"
            hover
            onClick={() => {
              // Store that we came from top shops section
              localStorage.setItem("tgshop:adminScrollTo", "top-shops");
              nav(`/admin/shops/${shop.slug}`);
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>{shop.name}</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  {shop.ordersCount} orders
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                  {shop.revenue.toLocaleString()} ETB
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Shops */}
      <SectionTitle title="Recently Created Shops" />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
        {stats.recentShops.map((shop) => (
          <Card
            key={shop.id}
            padding="md"
            hover
            onClick={() => nav(`/admin/shops/${shop.slug}`)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>{shop.name}</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  @{shop.slug} • {shop.productsCount} products
                </div>
              </div>
              <Badge variant="neutral" size="sm">
                {new Date(shop.createdAt).toLocaleDateString()}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Users */}
      <div id="recent-users">
        <SectionTitle title="Recent Users" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {stats.recentUsers.map((user) => (
          <Card 
            key={user.tgId} 
            padding="md"
            hover
            onClick={() => {
              localStorage.setItem("tgshop:adminScrollTo", "recent-users");
              nav(`/admin/users/${user.tgId}`);
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>
                  {user.name || user.username || "Unknown"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  @{user.username || user.tgId}
                </div>
              </div>
              <Badge variant="neutral" size="sm">
                {new Date(user.createdAt).toLocaleDateString()}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  title,
  value,
  subtitle,
  color = "primary",
}: {
  title: string;
  value: number;
  subtitle?: string;
  color?: "primary" | "success" | "warning" | "info";
}) {
  const colorMap = {
    primary: "var(--color-primary)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    info: "var(--color-info)",
  };

  return (
    <Card padding="md">
      <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
        {title}
      </div>
      <div style={{ fontSize: "24px", fontWeight: 700, color: colorMap[color], marginBottom: "2px" }}>
        {value.toLocaleString()}
      </div>
      {subtitle && (
        <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>
          {subtitle}
        </div>
      )}
    </Card>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Card padding="md" hover onClick={onClick}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "8px" }}>{icon}</div>
        <div style={{ fontSize: "13px", fontWeight: 500 }}>{label}</div>
      </div>
    </Card>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontSize: "16px",
        fontWeight: 600,
        marginBottom: "12px",
        color: "var(--color-text-primary)",
      }}
    >
      {title}
    </h2>
  );
}
