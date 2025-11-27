import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { Badge } from "../components/ui/Badge";

type TeamMember = {
  userId: string;
  name: string;
  username: string | null;
  role: string;
  totalActions: number;
  salesCount: number;
  salesRevenue: number;
  stockAdditions: number;
  stockAdded: number;
  adjustments: number;
  lastActivity: string | null;
};

type Totals = {
  totalMembers: number;
  totalActions: number;
  totalSales: number;
  totalRevenue: number;
  totalStockAdditions: number;
  totalAdjustments: number;
};

export default function TeamPerformance() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamMember[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);

  // Get search query from URL
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get("q") || "";

  useEffect(() => {
    loadTeamPerformance();
  }, [slug]);

  async function loadTeamPerformance() {
    if (!slug) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await api<{ teamPerformance: TeamMember[]; totals: Totals }>(
        `/shop/${slug}/team-performance`
      );
      setTeamPerformance(data.teamPerformance);
      setTotals(data.totals);
    } catch (err: any) {
      console.error("Failed to load team performance:", err);
      if (err.message?.includes('403') || err.message?.includes('Permission denied')) {
        setError("Only shop owners can view team performance");
      } else {
        setError("Failed to load team performance");
      }
    } finally {
      setLoading(false);
    }
  }

  function getRoleBadgeVariant(role: string): "primary" | "success" | "warning" | "neutral" {
    switch (role) {
      case "OWNER": return "primary";
      case "COLLABORATOR": return "success";
      case "HELPER": return "warning";
      default: return "neutral";
    }
  }

  function getRoleLabel(role: string): string {
    switch (role) {
      case "OWNER": return "Owner";
      case "COLLABORATOR": return "Manager";
      case "HELPER": return "Sales Staff";
      case "MEMBER": return "Observer";
      default: return role;
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div style={{ padding: 16, paddingBottom: 80, background: "#F9FAFB", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 16, color: "#6B7280" }}>Loading team performance...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16, paddingBottom: 80, background: "#F9FAFB", minHeight: "100vh" }}>
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: 40,
          textAlign: "center",
          border: "1px solid #E5E7EB",
          marginTop: 40,
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#EF4444", marginBottom: 8 }}>
            {error}
          </div>
          <div style={{ fontSize: 14, color: "#6B7280" }}>
            Use the back button to return to analytics
          </div>
        </div>
      </div>
    );
  }

  // Filter team members by search query
  let filteredTeam = teamPerformance;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredTeam = teamPerformance.filter((member) => {
      return (
        member.name.toLowerCase().includes(q) ||
        (member.username && member.username.toLowerCase().includes(q)) ||
        getRoleLabel(member.role).toLowerCase().includes(q)
      );
    });
  }

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>👥 Team Performance</h1>

      {/* Summary */}
      {totals && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
          <div style={statBox}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{totals.totalMembers}</div>
            <div style={{ fontSize: 11, color: "#666" }}>Members</div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{totals.totalActions}</div>
            <div style={{ fontSize: 11, color: "#666" }}>Actions</div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#10B981" }}>{totals.totalSales}</div>
            <div style={{ fontSize: 11, color: "#666" }}>Sales</div>
          </div>
          <div style={statBox}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#10B981" }}>{totals.totalRevenue.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "#666" }}>Revenue</div>
          </div>
        </div>
      )}

      {/* Team List */}
      {filteredTeam.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
          {searchQuery ? "No team members found" : "No team activity yet"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredTeam.map((member, index) => (
            <div key={member.userId} style={card}>
              <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: index < 3 ? "#FFD700" : "#E5E7EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{member.name}</div>
                    <Badge variant={getRoleBadgeVariant(member.role)} size="sm">
                      {getRoleLabel(member.role)}
                    </Badge>
                  </div>
                  {member.username && (
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                      @{member.username}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#666" }}>
                    <span>⚡ {member.totalActions}</span>
                    <span>💰 {member.salesCount}</span>
                    <span>📦 {member.stockAdditions}</span>
                    <span>⚙️ {member.adjustments}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                    Last active: {formatDate(member.lastActivity)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
};

const statBox: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "8px 12px",
  textAlign: "center",
  minWidth: 70,
  flexShrink: 0,
};
