// apps/webapp/src/routes/ShopCategories.tsx
import React from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/layout/TopBar";
import { CategoryGrid } from "../components/categories/CategoryGrid";
import type { Category as UiCategory } from "../components/categories/CategoryCard";
import { api } from "../lib/api/index";
import CategoryCascader from "../components/CategoryCascader";

/** Backend shapes */
type RawCategory = {
  id: string;
  name: string;
  slug?: string | null;
  parentId?: string | null;
  level?: number | null;
  iconUrl?: string | null;      // definite URL field
  icon?: string | null;         // mixed: URL, emoji, or Lucide name
  imageUrl?: string | null;
  webUrl?: string | null;
  image?: { webUrl?: string | null } | null;
};

type LayoutResponse = {
  parents?: { order?: string[] } | null;
};

type Tree = {
  parents: RawCategory[];
  childrenByParent: Record<string, RawCategory[]>;
};

/* ---------- helpers: URL / emoji / slug normalizer ---------- */
function looksLikeUrl(v?: string | null) {
  return !!v && /^https?:\/\//i.test(v);
}
function looksLikeSingleEmoji(v?: string | null) {
  if (!v) return false;
  // quick heuristic for single-emoji strings
  return v.length <= 4 && /[\u231A-\uD83E\uDDFF]/.test(v);
}
function stripDiacritics(s: string): string {
  try {
    return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  } catch {
    return s;
  }
}
function normSlug(s?: string | null): string {
  if (!s) return "";
  let x = s;
  x = stripDiacritics(x).replace(/\u00A0/g, " ").replace(/[&＆]/g, " and ");
  x = x.toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, "_").replace(/^_+|_+$/g, "");
  x = x.replace(/_+/g, "_");
  return x;
}

