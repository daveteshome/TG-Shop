import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api/index";
import { useTranslation } from "react-i18next";

// reuse the exact UI used by Profile/Categories
import { CategoryGrid } from "../../components/categories/CategoryGrid";
import type { Category as UiCategory } from "../../components/categories/CategoryCard";

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
  value: string | null;                 // selected categoryId for product list filter
  onChange: (categoryId: string | null) => void;
};

export default function ShopCategoryFilterGridIdentical({ value, onChange }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<CategoryCountNode[]>([]);
  const [meta, setMeta] = useState<CategoryMeta[]>([]);
  const [stack, setStack] = useState<string | null>(null); // null=root, otherwise parentId

  // use the SAME source as Profile for icons/names
  const fetchMetaUrl = `/categories`;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [countRes, metaRes] = await Promise.all([
          api<{ items: CategoryCountNode[] }>(`/shop/${slug}/categories/with-counts`),
          api<{ items?: CategoryMeta[] } | CategoryMeta[]>(fetchMetaUrl),
        ]);

        if (!mounted) return;
        const metaItems = Array.isArray(metaRes) ? metaRes : (metaRes.items || []);

        setCounts(countRes.items || []);
        setMeta(metaItems);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug, fetchMetaUrl]);

  // Build maps
  const metaById = useMemo(() => {
    const m = new Map<string, CategoryMeta>();
    meta.forEach(x => m.set(x.id, x));
    return m;
  }, [meta]);

  const merged = useMemo(() => {
    // merge meta (visuals) + counts (visibility only)
    return counts.map(c => {
      const m = metaById.get(c.id);
      return {
        ...c,
        ...(m || {}),
        name: m?.name ?? c.name,
        parentId: (m?.parentId ?? c.parentId) as string | null,
        level: Number(m?.level ?? c.level ?? 0),
        iconWebUrl: m?.iconWebUrl ?? m?.iconUrl ?? null,
        
        emoji: (m as any)?.emoji ?? (m as any)?.icon ?? m?.iconEmoji ?? null,
      } as CategoryMeta & CategoryCountNode;
    });
  }, [counts, metaById]);

  // Build children map; strip empty branches by subtree
  const children = useMemo(() => {
    const map = new Map<string | null, Array<CategoryMeta & CategoryCountNode>>();
    merged.forEach(n => {
      if ((n.countWithDesc ?? 0) <= 0) return; // hide parents without any products in subtree
      const list = map.get(n.parentId) || [];
      list.push(n);
      map.set(n.parentId, list);
    });
    for (const [k, v] of map) v.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [merged]);

  if (loading) return null;
  const rootParents = children.get(null) || [];
  if (rootParents.length === 0) return null;

  const atChild = stack !== null;
  const activeParentId = stack;

  // Map helpers → UiCategory for CategoryGrid (exact UI)
  const mapToUi = (arr: Array<CategoryMeta & CategoryCountNode>): UiCategory[] =>
    arr.map(n => ({
      id: n.id,
      title: n.name,
      iconUrl: n.iconWebUrl || undefined,
      emoji: n.emoji || undefined,
    }));

  // Parent grid items (subtree has items)
  const parentUi = mapToUi(rootParents);

  // Child grid items (direct items only)
  const childCandidates = atChild ? (children.get(activeParentId!) || []) : [];
  const childUi = atChild
    ? mapToUi(childCandidates.filter(n => (n.countDirect ?? 0) > 0))
    : [];

  // Click handlers — keep your filter + drill
  const onPickParent = (id: string) => {
    onChange(id); // filter products by this parent by default
    const hasDirectChildrenWithProducts = (children.get(id) || []).some(n => (n.countDirect ?? 0) > 0);
    if (hasDirectChildrenWithProducts) setStack(id);
    else setStack(null);
  };

  const onPickChild = (id: string) => {
    onChange(id);
  };

  const onBack = () => {
    setStack(null);
    onChange(null); // reset selection when backing out
  };

  return (
    <div style={{ padding: "0 12px 6px 12px" }}>
      {/* Back chevron ONLY when drilled */}
      {atChild ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={t("btn_back")}
          style={backBtn}
        >
          ‹
        </button>
      ) : null}

      {/* 🔴 IMPORTANT: render ONE grid at a time */}
      {!atChild ? (
        // Parents grid — EXACT same UI as Profile
        <CategoryGrid
          categories={parentUi}
          activeId={value || ""}
          onPick={onPickParent}
        />
      ) : (
        // Children grid — only when drilled (parents hidden)
        <CategoryGrid
          categories={childUi}
          activeId={value || ""}
          onPick={onPickChild}
        />
      )}
    </div>
  );
}

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
