import { Router } from "express";
import { db } from "../lib/db";
import { publicImageUrl } from "../lib/r2";
import { CatalogService } from "../services/catalog.service";

const router = Router();

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
router.get("/products/:id", async (req, res) => {
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
      currency: product.currency,
      stock: product.stock,
      tenantId: product.tenant?.id,
      tenant: product.tenant,
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



router.get("/products", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(req.query.perPage ?? 24)));
  const q = (req.query.q as string | undefined)?.trim() || undefined;
  const category = (req.query.category as string | undefined)?.trim() || undefined;

  console.log("[universal] ← GET /products", { page, perPage, q, category, at: new Date().toISOString() });

  try {
    // ✅ REMOVE 'disabled: false' — it doesn't exist in your schema
    const where: any = {
      active: true,
      tenant: { publishUniversal: true },
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(category ? { categoryId: category } : {}),
    };

    console.time("[universal] prisma.count");
    const total = await db.product.count({ where });
    console.timeEnd("[universal] prisma.count");

    console.time("[universal] prisma.findMany");
    const products = await db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        tenant: { select: { id: true, slug: true, name: true, publicPhone: true, publishUniversal: true } },
        images: {
          select: { id: true, imageId: true, url: true, position: true, image: { select: { mime: true } } },
          orderBy: { position: "asc" },
        },
        // ✅ Category field is 'name' (mapped from DB 'title')
        category: { select: { id: true, name: true } },
      },
    });
    console.timeEnd("[universal] prisma.findMany");

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
      // normalize to {id,title} for the UI
      category: p.category ? { id: p.category.id, title: p.category.name } : null,
      images: (p.images ?? []).map((im: any) => ({
        id: im.id,
        url: im.url ?? buildWebUrlFromImage(im),
        webUrl: im.url ?? buildWebUrlFromImage(im),
        position: im.position ?? 0,
      })),
    }));

    console.log("[universal] → responding", { count: items.length, total });
    return res.json({ page, perPage, total, items });
  } catch (e: any) {
    console.error("[universal] 💥 error:", e);
    return res.status(500).json({ page, perPage, total: 0, items: [], error: e?.message ?? String(e) });
  }
});

router.get("/ping", (_req, res) => {
  res.json({ ok: true, at: new Date().toISOString() });
});


router.get("/categories/with-counts", async (_req, res) => {
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

    console.log("[universal] /categories/with-counts →", {
      nodes: nodes.length,
      groups: counts.length,
      items: items.length,
      sample: items[0] ?? null,
    });

    return res.json({ items });
  } catch (e: any) {
    console.error("[universal] categories/with-counts error:", e);
    return res.status(500).json({ error: "UNIVERSAL_CATEGORIES_COUNTS_FAILED" });
  }
});


export default router;
