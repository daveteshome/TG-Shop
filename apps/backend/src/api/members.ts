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
   res.json({ invite, deepLink: `https://t.me/${process.env.BOT_USERNAME}?startapp=join_${code}` });

  } catch (e) { next(e); }
});

// GET /api/me/shops — shops where current user is a member.
// Never 401; if auth missing, returns empty array.
// Adds verbose logs to see what's happening.
// GET /api/me/shops — shops where current user is a member.
// Never 401; if auth missing, returns empty array.
// Adds verbose logs to see what's happening.

// // POST /api/invites/accept { code }
// router.post("/invites/accept", async (req: any, res, next) => {
//   try {
//     const { code } = req.body ?? {};
//     const userId = req.userId ? String(req.userId) : null;
//     console.log("[INVITE] accept called:", { code, userId });

//     if (!code) return res.status(400).json({ ok: false, error: "code_required" });

//     const inv = await db.shopInvite.findUnique({
//       where: { code },
//       include: { tenant: { select: { id: true, slug: true, name: true } } },
//     });

//     if (!inv) {
//       console.log("[INVITE] invalid code:", code);
//       return res.status(404).json({ ok: false, error: "invalid_invite" });
//     }

//     const isExpired = !!inv.expiresAt && inv.expiresAt < new Date();
//     const isMaxed   = inv.maxUses !== null && inv.usedCount >= (inv.maxUses ?? 0);
//     if (isExpired) return res.status(410).json({ ok: false, error: "expired" });
//     if (isMaxed)   return res.status(409).json({ ok: false, error: "max_uses" });

//     let membershipEnsured = false;

//     if (!userId) {
//       console.warn("[INVITE] no userId from telegramAuth; membership NOT created");
//     } else {
//       // Your schema already uses `membership` (see your GET /tenants/:tenantId/members routes)
//       // and has a unique `tenantId_userId`.
//       console.log("[INVITE] upserting membership:", { tenantId: inv.tenantId, userId });
//       await db.membership.upsert({
//         where: { tenantId_userId: { tenantId: inv.tenantId, userId } },
//         update: { role: (inv as any).role ?? "MEMBER" },
//         create: { tenantId: inv.tenantId, userId, role: (inv as any).role ?? "MEMBER" },
//       });
//       membershipEnsured = true;
//     }

//     // Count uses only for non-public invites
//     if (!(inv.expiresAt == null && inv.maxUses == null)) {
//       await db.shopInvite.update({
//         where: { code },
//         data: { usedCount: (inv.usedCount ?? 0) + 1 },
//       });
//     }

//     console.log("[INVITE] accept success:", {
//       tenantId: inv.tenantId,
//       slug: inv.tenant.slug,
//       membershipEnsured,
//     });

//     return res.json({
//       ok: true,
//       status: "accepted",
//       tenantId: inv.tenantId,
//       slug: inv.tenant.slug,
//       tenant: { id: inv.tenantId, slug: inv.tenant.slug, name: inv.tenant.name },
//       membershipEnsured,
//     });
//   } catch (e) {
//     console.error("[INVITE] accept failed:", e);
//     next(e);
//   }
// });



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
