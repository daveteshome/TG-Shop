// apps/webapp/src/routes/ShopInvitations.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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

  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

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

  async function handleRoleChange(member: Member, newRole: ShopRole) {
    if (state.status !== "ready") return;
    if (member.role === newRole) return;

    // Don't allow promoting to OWNER from here
    if (newRole === "OWNER" && member.role !== "OWNER") {
      setLocalError("Changing someone to OWNER is not allowed from here.");
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
          <div style={{ marginBottom: 12, fontSize: 14, opacity: 0.8 }}>
            Members of <b>{state.tenant.name}</b>
          </div>

          {state.members.length === 0 && (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              No members yet. Later you can invite collaborators here.
            </div>
          )}

          {state.members.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {state.members.map((m) => {
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

                return (
                  <div
                    key={m.id}
                    onClick={() =>
                      setExpandedUserId(
                        isExpanded ? null : m.userId
                      )
                    }
                    style={{
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,.08)",
                      padding: 10,
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      cursor: "pointer",
                    }}
                  >
                    {/* avatar circle */}
                    <div
  style={{
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "rgba(0,0,0,.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
    overflow: "hidden",
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


                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          marginBottom: 2,
                        }}
                      >
                        {displayName}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          marginBottom: 4,
                        }}
                      >
                        Role: <b>{roleLabel}</b> • Joined {createdStr}
                      </div>

                      {u.username && (
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.7,
                            marginBottom: 2,
                          }}
                        >
                          @{u.username}
                        </div>
                      )}

                      {u.phone && (
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.7,
                            marginBottom: 2,
                          }}
                        >
                          Phone: {u.phone}
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
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
