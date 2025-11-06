import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/layout/TopBar";
import { api } from "../lib/api/index";
import { CategoryGrid } from "../components/categories/CategoryGrid";
import type { Category as UiCategory } from "../components/categories/CategoryCard";

/** Backend shapes */
type RawCategory = {
  id: string;
  name: string;
  slug?: string | null;
  parentId?: string | null;
  level?: number | null;
  iconUrl?: string | null;
  icon?: string | null;
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

  const [tree, setTree] = React.useState<Tree | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [activeId, setActiveId] = React.useState<string>("");
  const [savingTick, setSavingTick] = React.useState(0);
  const [parentOrder, setParentOrder] = React.useState<string[] | null>(null);

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
    const iconUrl =
      p.iconUrl ?? p.icon ?? p.imageUrl ?? p.webUrl ?? p.image?.webUrl ?? undefined;
    const emoji = !iconUrl ? fallbackIcons[norm] : undefined;
    return { id: p.id, title: titleFor(p), iconUrl, emoji } as UiCategory;
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

  return (
    <div style={{ padding: 12 }}>
      <TopBar title={t("title_categories")} />

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
