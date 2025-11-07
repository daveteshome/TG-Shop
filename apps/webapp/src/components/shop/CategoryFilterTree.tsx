import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api/index";
import { useTranslation } from "react-i18next";

/**
 * Expected meta shape from your Profile/Categories endpoint.
 * Adjust the optional fields if your meta includes different icon keys.
 */
type CategoryMeta = {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  slug?: string;
  // optional icon fields your Profile UI already uses:
  iconEmoji?: string | null;
  iconUrl?: string | null;
  iconWebUrl?: string | null;
};

type CategoryCountNode = {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  countDirect: number;
  countWithDesc: number;
};

type Props = {
  value: string | null;                 // selected categoryId for product list filter
  onChange: (categoryId: string | null) => void;
  /** Optional: provide your own CategoryCard renderer used in Profile screen */
  renderCategoryCard?: (args: {
    node: CategoryMeta & CategoryCountNode;
    active: boolean;
    onClick: () => void;
    atChildLevel: boolean;
  }) => React.ReactNode;
};

/**
 * ShopCategoryFilterGrid
 * - 4-per-row grid like your Profile/Categories page
 * - Root level shows parents that have products in subtree (countWithDesc > 0)
 * - Drilling into a parent shows only children that have direct products (countDirect > 0)
 * - Clicking a tile sets the category filter for products below
 */
export default function ShopCategoryFilterGrid({ value, onChange, renderCategoryCard }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [counts, setCounts] = useState<CategoryCountNode[]>([]);
  const [meta, setMeta] = useState<CategoryMeta[]>([]);

  // breadcrumb stack for drilling down: null = root (parents)
  const [stack, setStack] = useState<string | null>(null);

  // TODO: set to the same endpoint your Profile/Categories page uses.
  // If your Profile screen calls another path (e.g. /categories/full), change this:
  const fetchMetaUrl = `/shop/${slug}/categories`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Run both requests in parallel
        const [countRes, metaRes] = await Promise.all([
          api<{ items: CategoryCountNode[] }>(`/shop/${slug}/categories/with-counts`),
          api<{ items?: CategoryMeta[] } | CategoryMeta[]>(fetchMetaUrl),
        ]);

        if (!mounted) return;

        // Normalize meta (some routes return {items}, some return array)
        const metaItems = Array.isArray(metaRes) ? metaRes : (metaRes.items || []);

        setCounts(countRes.items || []);
        setMeta(metaItems);
        setErr(null);
      } catch {
        setErr(t("err_load_categories"));
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug, fetchMetaUrl, t]);

  // Merge counts with meta so we have icons/labels exactly like Profile page
  const metaById = useMemo(() => {
    const map = new Map<string, CategoryMeta>();
    for (const m of meta) map.set(m.id, m);
    return map;
  }, [meta]);

  const merged = useMemo(() => {
    return counts.map(c => {
      const m = metaById.get(c.id);
      return {
        ...c,
        ...(m || {}),
        name: m?.name ?? c.name,
        parentId: (m?.parentId ?? c.parentId) as string | null,
        level: Number(m?.level ?? c.level ?? 0),
        iconWebUrl: m?.iconWebUrl ?? m?.iconUrl ?? null,
        // 🔴 IMPORTANT: accept DB "icon" (emoji string) too
        emoji: (m as any)?.emoji ?? (m as any)?.icon ?? m?.iconEmoji ?? null,
      };
    });
  }, [counts, metaById]);

  // children map with empty branches removed
  const children = useMemo(() => {
    const map = new Map<string | null, Array<CategoryMeta & CategoryCountNode>>();
    merged.forEach(n => {
      if ((n.countWithDesc ?? 0) <= 0) return; // hide empty branch at root
      const list = map.get(n.parentId) || [];
      list.push(n as CategoryMeta & CategoryCountNode);
      map.set(n.parentId, list);
    });
    for (const [k, v] of map) v.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [merged]);

  const atChildLevel = stack !== null;

  // Items to show at current level:
  const items = useMemo(() => {
    const list = children.get(stack) || [];
    if (!atChildLevel) {
      // root: show parents (any subtree count > 0)
      return list;
    }
    // child level: only show nodes that have direct products
    return list.filter(n => (n.countDirect ?? 0) > 0);
  }, [children, stack, atChildLevel]);

  if (loading) {
    return <div style={{ padding: 12, fontSize: 13, opacity: 0.7 }}>{t("loading_categories")}</div>;
  }
  if (err) {
    return <div style={{ padding: 12, fontSize: 13, color: "crimson" }}>{err}</div>;
  }
  if ((children.get(null) || []).length === 0) {
    return null; // nothing to show
  }

  const onCardClick = (node: CategoryMeta & CategoryCountNode) => {
    if (!atChildLevel) {
      // Selecting a parent filters to its direct products
      onChange(node.id);
      // drill only if this parent has children with direct products
      const kids = (children.get(node.id) || []).filter(n => (n.countDirect ?? 0) > 0);
      if (kids.length > 0) setStack(node.id);
    } else {
      // child level: select child
      onChange(node.id);
    }
  };

  const goRoot = () => {
    setStack(null);
    onChange(null); // optional: reset filter when going up
  };

  return (
    <div style={{ padding: "8px 12px 6px 12px", background: "#fff", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
      {/* Top row: All + Back */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={goRoot} style={chip(!value && !atChildLevel)}>
          {t("filter_all")}
        </button>
        {atChildLevel ? (
          <button type="button" onClick={goRoot} style={chip(false)}>
            ← {t("btn_back")}
          </button>
        ) : null}
      </div>

      {/* 4-per-row grid — visually matching your Profile/Categories */}
      <div style={grid4}>
        {items.map((n) => {
          const active = value === n.id;

          // If you have a shared card component from Profile, use it here:
          if (renderCategoryCard) {
            return (
              <React.Fragment key={n.id}>
                {renderCategoryCard({ node: n, active, onClick: () => onCardClick(n), atChildLevel })}
              </React.Fragment>
            );
          }

          // Fallback: a visually similar tile (icon + label)
          const icon = n.iconWebUrl || n.iconUrl || null;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onCardClick(n)}
              style={card(active)}
              title={n.name}
            >
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 36, marginBottom: 4 }}>
                {icon ? (
                  <img src={icon} alt="" style={{ maxHeight: 32, maxWidth: 32, display: "block" }} />
                ) : (
                  <span style={{ fontSize: 22, lineHeight: "22px" }}>{n.iconEmoji ?? "🗂️"}</span>
                )}
              </div>
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: 12,
                  lineHeight: "16px",
                  minHeight: 32,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {n.name}
              </div>
              <div style={{ textAlign: "center", fontSize: 11, opacity: 0.6 }}>
                {!atChildLevel
                  ? (n.countDirect > 0 ? t("label_count_direct", { count: n.countDirect }) : t("label_count_mixed", { count: n.countWithDesc }))
                  : t("label_count_direct", { count: n.countDirect })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Layout & tokens — mirror your Profile grid feel (4 per row) */
const grid4: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
};

const card = (active: boolean): React.CSSProperties => ({
  textAlign: "center",
  padding: 10,
  background: active ? "#000" : "#fff",
  color: active ? "#fff" : "#111",
  borderRadius: 12,
  border: `1px solid ${active ? "#000" : "rgba(0,0,0,.10)"}`,
  cursor: "pointer",
  minHeight: 94,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
});

const chip = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 13,
  border: "1px solid",
  borderColor: active ? "#000" : "rgba(0,0,0,.2)",
  background: active ? "#000" : "#fff",
  color: active ? "#fff" : "#111",
  cursor: "pointer",
});
