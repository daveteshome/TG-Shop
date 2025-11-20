import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";
import { TopBar } from "../components/layout/TopBar";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  publicPhone?: string | null;
  logoWebUrl?: string | null;
  description?: string | null;
};

type ShopsPayload = {
  universal: { title: string; key: string };
  myShops: Tenant[];
  joinedShops: Tenant[];
};

export default function JoinedShops() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState<Tenant[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const loc = useLocation();
  const params = new URLSearchParams(loc.search || "");
  const q = (params.get("q") || "").trim().toLowerCase();

  const filteredJoined = !q
    ? joined
    : joined.filter((t) => {
        const name = (t.name || "").toLowerCase();
        const slug = (t.slug || "").toLowerCase();
        return name.includes(q) || slug.includes(q);
      });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await api<ShopsPayload>("/shops/list");
        if (!mounted) return;
        setJoined(res.joinedShops || []);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load shops");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--tg-theme-secondary-bg-color,#f5f5f7)",
        }}
      >
        <TopBar title="Shops you joined" />
        <div style={{ padding: "12px 16px" }}>Loading…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--tg-theme-secondary-bg-color,#f5f5f7)",
        }}
      >
        <TopBar title="Shops you joined" />
        <div style={{ padding: "12px 16px", color: "crimson" }}>{err}</div>
      </div>
    );
  }

  if (!joined.length) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--tg-theme-secondary-bg-color,#f5f5f7)",
        }}
      >
        <TopBar title="Shops you joined" />
        <div style={{ padding: 16 }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,.06)",
              borderRadius: 16,
              padding: 16,
              fontSize: 14,
              opacity: 0.85,
            }}
          >
            You haven’t joined any shops yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--tg-theme-secondary-bg-color,#f5f5f7)",
      }}
    >
      <TopBar title="Shops you joined" />

      <div
        style={{
          padding: "12px 16px 24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {filteredJoined.length === 0 ? (
          <div
            style={{
              border: "1px solid rgba(0,0,0,.06)",
              borderRadius: 16,
              padding: 16,
              opacity: 0.7,
              background: "#fff",
              fontSize: 14,
            }}
          >
            No shops match your search.
          </div>
        ) : (
          filteredJoined.map((t) => (
            <button
              key={t.id}
              onClick={() => nav(`/s/${t.slug}`)}
              style={cardButton}
            >
              <ShopAvatar
                name={t.name || t.slug || "Shop"}
                url={t.logoWebUrl || null}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    color: "#111827",
                  }}
                >
                  {t.name || "Unnamed shop"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6B7280",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    marginTop: 2,
                  }}
                >
                  {t.description?.trim() || `@${t.slug}`}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  marginLeft: 8,
                }}
              >
                <span style={memberPill}>Member</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const cardButton: React.CSSProperties = {
  background: "var(--tg-theme-bg-color,#fff)",
  border: "1px solid rgba(0,0,0,.06)",
  borderRadius: 16,
  padding: 12,
  display: "flex",
  alignItems: "center",
  gap: 12,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const memberPill: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 8px",
  borderRadius: 999,
  background: "#F3F4F6",
  color: "#4B5563",
  fontWeight: 500,
};

function ShopAvatar({ name, url }: { name: string; url: string | null }) {
  const size = 40;
  const [errored, setErrored] = React.useState(false);

  const initials =
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "999px",
        backgroundColor: "#eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {url && !errored ? (
        <img
          src={url}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={() => setErrored(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
