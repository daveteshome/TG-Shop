import { Router } from "express";
import { db } from "../lib/db";
import { publicImageUrl } from "../lib/r2";
import { CatalogService } from "../services/catalog.service";
import { extFromMime } from "./utils/ext";

const universalRouter = Router();

function buildWebUrlFromImage(im: any): string | null {
  if (!im) return null;
  if (im.imageId) {
    const mime = im.image?.mime?.toLowerCase?.() || "";
    let ext: "jpg" | "png" | "webp" = "jpg";
    if (mime.includes("png")) ext = "png";
    else if (mime.includes("webp")) ext = "webp";
    return publicImageUrl(im.imageId, ext);
  }
  if (im.url) return im.url;
  return null;
}

// GET /api/universal/products/:id
// GET /api/universal/products/:id
universalRouter.get("/universal/products/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing product ID" });

  try {
    const product = await db.product.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            publicPhone: true,
            publishUniversal: true,
            publicTelegramLink: true,
            logoImageId: true,
            deletedAt: true,
          },
        },
        images: {
          select: {
            id: true,
            imageId: true,
            url: true,
            position: true,
            image: { select: { mime: true } },
          },
          orderBy: { position: "asc" },
        },
        category: { select: { id: true, name: true, parentId: true } },
      },
    });

    if (!product) return res.status(404).json({ error: "Product not found" });
    
    // Only show approved products in universal shop from non-deleted shops
    if (!product.active || !product.publishToUniversal || product.reviewStatus !== 'approved' || product.tenant.deletedAt) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Track product view (fire-and-forget, don't block response)
    db.productStats.upsert({
      where: { productId: id },
      create: {
        productId: id,
        tenantId: product.tenantId,
        viewsTotal: 1,
        revenueTotal: 0,
      },
      update: {
        viewsTotal: { increment: 1 },
      },
    }).catch(err => console.error('Failed to track view:', err));

    // Build tenant logo URL if exists
    let logoWebUrl: string | null = null;
    if (product.tenant?.logoImageId) {
      const logoImg = await db.image.findUnique({
        where: { id: product.tenant.logoImageId },
        select: { mime: true },
      });
      const mime = logoImg?.mime?.toLowerCase() || "image/jpeg";
      let ext: "jpg" | "png" | "webp" = "jpg";
      if (mime.includes("png")) ext = "png";
      else if (mime.includes("webp")) ext = "webp";
      logoWebUrl = publicImageUrl(product.tenant.logoImageId, ext);
    }

    const tenant = product.tenant ? {
      ...product.tenant,
      logoWebUrl,
    } : null;

    const images = (product.images ?? []).map((im: any) => ({
      id: im.id,
      url: im.url ?? buildWebUrlFromImage(im),
      webUrl: im.url ?? buildWebUrlFromImage(im),
      position: im.position ?? 0,
    }));

    const photoUrl =
      images[0]?.webUrl ??
      images[0]?.url ??
      `/api/products/${product.id}/image`;

    const data = {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      currency: product.currency,
      stock: product.stock,
      tenantId: tenant?.id,
      tenant: tenant,
      categoryId: product.categoryId ?? null,
      category: product.category
        ? {
            id: product.category.id,
            title: product.category.name,
            parentId: product.category.parentId,
          }
        : null,
      images,
      photoUrl,
    };

    // ✅ Return exactly same shape as buyer/owner detail
    return res.json({
      product: data,
      images,
    });
  } catch (e: any) {
    console.error("[universal] product detail error:", e);
    return res
      .status(500)
      .json({ error: e?.message ?? "Failed to fetch product detail" });
  }
});

// Seeded random shuffle for deterministic but distributed product ordering
function seededShuffle<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let currentSeed = seed;
  
  // Simple seeded random number generator
  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  
  // Fisher-Yates shuffle with seeded random
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  return arr;
}

