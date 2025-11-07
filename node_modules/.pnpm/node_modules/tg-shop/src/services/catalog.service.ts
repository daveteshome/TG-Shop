import { db } from "../lib/db";
import { getTenantId } from "./tenant.util";
import { publicImageUrl } from "../lib/r2";


// If you prefer, move to config/env
const CDN = process.env.CDN_IMAGE_BASE!; // e.g. https://...workers.dev/img

/** ===== Types ===== */

type ProductDTO = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  stock: number;
  active: boolean;
  categoryId: string | null;
  photoUrl: string | null;
  tenant?: { id: string; slug: string; name: string; publicPhone: string | null };
};

/** ===== Image helpers ===== */

function photoFromImage(image: { bucketKeyBase: string } | null, w = 512) {
  return image ? `${CDN}/${image.bucketKeyBase}/orig?w=${w}&fmt=auto` : null;
}

function resolveImageForWeb(productId: string, ref?: string | null, version?: string) {
  if (!ref) return null;
  if (/^https?:\/\//i.test(ref)) return ref;
  if (/^tg:file_id:/i.test(ref)) return `/api/products/${productId}/image${version ? `?v=${version}` : ""}`;
  return null;
}

/** ===== DTO mapping ===== */

function toProductDTO(p: any): ProductDTO {
  const first = p.images?.[0] || null;

    let pf: string | null = null;
  // ✅ R2 (from bucketKeyBase)
  if (first?.image?.bucketKeyBase && process.env.CDN_IMAGE_BASE) {
    pf = `${process.env.CDN_IMAGE_BASE}/${first.image.bucketKeyBase}/orig?w=512&fmt=auto`;
  } else if (first?.webUrl) {
    pf = first.webUrl; // if your ProductImage has this field
  } else if (first?.url) {
    if (/^https?:\/\//i.test(first.url)) pf = first.url;
    else if (/^tg:file_id:/i.test(first.url)) pf = `/api/products/${p.id}/image`;
  } else {
    pf = null;
  }

  const dto: ProductDTO = {
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    price: Number(p.price),
    currency: p.currency,
    stock: p.stock,
    active: p.active,
    photoUrl: pf,
    categoryId: p.categoryId ?? null,
  };

  if (p.tenant) {
    dto.tenant = {
      id: p.tenant.id,
      slug: p.tenant.slug,
      name: p.tenant.name,
      publicPhone: p.tenant.publicPhone,
    };
  }

  return dto;
}

/** ===== Private helpers ===== */

async function listCategoriesRaw() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: [{ level: "asc" }, { position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      parentId: true,
      level: true,
      position: true,
      isActive: true,
    },
  });
}

/** ===== Service API ===== */

