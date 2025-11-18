// apps/webapp/src/routes/ShopInvitations.tsx
import React from "react";
import { useParams, useLocation } from "react-router-dom";
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

    const loc = useLocation();

  const params = new URLSearchParams(loc.search || "");
  const searchQ = (params.get("q") || "").trim().toLowerCase();

  const filteredMembers =
    !data || !searchQ
      ? data?.members || []
      : data.members.filter((m) => {
          const u = m.user;
          const haystack =
            (u.name || "") +
            " " +
            (u.username || "") +
            " " +
            (u.tgId || "") +
            " " +
            (m.role || "") +
            " " +
            new Date(m.createdAt).toLocaleDateString();
          return haystack.toLowerCase().includes(searchQ);
        });


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

          {data.members.length > 0 && filteredMembers.length === 0 && (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              No members match your search.
            </div>
          )}

          {filteredMembers.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {filteredMembers.map((m) => {

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

                const initials = (u.name || u.username || u.tgId || "?")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={m.id}
                    style={{
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,.08)",
                      padding: 10,
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
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
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {initials}
                    </div>

                    {/* text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        {displayName}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          textTransform: "capitalize",
                        }}
                      >
                        {roleLabel}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>
                        Joined {joinedStr}
                      </div>
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
