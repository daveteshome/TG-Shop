// apps/webapp/src/routes/ShopInvitations.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { TopBar } from "../components/layout/TopBar";
import { Loader } from "../components/common/Loader";
import { ErrorView } from "../components/common/ErrorView";

type TenantInfo = {
  id: string;
  name: string;
  slug: string;
};

type UserInfo = {
  tgId: string;
  username: string | null;
  name: string | null;
  phone: string | null;
  avatarUrl?: string | null;     // imageId in DB
  avatarWebUrl?: string | null;  // resolved URL from backend
};


type ShopRole = "OWNER" | "HELPER" | "COLLABORATOR" | "MEMBER";

type Member = {
  id: string;
  tenantId: string;
  userId: string;
  role: ShopRole;
  createdAt: string;
  user: UserInfo;
};

type MembersResponse = {
  members: Member[];
};

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; tenant: TenantInfo; members: Member[] };

const ROLE_LABEL: Record<ShopRole, string> = {
  OWNER: "Owner",
  HELPER: "Helper",
  COLLABORATOR: "Collaborator",
  MEMBER: "Member",
};

const ROLE_OPTIONS: { value: ShopRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "HELPER", label: "Helper" },
  { value: "COLLABORATOR", label: "Collaborator" },
  { value: "MEMBER", label: "Member" },
];

