import { Router } from "express";
import { db } from "../lib/db";
import { telegramAuth } from "../api/telegramAuth";

const router = Router();

// All endpoints here require Telegram auth
router.use(telegramAuth);

// inside backend/src/api/shops.ts
// backend/src/api/shops.ts (or wherever you put it)
router.get("/shops/:slug/orders", async (req: any, res, next) => {
  try {
    const userId = req.userId!;             // this is tgId from telegramAuth
    const slug = req.params.slug;

    // find tenant
    const tenant = await db.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return res.status(404).json({ error: "tenant_not_found" });
    }

    // check membership using your real enum values
    const member = await db.membership.findFirst({
      where: {
        tenantId: tenant.id,
        userId, // tgId
        role: {
          in: ["OWNER", "HELPER", "COLLABORATOR"], // <- your actual ShopRole
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: "forbidden" });
    }

    const orders = await db.order.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: true, // this is your User with pk = tgId
      },
    });

    res.json({
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        currency: o.currency,
        createdAt: o.createdAt,
        user: o.user
          ? {
              id: o.user.tgId,                    // <-- FIX HERE
              username: o.user.username,
              name: o.user.name,
              phone: o.user.phone,
            }
          : null,
      })),
    });
  } catch (e) {
    next(e);
  }
});


// GET /api/shops/list  → returns { universal, myShops, joinedShops }
router.get("/shops/list", async (req: any, res, next) => {
  console.log("on shop.ts line 71 [/shops/list] userId=");
  try {
    const userId = req.userId!;
    const owned = await db.membership.findMany({
      where: { userId, role: 'OWNER' },
      include: { tenant: true },
    });
    const joined = await db.membership.findMany({
      where: { userId, role: { in: ['MEMBER','HELPER','COLLABORATOR'] } },
      include: { tenant: true },
    });
    res.json({
      universal: { title: 'Universal Shop', key: 'universal' },
      myShops: owned.map(m => m.tenant),
      joinedShops: joined.map(m => m.tenant),
    });
  } catch (e) { next(e); }
});

// POST /api/tenants  { name }  → creates tenant and OWNER membership
router.post("/tenants", async (req: any, res, next) => {
  try {
    const userId = req.userId!;
    const { name } = (req.body ?? {}) as { name: string };
    if (!name || String(name).trim().length < 3) return res.status(400).json({ error: "name_too_short" });
    const clean = String(name).trim();
    const slugBase = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    const slug = slugBase || `shop-${Math.random().toString(36).slice(2, 6)}`;

    const exists = await db.tenant.findUnique({ where: { slug } });
    const finalSlug = exists ? `${slug}-${Math.random().toString(36).slice(2, 4)}` : slug;

    const tenant = await db.$transaction(async (tx) => {
      const t = await tx.tenant.create({ data: { slug: finalSlug, name: clean } });
      await tx.membership.create({ data: { tenantId: t.id, userId, role: 'OWNER' } });
      return t;
    });

    res.json({ tenant });
  } catch (e) { next(e); }
});

export default router;
