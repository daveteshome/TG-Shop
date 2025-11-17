// apps/webapp/src/routes/ShopInvitations.tsx
import React from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api/index";
import { useAsync } from "../lib/hooks/useAsync";
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
  avatarUrl?: string | null;
};

type Member = {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  createdAt: string;
  user: UserInfo;
};

type MembersResponse = {
  members: Member[];
};

export default function ShopInvitations() {
  const { slug } = useParams<{ slug: string }>();

  const q = useAsync(async () => {
    if (!slug) {
      throw new Error("Missing shop slug");
    }

    // 1) Load tenant by slug
    const tenant = await api<TenantInfo>(`/shop/${slug}`);

    // 2) Load members by tenantId
    const { members } = await api<MembersResponse>(
      `/tenants/${tenant.id}/members`
    );

    // sort by createdAt (oldest first)
    const sorted = [...members].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return { tenant, members: sorted };
  }, [slug]);

  const data = q.data;

  return (
    <div>
      <TopBar title="Invitations & Roles" />
      {q.loading && <div style={{ padding: 16 }}><Loader /></div>}
      {!q.loading && <div style={{ padding: 16 }}><ErrorView error={q.error} /></div>}

      {data && (
        <div style={{ padding: 16, paddingTop: 0 }}>
          <div style={{ marginBottom: 12, fontSize: 14, opacity: 0.8 }}>
            Team members for <b>{data.tenant.name}</b>
          </div>

          {data.members.length === 0 && (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              No members yet. Later you can invite collaborators here.
            </div>
          )}

          {data.members.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {data.members.map((m) => {
                const u = m.user;
                const displayName =
                  u.name || u.username || u.tgId || "(unknown user)";
                const roleLabel = m.role.toLowerCase();
                const joined = new Date(m.createdAt);
                const joinedStr = joined.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={m.id}
                    style={{
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,.08)",
                      padding: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {/* Simple circle avatar (we can later plug profile avatar here) */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {displayName}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {u.username && <>@{u.username} · </>}
                        {u.phone || "no phone"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", fontSize: 11 }}>
                      <div
                        style={{
                          padding: "2px 6px",
                          borderRadius: 999,
                          border: "1px solid rgba(0,0,0,.15)",
                          textTransform: "capitalize",
                          marginBottom: 4,
                        }}
                      >
                        {roleLabel}
                      </div>
                      <div style={{ opacity: 0.6 }}>Joined {joinedStr}</div>
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