export default function ShopInvitations() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();

  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<ShopRole | null>(null);

  // Read search query from URL params (header SearchBox uses ?q=...)
  const location = useLocation();
  const params = new URLSearchParams(location.search || "");
  const urlQuery = (params.get("q") || "").trim();
  
  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  // Load tenant + members
  useEffect(() => {
    if (!slug) {
      setState({ status: "error", error: "Missing shop slug" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    setExpandedUserId(null);
    setLocalError(null);

    (async () => {
      try {
        const tenant = await api<TenantInfo>(`/shop/${slug}`);
        const { members } = await api<MembersResponse>(
          `/tenants/${tenant.id}/members`
        );

        // Get current user's role
        const profile = await api<{ tgId: string }>('/profile');
        const currentMember = members.find(m => m.userId === profile.tgId);
        if (currentMember) {
          setCurrentUserRole(currentMember.role);
        }

        const sorted = [...members].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
        );

        if (!cancelled) {
          setState({ status: "ready", tenant, members: sorted });
        }
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.message || String(e);
        setState({ status: "error", error: msg });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Determine which roles can be assigned based on current user's role
  function canAssignRole(targetRole: ShopRole): boolean {
    if (currentUserRole === "OWNER") {
      // Owners can assign any role
      return true;
    }
    if (currentUserRole === "COLLABORATOR") {
      // Collaborators can only assign HELPER and MEMBER roles
      return targetRole === "HELPER" || targetRole === "MEMBER";
    }
    // Helpers and Members cannot assign roles
    return false;
  }

  // Check if current user can change a specific member's role
  function canChangeMemberRole(member: Member): boolean {
    if (currentUserRole === "OWNER") {
      // Owners can change anyone's role
      return true;
    }
    if (currentUserRole === "COLLABORATOR") {
      // Collaborators can only change HELPER and MEMBER roles
      return member.role === "HELPER" || member.role === "MEMBER";
    }
    return false;
  }

  async function handleRoleChange(member: Member, newRole: ShopRole) {
    if (state.status !== "ready") return;
    if (member.role === newRole) return;

    // Check if current user can assign this role
    if (!canAssignRole(newRole)) {
      setLocalError(`You don't have permission to assign the ${ROLE_LABEL[newRole]} role.`);
      return;
    }

    // Check if current user can change this member's role
    if (!canChangeMemberRole(member)) {
      setLocalError(`You don't have permission to change this member's role.`);
      return;
    }

    setSavingUserId(member.userId);
    setLocalError(null);

    try {
      const tenantId = state.tenant.id;
      const payload = { role: newRole };

      const res = await api<{ member: Member }>(
        `/tenants/${tenantId}/members/${member.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const updated = res.member;

      setState((prev) => {
        if (prev.status !== "ready") return prev;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.userId === updated.userId ? updated : m
          ),
        };
      });
    } catch (e: any) {
      const msg = e?.message || String(e);
      setLocalError(msg);
    } finally {
      setSavingUserId(null);
    }
  }

  const loading = state.status === "idle" || state.status === "loading";

  return (
    <div>
      <TopBar title="Invitations & Roles" />

      {loading && (
        <div style={{ padding: 16 }}>
          <Loader />
        </div>
      )}

      {!loading && state.status === "error" && (
        <div style={{ padding: 16 }}>
          <ErrorView error={state.error} />
        </div>
      )}

      {state.status === "ready" && (
        <div style={{ padding: 16, paddingTop: 0 }}>



          {state.members.length === 0 && (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              No members yet. Later you can invite collaborators here.
            </div>
          )}

          {state.members.length > 0 && (() => {
            // Filter members based on search query
            const filtered = state.members.filter((m) => {
              if (!searchQuery.trim()) return true;
              const query = searchQuery.toLowerCase();
              const displayName = (m.user.name || m.user.username || m.user.tgId || "").toLowerCase();
              const role = ROLE_LABEL[m.role].toLowerCase();
              return displayName.includes(query) || role.includes(query);
            });

            if (filtered.length === 0) {
              return (
                <div style={{ fontSize: 13, opacity: 0.7, padding: 20, textAlign: "center" }}>
                  No members found matching "{searchQuery}"
                </div>
              );
            }

            // Group members by role
            const owners = filtered.filter(m => m.role === "OWNER");
            const collaborators = filtered.filter(m => m.role === "COLLABORATOR");
            const helpers = filtered.filter(m => m.role === "HELPER");
            const members = filtered.filter(m => m.role === "MEMBER");

            const renderMemberCard = (m: Member) => {
                const u = m.user;
                const displayName =
                  u.name || u.username || u.tgId || "(unknown user)";
                const roleLabel = ROLE_LABEL[m.role] ?? m.role;
                const created = new Date(m.createdAt);
                const createdStr = created.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

                const initials = (u.name || u.username || u.tgId || "?")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                const isExpanded = expandedUserId === m.userId;

                // Role-specific colors
                const roleColors: Record<ShopRole, string> = {
                  OWNER: "#dc2626",
                  COLLABORATOR: "#2563eb",
                  HELPER: "#16a34a",
                  MEMBER: "#6b7280",
                };

                return (
                  <div
                    key={m.id}
                    onClick={() => nav(`/shop/${slug}/team/${m.userId}`)}
                    style={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      padding: 14,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      cursor: "pointer",
                      background: "#fff",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#fff";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    {/* avatar circle */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        flexShrink: 0,
                        overflow: "hidden",
                        color: "#6b7280",
                      }}
                    >
                      {u.avatarWebUrl ? (
                        <img
                          src={u.avatarWebUrl}
                          alt={displayName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                          onError={(e) => {
                            // if image fails, fallback to initials
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        initials
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 15,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "#111827",
                          }}
                        >
                          {displayName}
                        </div>
                        <div
                          style={{
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: "#f3f4f6",
                            color: roleColors[m.role],
                            fontSize: 11,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {roleLabel}
                        </div>
                      </div>

                      {u.username && (
                        <div
                          style={{
                            fontSize: 13,
                            color: "#9ca3af",
                          }}
                        >
                          @{u.username}
                        </div>
                      )}

                      {isExpanded && (
                        <div
                          style={{
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: "1px solid rgba(0,0,0,.05)",
                            fontSize: 13,
                          }}
                        >
                          <div
                            style={{
                              marginBottom: 6,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span style={{ opacity: 0.7 }}>
                              Change role:
                            </span>
                            <select
                              value={m.role}
                              disabled={savingUserId === m.userId}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                handleRoleChange(
                                  m,
                                  e.target
                                    .value as ShopRole
                                )
                              }
                              style={{
                                padding: "4px 8px",
                                fontSize: 13,
                              }}
                            >
                              {ROLE_OPTIONS.map((opt) => (
                                <option
                                  key={opt.value}
                                  value={opt.value}
                                  disabled={
                                    opt.value === "OWNER" &&
                                    m.role !== "OWNER"
                                  }
                                >
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            {savingUserId === m.userId && (
                              <span
                                style={{
                                  fontSize: 12,
                                  opacity: 0.7,
                                }}
                              >
                                Saving…
                              </span>
                            )}
                          </div>

                          {localError && (
                            <div
                              style={{
                                color: "red",
                                fontSize: 12,
                              }}
                            >
                              {localError}
                            </div>
                          )}

                          {/* Later we can add:
                              - remove from shop
                              - resend invite
                              - permissions summary
                           */}
                        </div>
                      )}
                    </div>
                  </div>
                );
            };

            return (
              <div style={{ display: "grid", gap: 20 }}>
                {/* Owners Section */}
                {owners.length > 0 && (
                  <div>
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: 600, 
                      color: "#6b7280",
                      marginBottom: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                      Owners ({owners.length})
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {owners.map(renderMemberCard)}
                    </div>
                  </div>
                )}

                {/* Collaborators Section */}
                {collaborators.length > 0 && (
                  <div>
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: 600, 
                      color: "#6b7280",
                      marginBottom: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                      Managers ({collaborators.length})
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {collaborators.map(renderMemberCard)}
                    </div>
                  </div>
                )}

                {/* Helpers Section */}
                {helpers.length > 0 && (
                  <div>
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: 600, 
                      color: "#6b7280",
                      marginBottom: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                      Sales Staff ({helpers.length})
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {helpers.map(renderMemberCard)}
                    </div>
                  </div>
                )}

                {/* Members Section */}
                {members.length > 0 && (
                  <div>
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: 600, 
                      color: "#6b7280",
                      marginBottom: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                      Members ({members.length})
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {members.map(renderMemberCard)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
