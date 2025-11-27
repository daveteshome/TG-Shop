// Admin: Manage All Users
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

type User = {
  tgId: string;
  name: string;
  username: string;
  phone: string;
  platformRole: "USER" | "ADMIN" | "MOD";
  createdAt: string;
  shopsOwned: number;
  ordersCount: number;
  totalSpent: number;
};

export default function AdminUsers() {
  const nav = useNavigate();
  const loc = useLocation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(loc.search);
  const searchQ = params.get("q") || "";
  const roleFilter = params.get("role") || "all";

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await api<{ users: User[] }>("/admin/users");
      setUsers(data.users);
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchQ ||
      user.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQ.toLowerCase()) ||
      user.tgId.includes(searchQ);

    const matchesRole = roleFilter === "all" || user.platformRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading users...
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

  return (
    <div style={{ padding: "16px", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Manage Users</h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          {filteredUsers.length} users
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", overflowX: "auto" }}>
        <FilterButton
          label="All"
          active={roleFilter === "all"}
          onClick={() => {
            params.set("role", "all");
            nav(`?${params.toString()}`);
          }}
        />
        <FilterButton
          label="Admins"
          active={roleFilter === "ADMIN"}
          onClick={() => {
            params.set("role", "ADMIN");
            nav(`?${params.toString()}`);
          }}
        />
        <FilterButton
          label="Moderators"
          active={roleFilter === "MOD"}
          onClick={() => {
            params.set("role", "MOD");
            nav(`?${params.toString()}`);
          }}
        />
        <FilterButton
          label="Users"
          active={roleFilter === "USER"}
          onClick={() => {
            params.set("role", "USER");
            nav(`?${params.toString()}`);
          }}
        />
      </div>

      {/* Users List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredUsers.map((user) => (
          <Card
            key={user.tgId}
            padding="md"
            hover
            onClick={() => nav(`/admin/users/${user.tgId}`)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "2px" }}>
                  {user.name || "Unknown"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  @{user.username || user.tgId}
                </div>
              </div>
              <Badge
                variant={
                  user.platformRole === "ADMIN"
                    ? "error"
                    : user.platformRole === "MOD"
                    ? "warning"
                    : "neutral"
                }
                size="sm"
              >
                {user.platformRole}
              </Badge>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                padding: "8px 0",
                borderTop: "1px solid var(--color-border-light)",
              }}
            >
              <Stat label="Shops" value={user.shopsOwned} />
              <Stat label="Orders" value={user.ordersCount} />
              <Stat label="Spent" value={`${user.totalSpent.toLocaleString()} ETB`} />
            </div>

            <div
              style={{
                fontSize: "11px",
                color: "var(--color-text-tertiary)",
                marginTop: "8px",
              }}
            >
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <Card padding="lg">
            <div style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
              No users found
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: "8px",
        border: `1px solid ${active ? "var(--color-primary)" : "var(--color-border-main)"}`,
        background: active ? "var(--color-primary-bg)" : "#fff",
        color: active ? "var(--color-primary-dark)" : "var(--color-text-secondary)",
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", fontWeight: 600 }}>{value}</div>
    </div>
  );
}
