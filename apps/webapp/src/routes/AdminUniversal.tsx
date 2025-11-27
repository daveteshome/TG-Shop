// Admin Universal Shop Management
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api/index";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

type UniversalStats = {
  totalProducts: number;
  approvedProducts: number;
  pendingProducts: number;
  rejectedProducts: number;
  totalShopsPublishing: number;
  trustedShops: number;
  totalViews: number;
  totalContacts: number;
};

type CategoryStats = {
  id: string;
  name: string;
  productsCount: number;
  approvedCount: number;
};

export default function AdminUniversal() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UniversalStats | null>(null);
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Remember this page for back navigation
  useEffect(() => {
    localStorage.setItem("tgshop:lastAdminPage", "/admin/universal");
  }, []);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await api<{
        stats: UniversalStats;
        categories: CategoryStats[];
      }>("/admin/universal/stats");
      setStats(data.stats);
      setCategories(data.categories);
    } catch (e: any) {
      setError(e?.message || "Failed to load universal shop stats");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading universal shop stats...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <Card padding="lg">
          <div style={{ color: "var(--color-error)" }}>{error}</div>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={{ padding: "16px", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Universal Shop</h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          Manage the universal marketplace
        </p>
      </div>

      {/* Quick Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          color="primary"
        />
        <StatCard
          title="Approved"
          value={stats.approvedProducts}
          color="success"
        />
        <StatCard
          title="Pending"
          value={stats.pendingProducts}
          color="warning"
        />
        <StatCard
          title="Rejected"
          value={stats.rejectedProducts}
          color="error"
        />
      </div>

      {/* Shop Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <StatCard
          title="Publishing Shops"
          value={stats.totalShopsPublishing}
          color="info"
        />
        <StatCard
          title="Trusted Shops"
          value={stats.trustedShops}
          color="success"
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews}
          color="primary"
        />
        <StatCard
          title="Total Contacts"
          value={stats.totalContacts}
          color="warning"
        />
      </div>

      {/* Quick Actions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <ActionButton
          icon="⏳"
          label="Pending Products"
          count={stats.pendingProducts}
          onClick={() => {
            localStorage.setItem("tgshop:adminProductsReferrer", "/admin/universal");
            nav("/admin/products?status=pending");
          }}
        />
        <ActionButton
          icon="✅"
          label="Approved Products"
          count={stats.approvedProducts}
          onClick={() => {
            localStorage.setItem("tgshop:adminProductsReferrer", "/admin/universal");
            nav("/admin/products?status=approved");
          }}
        />
        <ActionButton
          icon="🏪"
          label="Trusted Shops"
          count={stats.trustedShops}
          onClick={() => {
            localStorage.setItem("tgshop:adminShopsReferrer", "/admin/universal");
            nav("/admin/shops?filter=trusted");
          }}
        />
        <ActionButton
          icon="🌐"
          label="View Universal"
          onClick={() => nav("/universal")}
        />
      </div>

      {/* Category Stats */}
      <h2
        style={{
          fontSize: "16px",
          fontWeight: 600,
          marginBottom: "12px",
          color: "var(--color-text-primary)",
        }}
      >
        Products by Category
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {categories.map((category) => (
          <Card 
            key={category.id} 
            padding="md"
            hover
            onClick={() => {
              localStorage.setItem("tgshop:adminProductsReferrer", "/admin/universal");
              nav(`/admin/products?category=${category.id}`);
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px" }}>
                  {category.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  {category.approvedCount} approved of {category.productsCount} total
                </div>
              </div>
              <Badge variant="neutral" size="sm">
                {category.productsCount}
              </Badge>
            </div>
          </Card>
        ))}

        {categories.length === 0 && (
          <Card padding="lg">
            <div style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
              No categories with products yet
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  color = "primary",
}: {
  title: string;
  value: number;
  color?: "primary" | "success" | "warning" | "error" | "info";
}) {
  const colorMap = {
    primary: "var(--color-primary)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    error: "var(--color-error)",
    info: "var(--color-info)",
  };

  return (
    <Card padding="md">
      <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
        {title}
      </div>
      <div style={{ fontSize: "24px", fontWeight: 700, color: colorMap[color] }}>
        {value.toLocaleString()}
      </div>
    </Card>
  );
}

function ActionButton({
  icon,
  label,
  count,
  onClick,
}: {
  icon: string;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <Card padding="md" hover onClick={onClick}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "28px", marginBottom: "4px" }}>{icon}</div>
        <div style={{ fontSize: "13px", fontWeight: 500, marginBottom: "2px" }}>
          {label}
        </div>
        {count !== undefined && (
          <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>
            {count}
          </div>
        )}
      </div>
    </Card>
  );
}
