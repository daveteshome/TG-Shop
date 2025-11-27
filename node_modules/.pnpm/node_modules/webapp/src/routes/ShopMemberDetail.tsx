// apps/webapp/src/routes/ShopMemberDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api/index";
import type { ShopRole } from "../lib/permissions";
import { getRoleLabel, getRoleBadgeColor } from "../lib/permissions";

type Member = {
  id: string;
  userId: string;
  role: ShopRole;
  createdAt: string;
  updatedAt: string;
  user: {
    tgId: string;
    username?: string | null;
    name?: string | null;
  };
};

export default function ShopMemberDetail() {
  const { slug, userId } = useParams<{ slug: string; userId: string }>();
  const nav = useNavigate();

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<ShopRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<ShopRole | null>(null);

  useEffect(() => {
    if (!slug || !userId) return;
    loadMember();
  }, [slug, userId]);

  async function loadMember() {
    try {
      setLoading(true);
      const data = await api<{ member: Member }>(`/shop/${slug}/team/${userId}`);
      setMember(data.member);
      setSelectedRole(data.member.role);
      
      // Get current user's role
      const profile = await api<{ tgId: string }>('/profile');
      const tenantData = await api<{ id: string }>(`/shop/${slug}`);
      const membersData = await api<{ members: Member[] }>(`/tenants/${tenantData.id}/members`);
      const currentMember = membersData.members.find(m => m.userId === profile.tgId);
      if (currentMember) {
        setCurrentUserRole(currentMember.role);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load member");
    } finally {
      setLoading(false);
    }
  }

  function handleChangeRoleClick() {
    if (!selectedRole || selectedRole === member?.role) return;
    setShowConfirmDialog(true);
  }

  async function handleConfirmRoleChange() {
    if (!slug || !userId || !selectedRole) return;

    try {
      setSaving(true);
      setShowConfirmDialog(false);
      await api(`/shop/${slug}/team/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: selectedRole }),
      });
      alert("Role updated successfully!");
      loadMember();
    } catch (e: any) {
      alert(e?.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember() {
    if (!slug || !userId || !member) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove ${member.user.name || member.user.username || "this member"} from the shop?`
    );
    if (!confirmed) return;

    try {
      await api(`/shop/${slug}/team/${userId}`, {
        method: "DELETE",
      });
      alert("Member removed successfully!");
      nav(`/shop/${slug}/invitations`);
    } catch (e: any) {
      alert(e?.message || "Failed to remove member");
    }
  }

  if (loading) {
    return <div style={{ padding: 16 }}>Loading...</div>;
  }

  if (error || !member) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", marginBottom: 16 }}>{error || "Member not found"}</div>
        <button onClick={() => nav(`/shop/${slug}/invitations`)} style={btnSecondary}>
          ← Back to Team
        </button>
      </div>
    );
  }

  const displayName = member.user.name || member.user.username || member.user.tgId;
  const joinDate = new Date(member.createdAt).toLocaleDateString();

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Team Member</h2>
      </div>

      {/* Member Info Card */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{displayName}</div>
            {member.user.username && (
              <div style={{ fontSize: 13, color: "#666" }}>@{member.user.username}</div>
            )}
          </div>
          <div
            style={{
              padding: "4px 12px",
              borderRadius: 999,
              background: getRoleBadgeColor(member.role),
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {getRoleLabel(member.role)}
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Telegram ID</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{member.user.tgId}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Joined</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{joinDate}</div>
          </div>
        </div>
      </div>

      {/* Change Role Section */}
      {member.role !== "OWNER" && currentUserRole && (currentUserRole === "OWNER" || currentUserRole === "COLLABORATOR") && (
        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Change Role</div>
          {currentUserRole === "OWNER" ? (
            // Owners can assign any role (except OWNER which is handled separately)
            <select
              value={selectedRole || ""}
              onChange={(e) => setSelectedRole(e.target.value as ShopRole)}
              style={input}
            >
              <option value="COLLABORATOR">Manager</option>
              <option value="HELPER">Sales Staff</option>
              <option value="MEMBER">Member</option>
            </select>
          ) : (
            // Collaborators can only assign HELPER and MEMBER roles
            <>
              {(member.role === "HELPER" || member.role === "MEMBER") ? (
                <select
                  value={selectedRole || ""}
                  onChange={(e) => setSelectedRole(e.target.value as ShopRole)}
                  style={input}
                >
                  <option value="HELPER">Sales Staff</option>
                  <option value="MEMBER">Member</option>
                </select>
              ) : (
                <div style={{ fontSize: 13, color: "#666", padding: 12, background: "#f8fafc", borderRadius: 8 }}>
                  You don't have permission to change this member's role.
                </div>
              )}
            </>
          )}
          {((currentUserRole === "OWNER") || (currentUserRole === "COLLABORATOR" && (member.role === "HELPER" || member.role === "MEMBER"))) && (
            <button
              onClick={handleChangeRoleClick}
              disabled={saving || selectedRole === member.role}
              style={{
                ...btnPrimary,
                marginTop: 12,
                opacity: selectedRole === member.role ? 0.5 : 1,
              }}
            >
              {saving ? "Saving..." : "Update Role"}
            </button>
          )}
        </div>
      )}

      {/* Danger Zone */}
      {member.role !== "OWNER" && currentUserRole && (
        (currentUserRole === "OWNER") || 
        (currentUserRole === "COLLABORATOR" && (member.role === "HELPER" || member.role === "MEMBER"))
      ) && (
        <div style={dangerCard}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#991B1B", marginBottom: 8 }}>
            Remove Member
          </div>
          <div style={{ fontSize: 13, color: "#7F1D1D", marginBottom: 12, lineHeight: 1.5 }}>
            This will remove {displayName} from the shop. They will lose all access immediately.
          </div>
          <button onClick={handleRemoveMember} style={btnDanger}>
            🗑️ Remove from Shop
          </button>
        </div>
      )}

      {/* Role Change Confirmation Dialog */}
      {showConfirmDialog && selectedRole && (
        <div style={overlay} onClick={() => setShowConfirmDialog(false)}>
          <div style={dialog} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Confirm Role Change</h3>
            </div>
            <div style={{ marginBottom: 20, fontSize: 14, lineHeight: 1.6, color: "#333" }}>
              Are you sure you want to change <strong>{displayName}</strong>'s role from{" "}
              <strong>{getRoleLabel(member.role)}</strong> to{" "}
              <strong>{getRoleLabel(selectedRole)}</strong>?
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowConfirmDialog(false)}
                style={btnSecondary}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRoleChange}
                style={btnPrimary}
                disabled={saving}
              >
                {saving ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,.04)",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

const dangerCard: React.CSSProperties = {
  background: "#FEF2F2",
  border: "2px solid #FCA5A5",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

const input: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.1)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  width: "100%",
};

const btnPrimary: React.CSSProperties = {
  background: "#000",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
};

const btnSecondary: React.CSSProperties = {
  background: "#fff",
  color: "#000",
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 8,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  background: "#DC2626",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const overlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const dialog: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 24,
  maxWidth: 400,
  width: "100%",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
};
