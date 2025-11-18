import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api/index";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  publicPhone?: string | null;
  // backend /shop/:slug also returns logoWebUrl, but /shops/list includes tenant: true from membership
  // so logo may be missing here; we’ll render initials fallback.
  logoWebUrl?: string | null;
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
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div style={{ padding: 16 }}>Loading…</div>;
  }
  if (err) {
    return <div style={{ padding: 16, color: "crimson" }}>{err}</div>;
  }
  if (!joined.length) {
    return (
      <div style={{ padding: 16 }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,.06)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          You haven’t joined any shops yet.
        </div>
      </div>
    );
  }

    return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      {filteredJoined.length === 0 ? (
        <div
          style={{
            border: "1px solid rgba(0,0,0,.06)",
            borderRadius: 12,
            padding: 16,
            opacity: 0.7,
          }}
        >
          No shops match your search.
        </div>
          ) : (
      filteredJoined.map((t) => {
        const initials = (t.name || t.slug || "?")
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <button
            key={t.id}
            onClick={() => nav(`/s/${t.slug}`)}
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,.06)",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            {/* avatar circle */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid rgba(0,0,0,.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
                background: "rgba(0,0,0,.02)",
              }}
            >
              {initials}
            </div>

            {/* text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {t.name || "Unnamed shop"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                @{t.slug}
              </div>
            </div>
          </button>
        );
      })
    )}
    </div>
  );

}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const size = 36;
  const initials =
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return url ? (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: 8, objectFit: "cover" }}
      onError={(e) => ((e.currentTarget.style.display = "none"), void 0)}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: "#eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
      }}
    >
      {initials}
    </div>
  );
}
