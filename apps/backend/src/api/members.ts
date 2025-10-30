import { Router } from "express";
import { db } from "../lib/db";
import { telegramAuth } from "../api/telegramAuth";

const router = Router();
router.use(telegramAuth);

// POST /api/tenants/:tenantId/invites { role, maxUses?, expiresAt? }
router.post("/tenants/:tenantId/invites", async (req: any, res, next) => {
  try {
    const { tenantId } = req.params;
    const { role, maxUses, expiresAt } = req.body ?? {};
    const actorId = req.userId!;
    const code = Math.random().toString(36).slice(2, 10);
    const invite = await db.shopInvite.create({
      data: {
        tenantId,
        role,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        code,
        createdBy: actorId
      },
    });
    res.json({ invite, deepLink: `https://t.me/${process.env.BOT_USERNAME}?start=join_${code}` });
  } catch (e) { next(e); }
});

// POST /api/invites/accept { code }
router.post("/invites/accept", async (req: any, res, next) => {
  try {
    const { code } = req.body ?? {};
    const userId = req.userId!;
    const inv = await db.shopInvite.findUnique({ where: { code } });
    if (!inv) return res.status(404).json({ error: "invalid_invite" });
    if (inv.expiresAt && inv.expiresAt < new Date()) return res.status(410).json({ error: "expired" });
    if (inv.maxUses && inv.usedCount >= inv.maxUses) return res.status(409).json({ error: "max_uses" });

    await db.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: { tenantId_userId: { tenantId: inv.tenantId, userId } },
        create: { tenantId: inv.tenantId, userId, role: inv.role },
        update: { role: inv.role },
      });
      await tx.shopInvite.update({ where: { id: inv.id }, data: { usedCount: { increment: 1 } } });
      await tx.membershipAudit.create({
        data: { tenantId: inv.tenantId, actorId: userId, targetId: userId, action: 'JOIN_ACCEPT', toRole: inv.role },
      });
    });
    res.json({ ok: true, tenantId: inv.tenantId });
  } catch (e) { next(e); }
});

// GET /api/tenants/:tenantId/members
router.get("/tenants/:tenantId/members", async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const members = await db.membership.findMany({ where: { tenantId }, include: { user: true } });
    res.json({ members });
  } catch (e) { next(e); }
});

// PATCH /api/tenants/:tenantId/members/:userId { role }
router.patch("/tenants/:tenantId/members/:userId", async (req: any, res, next) => {
  try {
    const { tenantId, userId } = req.params;
    const { role } = req.body ?? {};
    const actorId = req.userId!;
    const m = await db.membership.update({ where: { tenantId_userId: { tenantId, userId } }, data: { role } });
    await db.membershipAudit.create({ data: { tenantId, actorId, targetId: userId, action: 'ROLE_UPDATE', toRole: role } });
    res.json({ member: m });
  } catch (e) { next(e); }
});

// DELETE /api/tenants/:tenantId/members/:userId
router.delete("/tenants/:tenantId/members/:userId", async (req, res, next) => {
  try {
    const { tenantId, userId } = req.params;
    await db.membership.delete({ where: { tenantId_userId: { tenantId, userId } } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
