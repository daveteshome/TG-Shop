import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api/index";
import type { Product as UiProduct } from "../../lib/types";

export type CatalogCategory = { id: string; title: string; parentId?: string | null };

type UseCatalogOpts =
  | { mode: "buyer" | "owner"; slug: string }
  | { mode: "universal" };

type CatalogResp = {
  categories: CatalogCategory[];
  products: UiProduct[];
};

export function useCatalog(opts: UseCatalogOpts) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<UiProduct[]>([]);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const mode = opts.mode;
  const slug = (opts as { slug?: string }).slug ?? null;

  // Build endpoint exactly like Buyer, but universal has its own catalog path
  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (categoryId) params.set("categoryId", categoryId);

    if (mode === "universal") {
      return `/universal/catalog?${params.toString()}`;
    }
    return `/shop/${slug}/catalog?${params.toString()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, slug, q, categoryId]);

  // prevent redundant refetch on identical inputs
  const fetchKeyRef = useRef<string>("");
  const buildKey = () => JSON.stringify({ mode, slug, endpoint });

  useEffect(() => {
    const key = buildKey();
    if (fetchKeyRef.current === key) return;
    fetchKeyRef.current = key;

    const ac = new AbortController();
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await api<CatalogResp>(endpoint, { signal: ac.signal as any });
        if (!cancelled && !ac.signal.aborted) {
          setCategories(r.categories || []);
          setProducts(r.products || []);
        }
      } catch (e: any) {
        if (!cancelled && !ac.signal.aborted) {
          setErr(e?.message || "Failed to load catalog");
        }
      } finally {
        if (!cancelled && !ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [endpoint, mode, slug]);

  return {
    loading,
    err,
    categories,
    products,
    q,
    setQ,
    categoryId,
    setCategoryId,
    clearFilters() {
      setQ("");
      setCategoryId(null);
    },
  };
}