export const CatalogService = {
  async listCategories() {
    const cats = await listCategoriesRaw();
    return [{ id: "all", title: "All", icon: "🛒"}, ...cats.map((c) => ({ id: c.id, title: c.name, icon: c.icon || null, }))];
  },

  async listAllCategoriesForCascader() {
    const rows = await listCategoriesRaw();
    return rows.map((r) => ({
      id: r.id,
      name: r.name ?? "",
      slug: r.slug,
      parentId: r.parentId,
      level: r.level ?? 0,
      icon: r.icon ?? null,
    }));
  },

  async listActiveCategories() {
    const rows = await listCategoriesRaw();
    return rows.map((c) => ({ id: c.id, title: c.name ?? "" }));
  },

  async upsertCategoryByTitle(title: string) {
    const clean = title.trim();
    const slug =
      clean
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64) || "category";

    const existing = await db.category.findUnique({ where: { slug } });
    if (existing) return { id: existing.id, title: existing.name };

    const created = await db.category.create({
      data: { slug, name: clean, isActive: true, level: 0, position: 0 },
      select: { id: true, name: true },
    });

    return { id: created.id, title: created.name };
  },

  /** ===== Product listing (paged) ===== */
  async listProductsByCategoryPaged(categoryId: string, page: number, perPage: number) {
    const tenantId = await getTenantId();
    const where: any = { tenantId, active: true };

    if (categoryId && categoryId !== "all") {
      const descendants = await getDescendantCategoryIds(categoryId);
      where.categoryId = { in: [categoryId, ...descendants] };
    }

    const safePage = Math.max(1, Number(page || 1));
    const safePer = Math.max(1, Number(perPage || 12));

    const total = await db.product.count({ where });
    const items = await db.product.findMany({
      where,
      orderBy: [{ title: "asc" }],
      skip: (safePage - 1) * safePer,
      take: safePer,
      include: {
        images: {
          orderBy: { position: "asc" },
          take: 1,
          include: { image: true }, // ✅ include R2 image
        },
      },
    });

    return {
      items: items.map(toProductDTO),
      total,
      pages: Math.max(1, Math.ceil(total / safePer)),
      page: safePage,
      perPage: safePer,
    };
  },

  /** ===== Product listing (non-paged) ===== */
  async listProductsByCategory(categoryId: string) {
    const tenantId = await getTenantId();
    const where: any = { tenantId, active: true };

    if (categoryId && categoryId !== "all") {
      const descendants = await getDescendantCategoryIds(categoryId);
      where.categoryId = { in: [categoryId, ...descendants] };
    }

    const items = await db.product.findMany({
      where,
      orderBy: [{ title: "asc" }],
      include: {
        images: {
          orderBy: { position: "asc" },
          take: 1,
          include: { image: true }, // ✅ include R2 image
        },
      },
    });

    return items.map(toProductDTO);
  },

  /** ===== Universal Shop feed ===== */
  async listUniversalFeed(opts?: {
    q?: string;
    categoryId?: string;
    limit?: number;
    cursor?: string;
  }) {
    const { q, categoryId, limit = 24, cursor } = opts || {};

    const where: any = {
      active: true,
      publishToUniversal: true,
      reviewStatus: "approved",
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(categoryId ? { categoryId } : {}),
    };

    const items = await db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        images: { orderBy: { position: "asc" }, take: 1, include: { image: true } },
        tenant: { select: { id: true, slug: true, name: true, publicPhone: true } },
      },
    });

    return {
      items: items.map(toProductDTO),
      nextCursor: items.length ? items[items.length - 1].id : null,
    };
  },

  async logContactIntent(productId: string, buyerTgId: string, type: "message" | "call") {
    const p = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, tenantId: true },
    });
    if (!p) throw new Error("Product not found");

    await db.contactIntent.create({
      data: { tenantId: p.tenantId, productId: p.id, buyerTgId, type },
    });

    return { ok: true };
  },

  async setPublishFlags(productId: string, flags: { isPublished?: boolean; publishToUniversal?: boolean }) {
    await getTenantId();
    return db.product.update({
      where: { id: productId },
      data: {
        ...(flags.isPublished !== undefined ? { isPublished: flags.isPublished } : {}),
        ...(flags.publishToUniversal !== undefined
          ? { publishToUniversal: flags.publishToUniversal, reviewStatus: "pending" }
          : {}),
      },
      select: { id: true, isPublished: true, publishToUniversal: true, reviewStatus: true },
    });
  },

  async reviewUniversalProduct(productId: string, status: "approved" | "rejected", reviewerId?: string) {
    return db.product.update({
      where: { id: productId },
      data: {
        reviewStatus: status,
        reviewedAt: new Date(),
        reviewedBy: reviewerId ?? null,
      },
      select: { id: true, publishToUniversal: true, reviewStatus: true, reviewedAt: true, reviewedBy: true },
    });
  },
};

/** ===== Category counts ===== */

export type CascaderNode = {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
};

export type CategoryWithCounts = CascaderNode & {
  countDirect: number;
  countWithDesc: number;
};

export async function listCategoriesWithCountsForShop(
  tenantId: string
): Promise<CategoryWithCounts[]> {
  const nodes: CascaderNode[] = await CatalogService.listAllCategoriesForCascader();

  const counts = await db.product.groupBy({
    by: ["categoryId"],
    _count: { _all: true },
    where: { tenantId, active: true },
  });

  const directCountMap = new Map<string, number>();
  counts.forEach((c: any) => {
    if (c.categoryId) directCountMap.set(String(c.categoryId), c._count._all);
  });

  const children = new Map<string | null, string[]>();
  nodes.forEach((n) => {
    const list = children.get(n.parentId) || [];
    list.push(n.id);
    children.set(n.parentId, list);
  });

  const out = new Map<string, CategoryWithCounts>();
  nodes.forEach((n) => {
    out.set(n.id, { ...n, countDirect: directCountMap.get(n.id) || 0, countWithDesc: 0 });
  });

  const memo = new Map<string, number>();
  const dfs = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    const me = out.get(id)!;
    const kids = children.get(id) || [];
    let sum = me.countDirect;
    for (const cid of kids) sum += dfs(cid);
    memo.set(id, sum);
    me.countWithDesc = sum;
    return sum;
  };

  (children.get(null) || []).forEach((rootId) => dfs(rootId));

  return Array.from(out.values());
}

/** Collect all descendant category ids */
async function getDescendantCategoryIds(rootId: string): Promise<string[]> {
  const seen = new Set<string>();
  let frontier: string[] = [String(rootId)];

  while (frontier.length > 0) {
    const rows = await db.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    const kids = rows.map((r) => String(r.id));

    const fresh: string[] = [];
    for (const id of kids) {
      if (!seen.has(id)) {
        seen.add(id);
        fresh.push(id);
      }
    }
    frontier = fresh;
  }

  return Array.from(seen);
}