// Distribute products evenly across shops
function distributeProducts(products: any[]): any[] {
  // Group products by shop
  const byShop = new Map<string, any[]>();
  for (const p of products) {
    const shopId = p.tenantId || 'unknown';
    if (!byShop.has(shopId)) {
      byShop.set(shopId, []);
    }
    byShop.get(shopId)!.push(p);
  }
  
  // Interleave products from different shops
  const result: any[] = [];
  const shopQueues = Array.from(byShop.values());
  
  while (shopQueues.some(q => q.length > 0)) {
    for (const queue of shopQueues) {
      if (queue.length > 0) {
        result.push(queue.shift()!);
      }
    }
  }
  
  return result;
}

universalRouter.get("/universal/products", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(req.query.perPage ?? 24)));
  const q = (req.query.q as string | undefined)?.trim() || undefined;
  const category = (req.query.category as string | undefined)?.trim() || undefined;
  const categories = (req.query.categories as string | undefined)?.trim() || undefined;

  try {
    // Support both single category and multiple categories
    let categoryFilter: any = undefined;
    if (categories) {
      const catIds = categories.split(',').map(id => id.trim()).filter(Boolean);
      if (catIds.length > 0) {
        categoryFilter = { categoryId: { in: catIds } };
      }
    } else if (category) {
      categoryFilter = { categoryId: category };
    }

    const where: any = {
      active: true,
      tenant: { 
        publishUniversal: true,
        deletedAt: null  // Exclude products from deleted shops
      },
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...categoryFilter,
    };

    const requestId = Math.random().toString(36).substring(7);
    console.time(`[universal:${requestId}] prisma.count`);
    const total = await db.product.count({ where });
    console.timeEnd(`[universal:${requestId}] prisma.count`);

    // Fetch more products than needed for better distribution
    const fetchSize = Math.min(total, perPage * 3);
    
    console.time(`[universal:${requestId}] prisma.findMany`);
    const allProducts = await db.product.findMany({
      where,
      // No orderBy - we'll shuffle and distribute
      take: fetchSize,
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            publicPhone: true,
            publishUniversal: true,
            publicTelegramLink: true,
          },
        },
        images: {
          select: {
            id: true,
            imageId: true,
            url: true,
            position: true,
            image: { select: { mime: true } },
          },
          orderBy: { position: "asc" },
        },
        category: { select: { id: true, name: true } },
      },
    });
    console.timeEnd(`[universal:${requestId}] prisma.findMany`);

    // Create daily seed (changes once per day, consistent during the day)
    const today = new Date();
    const dailySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Shuffle with daily seed for variety
    const shuffled = seededShuffle(allProducts, dailySeed);
    
    // Distribute evenly across shops
    const distributed = distributeProducts(shuffled);
    
    // Paginate the distributed results
    const start = (page - 1) * perPage;
    const products = distributed.slice(start, start + perPage);

    const items = products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      currency: p.currency,
      stock: p.stock,
      tenantId: p.tenant?.id,
      tenant: p.tenant,
      categoryId: p.categoryId ?? null,
      compareAtPrice: p.compareAtPrice ?? null,
      // normalize to {id,title} for the UI
      category: p.category ? { id: p.category.id, title: p.category.name } : null,
      images: (p.images ?? []).map((im: any) => ({
        id: im.id,
        url: im.url ?? buildWebUrlFromImage(im),
        webUrl: im.url ?? buildWebUrlFromImage(im),
        position: im.position ?? 0,
      })),
    }));

    return res.json({ page, perPage, total, items });
  } catch (e: any) {
    return res.status(500).json({ page, perPage, total: 0, items: [], error: e?.message ?? String(e) });
  }
});

universalRouter.get("/universal/ping", (_req, res) => {
  res.json({ ok: true, at: new Date().toISOString() });
});


