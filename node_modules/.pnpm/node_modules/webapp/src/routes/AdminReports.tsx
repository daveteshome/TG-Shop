// Admin Reports Page
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api/index";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

type Report = {
  id: string;
  target: "TENANT" | "PRODUCT";
  tenantId: string;
  productId: string | null;
  reporterTgId: string | null;
  reason: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  product: {
    id: string;
    title: string;
  } | null;
};

export default function AdminReports() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");

  // Remember this page for back navigation
  useEffect(() => {
    localStorage.setItem("tgshop:lastAdminPage", "/admin/reports");
  }, []);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const data = await api<{ reports: Report[] }>("/admin/reports");
      setReports(data.reports);
    } catch (e: any) {
      setError(e?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  async function resolveReport(reportId: string) {
    try {
      await api(`/admin/reports/${reportId}/resolve`, {
        method: "PATCH",
      });
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, resolvedAt: new Date().toISOString() } : r
        )
      );
    } catch (e: any) {
      alert(e?.message || "Failed to resolve report");
    }
  }

  const filteredReports = reports.filter((report) => {
    if (filter === "pending") return !report.resolvedAt;
    if (filter === "resolved") return !!report.resolvedAt;
    return true;
  });

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Loading reports...
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
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Reports</h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
          {filteredReports.length} reports
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <FilterButton
          label="Pending"
          active={filter === "pending"}
          onClick={() => setFilter("pending")}
        />
        <FilterButton
          label="Resolved"
          active={filter === "resolved"}
          onClick={() => setFilter("resolved")}
        />
        <FilterButton
          label="All"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
      </div>

      {/* Reports List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredReports.map((report) => (
          <Card key={report.id} padding="md">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <Badge
                variant={report.target === "PRODUCT" ? "info" : "warning"}
                size="sm"
              >
                {report.target}
              </Badge>
              <Badge
                variant={report.resolvedAt ? "success" : "error"}
                size="sm"
              >
                {report.resolvedAt ? "Resolved" : "Pending"}
              </Badge>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
                {report.target === "PRODUCT" && report.product
                  ? report.product.title
                  : report.tenant.name}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                Shop: {report.tenant.name} (@{report.tenant.slug})
              </div>
            </div>

            {report.reason && (
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                  marginBottom: "8px",
                  padding: "8px",
                  background: "var(--color-bg-secondary)",
                  borderRadius: "6px",
                }}
              >
                {report.reason}
              </div>
            )}

            <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginBottom: "8px" }}>
              Reported: {new Date(report.createdAt).toLocaleString()}
            </div>

            {!report.resolvedAt && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => resolveReport(report.id)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: "var(--color-success)",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() =>
                    report.target === "PRODUCT" && report.productId
                      ? nav(`/s/${report.tenant.slug}/p/${report.productId}`)
                      : nav(`/admin/shops/${report.tenant.slug}`)
                  }
                  style={{
                    padding: "4px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border-main)",
                    background: "#fff",
                    color: "var(--color-text-secondary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  View {report.target === "PRODUCT" ? "Product" : "Shop"}
                </button>
              </div>
            )}
          </Card>
        ))}

        {filteredReports.length === 0 && (
          <Card padding="lg">
            <div style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>
              No reports found
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