export default function ShopCategories() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const loc = useLocation();

  const [tree, setTree] = React.useState<Tree | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [activeId, setActiveId] = React.useState<string>("");
  const [savingTick, setSavingTick] = React.useState(0);
  const [parentOrder, setParentOrder] = React.useState<string[] | null>(null);
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  
  // Category request state
  const [showRequestForm, setShowRequestForm] = React.useState(false);
  const [requestName, setRequestName] = React.useState("");
  const [requestDescription, setRequestDescription] = React.useState("");
  const [requestIcon, setRequestIcon] = React.useState("");
  const [requestParentId, setRequestParentId] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  
  // User's requests
  const [myRequests, setMyRequests] = React.useState<any[]>([]);
  const [showMyRequests, setShowMyRequests] = React.useState(false);

  // 0) Load tenant ID from slug and user's requests
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!slug) return;
      try {
        const shop = await api<{ id: string }>(`/shop/${slug}`);
        if (!mounted) return;
        setTenantId(shop.id);
        
        // Load user's category requests
        try {
          const requestsData = await api<{ requests: any[] }>(
            `/category-requests/my-requests?tenantId=${shop.id}`
          );
          if (!mounted) return;
          setMyRequests(requestsData.requests);
        } catch (e) {
          console.error("Failed to load requests:", e);
        }
      } catch (e: any) {
        console.error("Failed to load shop:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  // 1) Load canonical categories
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await api<RawCategory[]>("/categories");
        if (!mounted) return;
        setTree(buildTree(rows));
      } catch (e: any) {
        if (!mounted) return;
        setErr(String(e?.message || "Failed to load"));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 2) Load user layout if available
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!slug) return;
      try {
        const layout = await api<LayoutResponse>(`/shop/${slug}/categories/layout`);
        if (!mounted) return;
        const order = layout?.parents?.order;
        if (order && Array.isArray(order) && order.length > 0) {
          setParentOrder(order);
        }
      } catch {
        // endpoint might not exist yet; ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const fallbackIcons: Record<string, string> = {
    trending: "🔥",
    vehicles: "🚗",
    property: "🏠",
    phones_and_tablets: "📱",
    phones_tablets: "📱",
    electronics: "💻",
    home_furniture_and_appliances: "🛋️",
    home_furniture_appliances: "🛋️",
    beauty_and_personal_care: "🧴",
    beauty_personal_care: "🧴",
    fashion: "👗",
    leisure_and_activities: "🏃",
    leisure_activities: "🏃",
    seeking_work_cvs: "📄",
    services: "🛠️",
    jobs: "💼",
    babies_and_kids: "🧸",
    babies_kids: "🧸",
    pets: "🐶",
    food_agriculture: "🥦",
    food_and_agriculture: "🥦",
    food_agricultural: "🥦",
    commercial_equipment: "🏭",
    commercial_equipment_and_supplies: "🏭",
    commercial_equipment_tools: "🏭",
    repair_and_construction: "👷",
    repair_construction: "👷",
  };

  function titleFor(cat: RawCategory): string {
    const key = cat.slug ? `category.${cat.slug}` : "";
    if (key) {
      const translated = t(key);
      if (translated !== key) return translated;
    }
    return cat.name || "";
  }

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <TopBar title={t("title_categories")} />
        <div style={{ color: "#900" }}>{t("msg_failed_to_load")}: {err}</div>
      </div>
    );
  }

  if (!tree) {
    return (
      <div style={{ padding: 16 }}>
        <TopBar title={t("title_categories")} />
        <div>{t("msg_loading")}</div>
      </div>
    );
  }

  // Build UI parents and apply saved order
  let parents = tree.parents.map((p) => {
    const norm = p.slug ? normSlug(p.slug) : normSlug(p.name);

    // ----- Robust icon inference -----
    // 1) URLs from the explicit URL fields
    let iconUrl: string | undefined =
      (looksLikeUrl(p.iconUrl) ? p.iconUrl : undefined) ??
      (looksLikeUrl(p.imageUrl) ? p.imageUrl : undefined) ??
      (looksLikeUrl(p.webUrl) ? p.webUrl : undefined) ??
      (looksLikeUrl(p.image?.webUrl) ? p.image?.webUrl! : undefined);

    // 2) If p.icon is present, classify it: URL vs emoji vs icon name
    if (!iconUrl && p.icon) {
      if (looksLikeUrl(p.icon)) {
        iconUrl = p.icon;
      }
    }

    // 3) Emoji default (only when we don't have iconUrl)
    let emoji: string | undefined;
    if (!iconUrl) {
      if (looksLikeSingleEmoji(p.icon)) {
        emoji = p.icon!;
      } else {
        emoji = fallbackIcons[norm]; // may be undefined; that's fine
      }
    }

    // 4) Optional Lucide icon name (used by CategoryCard if supported)
    // Only set when not URL and not emoji.
    let iconName: string | undefined;
    if (!iconUrl && !emoji && p.icon && typeof p.icon === "string") {
      iconName = p.icon; // e.g., "Utensils", "Home", "Package"
    }

    return {
      id: p.id,
      title: titleFor(p),
      iconUrl,
      emoji,
      iconName,         // harmless if your CategoryCard ignores it
    } as UiCategory;
  });

  if (parentOrder && parentOrder.length > 0) {
    const indexById = new Map(parents.map((p, i) => [p.id, i]));
    parents = [...parents].sort((a, b) => {
      const ai = parentOrder.indexOf(a.id);
      const bi = parentOrder.indexOf(b.id);
      const aPos = ai >= 0 ? ai : (indexById.get(a.id) ?? 1e9);
      const bPos = bi >= 0 ? bi : (indexById.get(b.id) ?? 1e9);
      return aPos - bPos;
    });
  }

      // Filter parents by search query (?q=...)
    const params = new URLSearchParams(loc.search || "");
    const q = (params.get("q") || "").trim().toLowerCase();
    if (q) {
      parents = parents.filter((p) =>
        p.title.toLowerCase().includes(q)
      );
    }

  const activeChildren = activeId ? tree.childrenByParent[activeId] || [] : [];

  // Auto-save on reorder (always enabled)
  async function handleReorderParent(newOrderIds: string[]) {
    setParentOrder(newOrderIds); // optimistic
    try {
      if (!slug) return;
      await api<LayoutResponse>(`/shop/${slug}/categories/layout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parents: { order: newOrderIds } }),
      });
      setSavingTick((n) => n + 1);
    } catch {
      // silent fail; order remains locally
    }
  }

  // Submit category request
  async function handleSubmitRequest() {
    if (!requestName.trim()) {
      alert("Category name is required");
      return;
    }

    if (!tenantId) {
      alert("Shop information not loaded yet");
      return;
    }

    try {
      setSubmitting(true);
      await api("/category-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: requestName.trim(),
          description: requestDescription.trim() || null,
          icon: requestIcon.trim() || null,
          parentId: requestParentId,
          tenantId: tenantId,
        }),
      });

      // Reset form
      setRequestName("");
      setRequestDescription("");
      setRequestIcon("");
      setRequestParentId(null);
      setShowRequestForm(false);
      
      // Reload requests
      if (tenantId) {
        try {
          const requestsData = await api<{ requests: any[] }>(
            `/category-requests/my-requests?tenantId=${tenantId}`
          );
          setMyRequests(requestsData.requests);
        } catch (e) {
          console.error("Failed to reload requests:", e);
        }
      }
      
      alert("Category request submitted! Admin will review it soon.");
    } catch (e: any) {
      alert(e?.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <TopBar title={t("title_categories")} />

      {/* Request Category Button */}
      {!showRequestForm && (
        <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setShowRequestForm(true)}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              border: "1px solid #2563eb",
              borderRadius: 8,
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            📝 Request New Category
          </button>
          
          {myRequests.length > 0 && (
            <button
              onClick={() => setShowMyRequests(!showMyRequests)}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                border: "1px solid #ddd",
                borderRadius: 8,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {showMyRequests ? "Hide" : "Show"} My Requests ({myRequests.length})
            </button>
          )}
        </div>
      )}

      {/* Request Form */}
      {showRequestForm && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#f9f9f9",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Request New Category
          </h3>
          
          <input
            value={requestName}
            onChange={(e) => setRequestName(e.target.value)}
            placeholder="Category name *"
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: 8,
              border: "1px solid #ddd",
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          
          <textarea
            value={requestDescription}
            onChange={(e) => setRequestDescription(e.target.value)}
            placeholder="Description (optional)"
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: 8,
              border: "1px solid #ddd",
              borderRadius: 6,
              fontSize: 14,
              minHeight: 60,
              resize: "vertical",
            }}
          />
          
          <input
            value={requestIcon}
            onChange={(e) => setRequestIcon(e.target.value)}
            placeholder="Icon emoji (e.g., 🚗)"
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: 8,
              border: "1px solid #ddd",
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: "#666", marginBottom: 4, display: "block" }}>
              Parent Category (optional)
            </label>
            <CategoryCascader
              value={requestParentId}
              onChange={(id) => setRequestParentId(id)}
              placeholder="Select parent category"
            />
          </div>
          
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSubmitRequest}
              disabled={submitting}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 500,
                border: "1px solid #2563eb",
                borderRadius: 6,
                background: "#2563eb",
                color: "#fff",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
            <button
              onClick={() => {
                setRequestName("");
                setRequestDescription("");
                setRequestIcon("");
                setRequestParentId(null);
                setShowRequestForm(false);
              }}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                border: "1px solid #ddd",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* My Requests Display */}
      {showMyRequests && myRequests.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>My Category Requests</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myRequests.map((req) => {
              const statusColor = 
                req.status === "approved" ? "#4caf50" :
                req.status === "rejected" ? "#f44336" :
                "#ff9800";
              
              const statusLabel =
                req.status === "approved" ? "✓ Approved" :
                req.status === "rejected" ? "✕ Rejected" :
                "⏳ Pending Review";
              
              return (
                <div
                  key={req.id}
                  style={{
                    padding: 12,
                    border: `2px solid ${statusColor}20`,
                    borderRadius: 8,
                    background: `${statusColor}05`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
                    {req.icon && (
                      <div style={{ fontSize: 24 }}>{req.icon}</div>
                    )}
                    <div style={{ flex: 1 }}>

                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                        {req.name}
                      </div>
                      {req.description && (
                        <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>
                          {req.description}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: 12,
                            padding: "3px 10px",
                            borderRadius: 12,
                            background: statusColor,
                            color: "#fff",
                            fontWeight: 500,
                          }}
                        >
                          {statusLabel}
                        </span>
                        <span style={{ fontSize: 11, color: "#999" }}>
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {/* Show rejection note if rejected */}
                      {req.status === "rejected" && req.rejectNote && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 10,
                            background: "#fff3cd",
                            borderRadius: 6,
                            borderLeft: "3px solid #ff9800",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#856404", marginBottom: 4 }}>
                            Admin's Note:
                          </div>
                          <div style={{ fontSize: 13, color: "#856404" }}>
                            {req.rejectNote}
                          </div>
                        </div>
                      )}
                      
                      {/* Show success message if approved */}
                      {req.status === "approved" && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 10,
                            background: "#d4edda",
                            borderRadius: 6,
                            borderLeft: "3px solid #4caf50",
                          }}
                        >
                          <div style={{ fontSize: 13, color: "#155724" }}>
                            ✓ Your category has been approved and is now available!
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this request?")) return;
                        try {
                          await api(`/category-requests/${req.id}`, {
                            method: "DELETE",
                          });
                          // Reload requests
                          if (tenantId) {
                            const requestsData = await api<{ requests: any[] }>(
                              `/category-requests/my-requests?tenantId=${tenantId}`
                            );
                            setMyRequests(requestsData.requests);
                          }
                        } catch (e: any) {
                          alert(e?.message || "Failed to delete request");
                        }
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "1px solid #ddd",
                        background: "#fff",
                        color: "#f44336",
                        fontSize: 16,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                      title="Delete request"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tiny "Saved" toast (auto on successful save) */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <SavedToast key={savingTick} label={t("ui.common.saved")} />
      </div>

      {/* Parent grid: always draggable; click opens children */}
      <CategoryGrid
        categories={parents}
        activeId={activeId}
        onPick={(id) => setActiveId((prev) => (prev === id ? "" : id))}
        onReorder={handleReorderParent}
      />

      {/* Children block */}
      {activeId && (
        <div style={{ marginTop: 10 }}>
          <div style={parentHeader}>
            {(tree.parents.find((p) => p.id === activeId)?.name) || ""}
          </div>

          {activeChildren.length === 0 ? (
            <div style={childRow}>{t("categories_no_children")}</div>
          ) : (
            <div>
              {activeChildren.map((c) => (
                <div key={c.id} style={childRow}>
                  {titleFor(c)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- local helpers ---------- */
function buildTree(rows: RawCategory[]): Tree {
  const parents = rows.filter((r) => !r.parentId || r.level === 0);
  const childrenByParent: Record<string, RawCategory[]> = {};
  for (const r of rows) {
    if (r.parentId) {
      if (!childrenByParent[r.parentId]) childrenByParent[r.parentId] = [];
      childrenByParent[r.parentId].push(r);
    }
  }
  return { parents, childrenByParent };
}

function SavedToast({ label }: { label: string }) {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1100);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div
      style={{
        fontSize: 12,
        opacity: 0.9,
        background: "rgba(0,0,0,0.75)",
        color: "#fff",
        padding: "4px 8px",
        borderRadius: 8,
      }}
    >
      {label}
    </div>
  );
}

const parentHeader: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 16,
  margin: "10px 0 6px",
  color: "var(--tg-theme-text-color, #111)",
};

const childRow: React.CSSProperties = {
  paddingLeft: 14,
  paddingTop: 6,
  paddingBottom: 6,
  fontSize: 14,
  color: "var(--tg-theme-text-color, #111)",
};