universalRouter.get("/universal/categories/with-counts", async (_req, res) => {
  try {
    // 1) Get category nodes like buyer cascader (id, name, parentId, level, ...)
    const nodes = await CatalogService.listAllCategoriesForCascader();

    // 2) Count active products per category (GLOBAL)
    // If you want to show only shops that opted in to universal, uncomment the tenant condition.
    const counts = await db.product.groupBy({
      by: ["categoryId"],
      _count: { _all: true },
      where: {
        active: true,
        // tenant: { publishUniversal: true },  // ⬅️ enable if needed
      },
    });

    const directCount = new Map<string, number>();
    for (const c of counts) {
      if (c.categoryId) directCount.set(String(c.categoryId), c._count._all);
    }

    // 3) Build children map like buyer does
    const children = new Map<string | null, string[]>();
    for (const n of nodes) {
      const key = (n.parentId ?? null) as string | null;
      const list = children.get(key) || [];
      list.push(n.id);
      children.set(key, list);
    }

    // 4) Prepare output map
    type NodeOut = {
      id: string;
      name: string;
      parentId: string | null;
      level: number;
      countDirect: number;
      countWithDesc: number;
    };

    const out = new Map<string, NodeOut>();
    for (const n of nodes) {
      out.set(n.id, {
        id: n.id,
        name: n.name ?? "",
        parentId: (n.parentId ?? null) as string | null,
        level: Number(n.level ?? 0),
        countDirect: directCount.get(n.id) || 0,
        countWithDesc: 0,
      });
    }

    // 5) DFS to compute countWithDesc exactly like buyer
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

    const items = Array.from(out.values());

    return res.json({ items });
  } catch (e: any) {
    return res.status(500).json({ error: "UNIVERSAL_CATEGORIES_COUNTS_FAILED" });
  }
});

// UNIVERSAL FEED
universalRouter.get('/universal', async (req, res, next) => {
  try {
    const { q, categoryId, limit, cursor } = req.query as any;

    // ✅ FIX: method is listUniversalFeed (not universalFeed)
    const { items, nextCursor } = await CatalogService.listUniversalFeed({
      q,
      categoryId,
      limit: limit ? Number(limit) : undefined,
      cursor: cursor as string | undefined,
    });

    res.json({ items, nextCursor });
  } catch (e) { next(e); }
});

// List universal products for a given category (for ProductDetail related in universal mode)
universalRouter.get("/universal/category/:categoryId/products", async (req, res, next) => {
  try {
    const categoryId = String(req.params.categoryId);

    const items = await db.product.findMany({
      where: {
        categoryId,
        active: true,
        publishToUniversal: true,
        tenant: {
          publishUniversal: true, // only from shops that are visible in universal
          deletedAt: null  // Exclude products from deleted shops
        },
      },
      include: {
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: {
            url: true,
            imageId: true,
            image: { select: { mime: true } }, // needed for extFromMime
          },
        },
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            publicPhone: true,
            publicTelegramLink: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const products = items.map((p) => {
      const first = p.images?.[0];

      // Build photoUrl exactly like other catalog endpoints
      const mime = first?.image?.mime ?? undefined;
      const r2Url = first?.imageId
        ? publicImageUrl(first.imageId, extFromMime(mime))
        : null;

      const httpUrl =
        first?.url && /^https?:\/\//i.test(first.url) ? first.url : null;

      const photoUrl =
        r2Url ??
        httpUrl ??
        `/api/products/${p.id}/image`; // universal fallback proxy

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        currency: p.currency,
        stock: p.stock ?? 0,
        categoryId: p.categoryId,
        photoUrl,
        tenant: p.tenant,
      };
    });

    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// POST /api/universal/products/by-ids - Get multiple products by IDs
universalRouter.post("/universal/products/by-ids", async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ products: [] });
    }

    const products = await db.product.findMany({
      where: {
        id: { in: ids },
        active: true,
        tenant: { 
          publishUniversal: true,
          deletedAt: null  // Exclude products from deleted shops
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        images: {
          select: {
            id: true,
            imageId: true,
            url: true,
            image: { select: { mime: true } },
          },
          orderBy: { position: "asc" },
          take: 1,
        },
      },
      take: 50, // Limit to prevent abuse
    });

    const mapped = products.map((p) => {
      const firstImg = p.images[0];
      let photoUrl: string | null = null;
      if (firstImg) {
        photoUrl = buildWebUrlFromImage(firstImg);
      }

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        currency: p.currency,
        photoUrl,
        categoryId: p.categoryId,
        tenant: p.tenant,
      };
    });

    res.json({ products: mapped });
  } catch (e: any) {
    console.error("Error fetching products by IDs:", e);
    res.status(500).json({ error: e.message || "Failed to fetch products" });
  }
});

export default universalRouter;
