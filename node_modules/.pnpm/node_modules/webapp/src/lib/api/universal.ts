// apps/webapp/src/lib/api/universal.ts
import { api } from "./index";

export type UiCategory = {
  id: string;
  title?: string;
  name?: string;     // some schemas use "name"
  parentId?: string | null;
  level?: number;
  productCount?: number;
  countDirect?: number;
  countWithDesc?: number;
};

export type UiProduct = {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  photoUrl?: string | null;
  categoryId?: string | null;
  category?: { id: string; title?: string; parentId?: string | null } | null;
  tenant?: { slug?: string; name?: string } | null;
};

export type UniversalResult = {
  page: number;
  perPage: number;
  total: number;
  items: UiProduct[];
};

export async function fetchUniversalProducts(
  page = 1,
  perPage = 24,
  opts?: { q?: string; category?: string | null }
): Promise<UniversalResult> {
  const qs = new URLSearchParams({
    page: String(Math.max(1, page)),
    perPage: String(Math.min(50, Math.max(1, perPage))),
  });
  if (opts?.q?.trim()) qs.set("q", opts.q.trim());
  if (opts?.category) qs.set("category", opts.category);

  // IMPORTANT: api() adds the /api prefix and auth headers
  const raw = await api<{
    page?: number;
    perPage?: number;
    total?: number;
    items?: UiProduct[];
    products?: UiProduct[];
  }>(`/universal/products?${qs.toString()}`);

  const list =
    (Array.isArray(raw?.items) && raw!.items) ||
    (Array.isArray(raw?.products) && raw!.products) ||
    [];

  return {
    page: Number.isFinite(raw?.page as number) ? Number(raw!.page) : page,
    perPage: Number.isFinite(raw?.perPage as number) ? Number(raw!.perPage) : perPage,
    total: Number.isFinite(raw?.total as number) ? Number(raw!.total) : list.length,
    items: list,
  };
}

export async function fetchUniversalCategoryCounts(): Promise<
  {
    id: string;
    name: string;
    parentId: string | null;
    level: number;
    countDirect: number;
    countWithDesc: number;
  }[]
> {
  const raw = await api<{ items: any[] }>(`/universal/categories/with-counts`);
  const items = Array.isArray(raw?.items) ? raw!.items : [];
  // normalize "title" -> "name" if needed
  return items.map((c) => ({
    id: String(c.id),
    name: String(c.name ?? c.title ?? ""),
    parentId: c.parentId ?? null,
    level: Number(c.level ?? 0),
    countDirect: Number(c.countDirect ?? 0),
    countWithDesc: Number(c.countWithDesc ?? c.countDirect ?? 0),
  }));
}
