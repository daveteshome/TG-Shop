import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api/index";
import { useTranslation } from "react-i18next";
import { CategoryGrid } from "../../components/categories/CategoryGrid";
import type { Category as UiCategory } from "../../components/categories/CategoryCard";

/* ---------- Types ---------- */
type CategoryMeta = {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  slug?: string;
  iconEmoji?: string | null;
  iconUrl?: string | null;
  iconWebUrl?: string | null;
  emoji?: string | null;
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
  value: string | null; // selected categoryId for product list filter
  onChange: (categoryId: string | null, allIds?: Set<string>) => void;
  /** Optional override for the counts URL (use this from Universal) */
  countsUrlOverride?: string;
};

/* ---------- Component ---------- */
export default function ShopCategoryFilterGridIdentical({
  value,
  onChange,
  countsUrlOverride,
}: Props) {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<CategoryCountNode[]>([]);
  const [meta, setMeta] = useState<CategoryMeta[]>([]);
  const [stack, setStack] = useState<string | null>(null); // null=root, otherwise parentId

  const lastCollectedIds = useRef<Set<string> | null>(null);

  // Use tenant meta when slug exists; otherwise fall back to global categories
  const fetchMetaUrl = slug ? `/shop/${slug}/categories` : `/categories`;

  // Build counts URL correctly
  const countsUrl =
    countsUrlOverride ??
    (slug ? `/shop/${slug}/categories/with-counts` : `/universal/categories/with-counts`);

  /* ---------- Fetch categories ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        console.group("[ShopCategoryFilterGridIdentical] fetch");
        console.log("config:", { slug, countsUrl, fetchMetaUrl });

        const [countRes, metaRes] = await Promise.all([
          api<{ items?: CategoryCountNode[] }>(countsUrl),
          api<{ items?: CategoryMeta[] } | CategoryMeta[]>(fetchMetaUrl),
        ]);

        if (!mounted) return;

        const metaItemsRaw = Array.isArray(metaRes) ? metaRes : (metaRes.items || []);
        // Normalize meta.parentId undefined → null
        const metaItems = metaItemsRaw.map((m) => ({
          ...m,
          parentId: (m.parentId ?? null) as string | null,
          level: Number(m.level ?? 0),
        }));

        // Normalize counts.parentId undefined → null
        const countsItems = (countRes.items || []).map((c) => ({
          ...c,
          parentId: (c.parentId ?? null) as string | null,
          level: Number((c as any).level ?? c.level ?? 0),
          countDirect: Number(c.countDirect ?? 0),
          countWithDesc: Number(c.countWithDesc ?? c.countDirect ?? 0),
        }));

        console.log("counts len:", countsItems.length, "meta len:", metaItems.length);
        if (countsItems.length) console.log("counts sample[0]:", countsItems[0]);
        if (metaItems.length) console.log("meta sample[0]:", metaItems[0]);

        setCounts(countsItems);
        setMeta(metaItems);
      } catch (e: any) {
        console.error("Category load error", e?.message || e);
      } finally {
        if (mounted) setLoading(false);
        console.groupEnd();
      }
    })();
    return () => {
      mounted = false;
    };
    // include countsUrl because it can change between Shop vs Universal usage
  }, [slug, fetchMetaUrl, countsUrl]);

  /* ---------- Merge + index ---------- */
  const metaById = useMemo(() => {
    const m = new Map<string, CategoryMeta>();
    meta.forEach((x) => m.set(x.id, x));
    return m;
  }, [meta]);

  const merged = useMemo(() => {
    const out = counts.map((c) => {
      const m = metaById.get(c.id);
      const parentId = (m?.parentId ?? c.parentId ?? null) as string | null; // force null for roots
      return {
        ...c,
        ...(m || {}),
        name: (m?.name ?? c.name) as string,
        parentId,
        level: Number(m?.level ?? c.level ?? 0),
        iconWebUrl: m?.iconWebUrl ?? m?.iconUrl ?? null,
        emoji: (m as any)?.emoji ?? (m as any)?.icon ?? m?.iconEmoji ?? null,
      } as CategoryMeta & CategoryCountNode;
    });
    console.log("[ShopCategoryFilterGridIdentical] merged len:", out.length);
    return out;
  }, [counts, metaById]);

  /* ---------- Build children map ---------- */
  const children = useMemo(() => {
    const map = new Map<string | null, Array<CategoryMeta & CategoryCountNode>>();
    merged.forEach((n) => {
      if ((n.countWithDesc ?? 0) <= 0) return;
      const key: string | null = n.parentId ?? null;
      const list = map.get(key) || [];
      list.push(n);
      map.set(key, list);
    });
    for (const [k, v] of map) v.sort((a, b) => a.name.localeCompare(b.name));
    console.log("[ShopCategoryFilterGridIdentical] children keys:", Array.from(map.keys()));
    console.log("[ShopCategoryFilterGridIdentical] root count:", (map.get(null) || []).length);
    return map;
  }, [merged]);

  /* ---------- Recursive descendant collector ---------- */
  const collectDescendantIds = useMemo(() => {
    return (rootId: string | null): Set<string> => {
      if (!rootId) return new Set();
      const all = new Set<string>();
      const st = [rootId];
      while (st.length) {
        const id = st.pop()!;
        if (all.has(id)) continue;
        all.add(id);
        const kids = children.get(id) || [];
        for (const k of kids) st.push(k.id);
      }
      return all;
    };
  }, [children]);

  /* ---------- UI build ---------- */
  if (loading) return null;

  const rootParents = children.get(null) || [];
  if (rootParents.length === 0) {
    // On-screen debug block so we can see exactly what's wrong
    return (
      <div style={{ padding: "8px 12px" }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>No categories found.</div>
        <pre
          style={{
            fontSize: 12,
            background: "#f7f7f7",
            border: "1px solid rgba(0,0,0,.08)",
            borderRadius: 8,
            padding: 8,
            whiteSpace: "pre-wrap",
          }}
        >
{`DEBUG
slug: ${slug ?? "null"}
countsUrl: ${countsUrl}
fetchMetaUrl: ${fetchMetaUrl}
counts.length: ${counts.length}
meta.length: ${meta.length}
merged.length: ${merged.length}
children.keys: ${JSON.stringify(Array.from(children.keys()))}
`}
        </pre>
      </div>
    );
  }

  const atChild = stack !== null;
  const activeParentId = stack;

  const mapToUi = (arr: Array<CategoryMeta & CategoryCountNode>): UiCategory[] =>
    arr.map((n) => ({
      id: n.id,
      title: n.name,
      iconUrl: n.iconWebUrl || undefined,
      emoji: n.emoji || undefined,
    }));

  const parentUi = mapToUi(rootParents);
  const childCandidates = atChild ? (children.get(activeParentId!) || []) : [];
  const childUi = atChild
    ? mapToUi(childCandidates.filter((n) => (n.countDirect ?? 0) > 0))
    : [];

  /* ---------- Handlers ---------- */
  const onPickParent = (id: string) => {
    const allIds = collectDescendantIds(id);
    lastCollectedIds.current = allIds;
    onChange(id, allIds);

    const hasDirectChildrenWithProducts = (children.get(id) || []).some(
      (n) => (n.countDirect ?? 0) > 0
    );
    if (hasDirectChildrenWithProducts) setStack(id);
    else setStack(null);
  };

  const onPickChild = (id: string) => {
    const allIds = collectDescendantIds(id);
    lastCollectedIds.current = allIds;
    onChange(id, allIds);
  };

  const onBack = () => {
    setStack(null);
    lastCollectedIds.current = null;
    onChange(null, undefined);
  };

  /* ---------- Render ---------- */
  return (
    <div style={{ padding: "0 12px 6px 12px" }}>
      {atChild && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t("btn_back")}
          style={backBtn}
        >
          ‹
        </button>
      )}

      {!atChild ? (
        <CategoryGrid categories={parentUi} activeId={value || ""} onPick={onPickParent} />
      ) : (
        <CategoryGrid categories={childUi} activeId={value || ""} onPick={onPickChild} />
      )}
    </div>
  );
}

/* ---------- Styles ---------- */
const backBtn: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,.12)",
  background: "#fff",
  color: "#111",
  width: 28,
  height: 28,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "6px 0 8px 0",
  cursor: "pointer",
};
