import React from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TopBar } from "../components/layout/TopBar";
import { api } from "../lib/api/index";
import { CategoryGrid } from "../components/categories/CategoryGrid";
import type { Category as UiCategory } from "../components/categories/CategoryCard";

/** Backend shape from GET /categories (adjust if needed) */
type RawCategory = {
  id: string;
  name: string;
  slug?: string | null;
  parentId?: string | null;
  level?: number | null;
  // possible icon fields coming from backend:
  iconUrl?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  webUrl?: string | null;
  image?: { webUrl?: string | null } | null;
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

/** Remove diacritics (NFKD) and strip combining marks */
function stripDiacritics(s: string): string {
  try {
    return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  } catch {
    return s;
  }
}

/** normalize to keys like: phones_and_tablets, home_furniture_and_appliances */
function normSlug(s?: string | null): string {
  if (!s) return "";
  let x = s;

  // Normalize unicode & whitespace variants
  x = stripDiacritics(x)
    .replace(/\u00A0/g, " ")      // NBSP -> space
    .replace(/[&＆]/g, " and ");  // ASCII & full-width -> ' and '

  // Lower, collapse non-alnum runs to underscore
  x = x
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "_")
    .replace(/^_+|_+$/g, "");

  // Collapse multiple underscores
  x = x.replace(/_+/g, "_");

  return x;
}

/** Lowercased, punctuation-lite version for keyword heuristics */
function normLoose(s: string): string {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/\u00A0/g, " ")
    .replace(/[^\p{Letter}\p{Number} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ShopCategories() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  const [data, setData] = React.useState<Tree | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await api<RawCategory[]>("/categories");
        if (!mounted) return;
        setData(buildTree(rows));
      } catch (e: any) {
        if (!mounted) return;
        setErr(String(e?.message || "Failed to load"));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** Fallback emoji by normalized slug (include common variants) */
  const fallbackBySlug: Record<string, string> = {
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

  /** Heuristic fallback for misspellings/variants (e.g., “agricaluture”, “commerital equipements”) */
  function heuristicEmoji(name: string, norm: string): string | undefined {
    const loose = normLoose(name);

    // Food & Agriculture variants / misspellings
    if (
      (loose.includes("food") && (loose.includes("agri") || loose.includes("farm") || loose.includes("produce") || loose.includes("grocery"))) ||
      norm.includes("food_agri") ||
      norm.includes("food_agricul") // catches "agricaluture" etc.
    ) {
      return "🥦";
    }

    // Commercial equipment variants / misspellings
    if (
      loose.includes("commercial") &&
      (loose.includes("equip") || loose.includes("machine") || loose.includes("industrial") || loose.includes("factory") || loose.includes("tools") || loose.includes("supplies"))
    ) {
      return "🏭";
    }

    return undefined;
  }

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
        <div style={{ color: "#900" }}>
          {t("msg_failed_to_load")}: {err}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 16 }}>
        <TopBar title={t("title_categories")} />
        <div>{t("msg_loading")}</div>
      </div>
    );
  }

  const gridParents: UiCategory[] = data.parents.map((p) => {
    const norm = p.slug ? normSlug(p.slug) : normSlug(p.name);
    const iconUrl =
      p.iconUrl ??
      p.icon ??
      p.imageUrl ??
      p.webUrl ??
      p.image?.webUrl ??
      undefined;

    let emoji: string | undefined = undefined;
    if (!iconUrl) {
      emoji = fallbackBySlug[norm] || heuristicEmoji(p.name, norm);
    }

    // Dev-only: surface any we still miss
    if (process.env.NODE_ENV !== "production" && !iconUrl && !emoji) {
      // eslint-disable-next-line no-console
      console.debug("[Categories] No icon & no emoji fallback for:", {
        id: p.id,
        name: p.name,
        slug: p.slug,
        norm,
      });
    }

    return {
      id: p.id,
      title: titleFor(p),
      iconUrl,
      emoji,
    };
  });

  const activeChildren = activeId ? data.childrenByParent[activeId] || [] : [];

  return (
    <div style={{ padding: 12 }}>
      <TopBar title={t("title_categories")} />

      {/* Parent icon grid (4 per row, wraps, no horizontal scroll) */}
      <CategoryGrid
        categories={gridParents}
        activeId={activeId}
        onPick={(id) => setActiveId((prev) => (prev === id ? "" : id))}
      />

      {/* Children block rendered below grid */}
      {activeId && (
        <div style={{ marginTop: 10 }}>
          <div style={parentHeader}>
            {titleFor(data.parents.find((p) => p.id === activeId) || { id: "", name: "" })}
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
