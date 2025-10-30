import { Router } from "express";
import { db } from "../lib/db";
import { getTenantId } from "../services/tenant.util";

const router = Router();

// GET /api/universal/products
router.get("/products", async (req, res) => {
  const tenantId = await getTenantId();
  const page = Math.max(1, Number(req.query.page ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(req.query.perPage ?? 20)));
  const skip = (page - 1) * perPage;
  const categoryId = (req.query.category as string) || undefined;
  const q = (req.query.q as string) || undefined;

  const where: any = {
    tenantId,
    active: true,
    isPublished: true,
    publishToUniversal: true,
  };
  if (categoryId) where.categoryId = categoryId;
  if (q) where.title = { contains: q, mode: "insensitive" };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
      include: {
        images: { orderBy: { position: "asc" }, take: 1, include: { image: true } },
        tenant: { select: { id: true, name: true, publicPhone: true, slug: true } },
        category: { select: { id: true, title: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  res.json({
    page, perPage, total,
    items: items.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,                 // expose for deep-link building
      title: p.title,
      price: p.price,
      currency: p.currency,
      image: p.images[0]?.image
        ? `${process.env.CDN_IMAGE_BASE}/${p.images[0].image.bucketKeyBase}/orig?w=512&fmt=auto`
        : p.images[0]?.url ?? null,
      shopName: p.tenant.name,
      shopPhone: p.tenant.publicPhone,
      tenantSlug: p.tenant.slug,
      category: p.category ? { id: p.category.id, title: p.category.title } : null,
      createdAt: p.createdAt,
    })),
  });
});

// GET /api/universal/products/:id
router.get("/products/:id", async (req, res) => {
  const tenantId = await getTenantId();
  const p = await db.product.findFirst({
    where: { tenantId, id: req.params.id, active: true, isPublished: true, publishToUniversal: true },
    include: {
      images: { orderBy: { position: "asc" }, include: { image: true } },
      tenant: { select: { id: true, name: true, publicPhone: true, slug: true } },
      category: { select: { id: true, title: true } },
    },
  });
  if (!p) return res.status(404).json({ error: "Not found" });

  res.json({
    id: p.id,
    tenantId: p.tenantId,
    tenantSlug: p.tenant.slug,
    title: p.title,
    description: p.description,
    price: p.price,
    currency: p.currency,
    images: p.images.map((im) =>
      im.image ? `${process.env.CDN_IMAGE_BASE}/${im.image.bucketKeyBase}/orig?w=1024&fmt=auto` : im.url
    ),
    shopName: p.tenant.name,
    shopPhone: p.tenant.publicPhone,
    category: p.category ? { id: p.category.id, title: p.category.title } : null,
    createdAt: p.createdAt,
  });
});

export default router;
