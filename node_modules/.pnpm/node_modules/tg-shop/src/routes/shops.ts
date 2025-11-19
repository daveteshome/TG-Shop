import { Router } from "express";
import { db } from "../lib/db";
import { telegramAuth } from "../api/telegramAuth";

const shopsRouter = Router();

// All endpoints here require Telegram auth
shopsRouter.use(telegramAuth);

// GET /api/shops/list  → returns { universal, myShops, joinedShops }
shopsRouter.get("/shops/list", async (req: any, res, next) => {
  console.log("on routs.ts page 12 [/shops/list] userId=");
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
shopsRouter.post("/tenants", async (req: any, res, next) => {
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

export default shopsRouter;
