// backend/src/routes/publicTenant.ts
import { Router } from "express";
import { db } from "../lib/db";

export const publicTenantRouter = Router();

/**
 * GET /public/tenant/:slug
 * public shop info
 */
publicTenantRouter.get("/tenant/:slug", async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const tenant = await db.tenant.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: "tenant_not_found" });
    }

    res.json({
      shop: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        description: tenant.description,
        publishUniversal: tenant.publishUniversal,
        publicPhone: tenant.publicPhone,
        location: tenant.location,
        deliveryRules: tenant.deliveryRules,
        status: tenant.status,
        logoImageId: tenant.logoImageId,
        bannerUrl: tenant.bannerUrl,
        publicTelegramLink: tenant.publicTelegramLink,
      },
      viewer: {
        // this is public route, we don't know yet
        isOwner: false,
        isJoined: false,
      },
      stats: {
        products: tenant._count.products,
        orders: tenant._count.orders,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /public/tenant/:slug/products
 * products only for that tenant
 */
publicTenantRouter.get("/tenant/:slug/products", async (req, res, next) => {
  try {
    const slug = req.params.slug;

    // 1) find tenant
    const tenant = await db.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return res.status(404).json({ error: "tenant_not_found" });
    }

    // 2) fetch products WITH relations we need
    const products = await db.product.findMany({
      where: {
        tenantId: tenant.id,
        // if you want only actually shown products:
        // isPublished: true,
      },
      orderBy: { createdAt: "desc" },
      include: {
        images: {
          orderBy: { position: "asc" },
          take: 1,
        },
        category: {
          select: { title: true },
        },
      },
    });

    // 3) shape to frontend-friendly payload
    const items = products.map((p) => {
      const img = p.images?.[0];
      return {
        id: p.id,
        title: p.title,
        price: p.price, // Decimal -> stays as string in JSON, ok
        currency: p.currency,
        description: p.description,
        stock: p.stock,
        active: p.active,
        // your schema names:
        isPublished: p.isPublished,
        publishToUniversal: p.publishToUniversal,
        category: p.category ? p.category.title : null,
        image: img?.url || null,
      };
    });

    res.json({
      tenant: { name: tenant.name },
      items,
    });
  } catch (e) {
    next(e);
  }
});
