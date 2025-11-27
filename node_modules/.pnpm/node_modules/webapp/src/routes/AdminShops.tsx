// Admin: Manage All Shops
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

type Shop = {
  id: string;
  slug: string;
  name: string;
  status: "open" | "closed" | "paused";
  createdAt: string;
  productsCount: number;
  ordersCount: number;
  revenue: number;
  owner: {
    tgId: string;
    name: string;
    username: string;
  };
};

type DeletedShop = {
  id: string;
  slug: string;
  name: string;
  deletedAt: string;
  daysSinceDeletion: number;
  daysRemaining: number;
  isExpired: boolean;
  owner: {
    tgId: string;
    name: string;
    username: string;
  } | null;
};

export default function AdminShops() {
  const nav = useNavigate();
  const loc = useLocation();
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedShops, setDeletedShops] = useState<DeletedShop[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [deletingShop, setDeletingShop] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);

  const params = new URLSearchParams(loc.search);
  const searchQ = params.get("q") || "";
  const statusFilter = params.get("status") || "all";

  // Store where we came from for smart back navigation
  useEffect(() => {
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;
    
    // If we came from another page on this site, check if it was an admin page
    if (referrer.startsWith(currentOrigin)) {
      const referrerPath = referrer.replace(currentOrigin, '').split('?')[0];
      if (referrerPath.startsWith('/admin') && referrerPath !== '/admin/shops') {
        // Store the referrer as the page to return to
        localStorage.setItem("tgshop:adminShopsReferrer", referrerPath);
      }
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, []);

  async function loadShops() {
    try {
      setLoading(true);
      const data = await api<{ shops: Shop[] }>("/admin/shops");
      setShops(data.shops);
    } catch (e: any) {
      setError(e?.message || "Failed to load shops");
    } finally {
      setLoading(false);
    }
  }

  async function loadDeletedShops() {
    try {
      setLoadingDeleted(true);
      const data = await api<{ deletedShops: DeletedShop[] }>("/admin/deleted-shops");
      setDeletedShops(data.deletedShops);
    } catch (e: any) {
      alert("Failed to load deleted shops: " + (e?.message || "Unknown error"));
    } finally {
      setLoadingDeleted(false);
    }
  }

  async function handleCleanupExpired() {
    if (!window.confirm("Delete all shops that have been deleted for more than 30 days? This cannot be undone!")) {
      return;
    }

    try {
      setCleaningUp(true);
      const result = await api<{ success: boolean; deletedCount: number; message: string }>(
        "/admin/cleanup/expired",
        { method: "POST" }
      );
      alert(result.message);
      loadDeletedShops(); // Reload list
    } catch (e: any) {
      alert("Cleanup failed: " + (e?.message || "Unknown error"));
    } finally {
      setCleaningUp(false);
    }
  }

  async function handleDeleteShop(shop: DeletedShop) {
    if (!window.confirm(`Permanently delete "${shop.name}"? This cannot be undone!`)) {
      return;
    }

    try {
      setDeletingShop(shop.id);
      await api(`/admin/shops/${shop.slug}/permanent`, { method: "DELETE" });
      alert(`"${shop.name}" has been permanently deleted`);
      loadDeletedShops(); // Reload list
    } catch (e: any) {
      alert("Delete failed: " + (e?.message || "Unknown error"));
    } finally {
      setDeletingShop(null);
    }
  }

  function handleShowDeleted() {
    setShowDeleted(true);
    loadDeletedShops();
  }

  const filteredShops = shops.filter((shop) => {
    const matchesSearch =
      !searchQ ||
      shop.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      shop.slug.toLowerCase().includes(searchQ.toLowerCase()) ||
      shop.owner.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
      shop.owner.username?.toLowerCase().includes(searchQ.toLowerCase());

    const matchesStatus = statusFilter === "all" || shop.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading shops...
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
          <Button variant="secondary" onClick={loadShops}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Manage Shops</h1>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
            {filteredShops.length} shops
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleShowDeleted}>
          🗑️ Deleted Shops
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", overflowX: "auto" }}>
        <FilterButton
          label="All"
          active={statusFilter === "all"}
          onClick={() => {
            params.set("status", "all");
            nav(`?${params.toString()}`);
          }}
        />
        <FilterButton
          label="Open"
          active={statusFilter === "open"}
          onClick={() => {
            params.set("status", "open");
            nav(`?${params.toString()}`);
          }}
        />
        <FilterButton
          label="Paused"
          active={statusFilter === "paused"}
          onClick={() => {
            params.set("status", "paused");
            nav(`?${params.toString()}`);
          }}
        />
        <FilterButton
          label="Closed"
          active={statusFilter === "closed"}
          onClick={() => {
            params.set("status", "closed");
            nav(`?${params.toString()}`);
          }}
        />
      </div>

      {/* Shops List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredShops.map((shop) => (
          <Card
            key={shop.id}
            padding="md"
            hover
            onClick={() => nav(`/admin/shops/${shop.slug}`)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "2px" }}>
                  {shop.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  @{shop.slug}
                </div>
              </div>
              <Badge
                variant={
                  shop.status === "open"
                    ? "success"
                    : shop.status === "paused"
                    ? "warning"
                    : "neutral"
                }
                size="sm"
              >
                {shop.status}
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
              <Stat label="Products" value={shop.productsCount} />
              <Stat label="Orders" value={shop.ordersCount} />
              <Stat label="Revenue" value={`${shop.revenue.toLocaleString()} ETB`} />
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "var(--color-text-tertiary)",
                marginTop: "8px",
              }}
            >
              Owner: {shop.owner.name || shop.owner.username || shop.owner.tgId}
            </div>
          </Card>
        ))}

        {filteredShops.length === 0 && (
          <Card padding="lg">
            <div style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
              No shops found
            </div>
          </Card>
        )}
      </div>

      {/* Deleted Shops Modal */}
      {showDeleted && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowDeleted(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              padding: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Deleted Shops</h2>
              <button
                onClick={() => setShowDeleted(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  padding: "0 8px",
                }}
              >
                ×
              </button>
            </div>

            {loadingDeleted ? (
              <div style={{ textAlign: "center", padding: "20px" }}>Loading...</div>
            ) : deletedShops.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
                No deleted shops found
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "16px", display: "flex", gap: "8px" }}>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleCleanupExpired}
                    disabled={cleaningUp || !deletedShops.some(s => s.isExpired)}
                  >
                    {cleaningUp ? "Deleting..." : `Delete All Expired (${deletedShops.filter(s => s.isExpired).length})`}
                  </Button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {deletedShops.map((shop) => (
                    <Card key={shop.id} padding="md">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "2px" }}>
                            {shop.name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                            @{shop.slug}
                          </div>
                          {shop.owner && (
                            <div style={{ fontSize: "11px", color: "#999" }}>
                              Owner: {shop.owner.name || shop.owner.username}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={shop.isExpired ? "error" : shop.daysRemaining <= 7 ? "warning" : "info"}
                          size="sm"
                        >
                          {shop.isExpired ? "EXPIRED" : `${shop.daysRemaining}d left`}
                        </Badge>
                      </div>

                      <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                        Deleted {shop.daysSinceDeletion} days ago
                      </div>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteShop(shop)}
                        disabled={deletingShop === shop.id}
                        style={{ width: "100%" }}
                      >
                        {deletingShop === shop.id ? "Deleting..." : "Delete Permanently"}
                      </Button>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
