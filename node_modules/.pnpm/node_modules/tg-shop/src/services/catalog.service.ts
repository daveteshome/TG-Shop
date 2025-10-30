// apps/backend/src/services/catalog.service.ts
import { db } from '../lib/db';
import { getTenantId } from './tenant.util';

// If you prefer, move to config/env
const CDN = process.env.CDN_IMAGE_BASE!; // e.g. https://...workers.dev/img

/** ===== Helpers ===== */

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

function photoFromImage(image: { bucketKeyBase: string } | null, w = 512) {
  return image ? `${CDN}/${image.bucketKeyBase}/orig?w=${w}&fmt=auto` : null;
}

function resolveImageForWeb(productId: string, ref?: string | null, version?: string) {
  if (!ref) return null;
  if (/^https?:\/\//i.test(ref)) return ref;
  if (/^tg:file_id:/i.test(ref)) return `/api/products/${productId}/image${version ? `?v=${version}` : ''}`;
  return null;
}

function toProductDTO(p: any): ProductDTO {
  // Prefer R2/Cloudflare (Image) → fallback to legacy URL → null
  const pf =
    p.images?.[0]?.image
      ? photoFromImage(p.images[0].image, 512)
      : p.images?.[0]?.url
        ? resolveImageForWeb(p.id, p.images[0].url)
        : null;

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
  const tenantId = await getTenantId();
  return db.category.findMany({
    where: { tenantId, active: true },
    orderBy: [{ position: 'asc' }, { title: 'asc' }],
    select: { id: true, title: true, slug: true, position: true, active: true },
  });
}

/** ===== Service API ===== */

export const CatalogService = {
  /** Storefront: categories with virtual "All" first (local shop) */
  async listCategories() {
    const cats = await listCategoriesRaw();
    return [{ id: 'all', title: 'All' }, ...cats.map((c) => ({ id: c.id, title: c.title }))];
  },

  /** Admin: list active categories without "All" */
  async listActiveCategories() {
    const cats = await listCategoriesRaw();
    return cats.map((c) => ({ id: c.id, title: c.title }));
  },

  /** Admin: create/find a category by title (tenant-safe) */
  async upsertCategoryByTitle(title: string) {
    const tenantId = await getTenantId();
    const clean = title.trim();
    const slug = clean.toLowerCase().replace(/\s+/g, '-').slice(0, 64);
    const existing = await db.category.findFirst({ where: { tenantId, slug } });
    if (existing) return { id: existing.id, title: existing.title };
    const created = await db.category.create({
      data: { tenantId, title: clean, slug },
      select: { id: true, title: true },
    });
    return created;
  },

  /** Storefront: paged products (optional category filter) for local/private shop */
  async listProductsByCategoryPaged(categoryId: string, page: number, perPage: number) {
    const tenantId = await getTenantId();
    const where: any = { tenantId, active: true };
    if (categoryId && categoryId !== 'all') where.categoryId = categoryId;

    const safePage = Math.max(1, Number(page || 1));
    const safePer = Math.max(1, Number(perPage || 12));

    const total = await db.product.count({ where });
    const items = await db.product.findMany({
      where,
      orderBy: [{ title: 'asc' }],
      skip: (safePage - 1) * safePer,
      take: safePer,
      include: {
        images: { orderBy: { position: 'asc' }, take: 1, include: { image: true } },
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

  /** Storefront/Admin: non-paged list (optional category filter) for local/private shop */
  async listProductsByCategory(categoryId: string) {
    const tenantId = await getTenantId();
    const where: any = { tenantId, active: true };
    if (categoryId && categoryId !== 'all') where.categoryId = categoryId;

    const items = await db.product.findMany({
      where,
      orderBy: [{ title: 'asc' }],
      include: { images: { orderBy: { position: 'asc' }, take: 1, include: { image: true } } },
    });

    return items.map(toProductDTO);
  },

  /** ====== NEW: Universal Shop feed (global marketplace) ======
   * Only shows products with publishToUniversal = true AND reviewStatus = 'approved'
   * Optional search (q) and category filter.
   */
  async listUniversalFeed(opts?: {
    q?: string;
    categoryId?: string;
    limit?: number;
    cursor?: string; // id of last item for keyset pagination
  }) {
    const { q, categoryId, limit = 24, cursor } = opts || {};

    const where: any = {
      active: true,
      publishToUniversal: true,
      reviewStatus: 'approved',
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
      ...(categoryId ? { categoryId } : {}),
    };

    const items = await db.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        images: { orderBy: { position: 'asc' }, take: 1, include: { image: true } },
        tenant: { select: { id: true, slug: true, name: true, publicPhone: true } },
      },
    });

    return {
      items: items.map(toProductDTO),
      nextCursor: items.length ? items[items.length - 1].id : null,
    };
  },

  /** ====== NEW: Log contact from universal (message/call) ======
   * Call this when user taps "Message Seller" or "Call Seller".
   */
  async logContactIntent(productId: string, buyerTgId: string, type: 'message' | 'call') {
    const p = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, tenantId: true },
    });
    if (!p) throw new Error('Product not found');

    await db.contactIntent.create({
      data: { tenantId: p.tenantId, productId: p.id, buyerTgId, type },
    });

    return { ok: true };
  },

  /** ====== NEW: Admin helpers (useful in bot or admin UI) ====== */

  // Toggle publish flags for a product (local/universal)
  async setPublishFlags(productId: string, flags: { isPublished?: boolean; publishToUniversal?: boolean }) {
    const tenantId = await getTenantId();
    return db.product.update({
      where: { id: productId },
      data: {
        ...(flags.isPublished !== undefined ? { isPublished: flags.isPublished } : {}),
        ...(flags.publishToUniversal !== undefined
          ? { publishToUniversal: flags.publishToUniversal, reviewStatus: 'pending' }
          : {}),
      },
      select: { id: true, isPublished: true, publishToUniversal: true, reviewStatus: true },
    });
  },

  // Moderation: approve/reject a product for universal feed
  async reviewUniversalProduct(productId: string, status: 'approved' | 'rejected', reviewerId?: string) {
    // Platform admin guard should be enforced in the route/service caller.
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
