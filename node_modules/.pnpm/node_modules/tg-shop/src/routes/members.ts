import { Router } from "express";
import { db } from "../lib/db";
import { telegramAuth } from "../api/telegramAuth";
import { bot } from '../bot/bot';
import { requireAuth } from "./_helpers";
import { publicImageUrl } from "../lib/r2";
import { extFromMime } from "./utils/ext";


const membersRouter = Router();
membersRouter.use(telegramAuth);

// Create invite (OWNER)
membersRouter.post('/tenants/:tenantId/invites', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { role = "MEMBER", maxUses = 0, expiresAt = null } = req.body || {};

    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: "unauthorized_no_user" });

    const code = Math.random().toString(36).slice(2, 10);

    // create invite (relation + createdBy non-null)
    const invite = await db.shopInvite.create({
      data: {
        tenant: { connect: { id: tenantId } },
        role,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        code,
        createdBy: String(userId),
      },
      include: { tenant: { select: { id: true, slug: true } } },
    });

    // Resolve bot username: prefer env, else getMe()
    let botUsername = process.env.BOT_USERNAME;
    if (!botUsername) {
      try {
        const me = await bot.telegram.getMe();
        botUsername = me.username || "";
      } catch {
        /* ignore */
      }
    }
    if (!botUsername) {
      return res.status(500).json({ error: "bot_username_unavailable" });
    }

    const deepLink    = `https://t.me/${botUsername}?startapp=join_${invite.code}`;
    const deepLinkBot = `https://t.me/${botUsername}?start=join_${invite.code}`;

    res.json({
      invite: {
        id: invite.id,
        code: invite.code,
        role: invite.role,
        maxUses: invite.maxUses,
        expiresAt: invite.expiresAt,
        tenantId: invite.tenant.id,
        slug: invite.tenant.slug,
        createdBy: invite.createdBy,
      },
      deepLink,
      deepLinkBot,
    });
  } catch (e) {
    next(e);
  }
});


membersRouter.post("/invites/accept", async (req: any, res, next) => {
  try {
    const { code } = req.body ?? {};
    const userId = req.userId ? String(req.userId) : null;
    console.log("[INVITE] accept called (routes.ts):", { code, userId });

    if (!code) return res.status(400).json({ ok: false, error: "code_required" });

    const inv = await db.shopInvite.findUnique({
      where: { code },
      include: { tenant: { select: { id: true, slug: true, name: true } } },
    });
    if (!inv) return res.status(404).json({ ok: false, error: "invalid_invite" });

    const isExpired = !!inv.expiresAt && inv.expiresAt < new Date();
    if (isExpired) return res.status(410).json({ ok: false, error: "expired" });
    const isMaxed = inv.maxUses !== null && inv.usedCount >= (inv.maxUses ?? 0);
    if (isMaxed) return res.status(409).json({ ok: false, error: "max_uses" });

    // ✅ Register user as member
    let membershipEnsured = false;
    if (userId) {
      console.log("[INVITE] upserting membership:", { tenantId: inv.tenantId, userId });
      try {
        await db.membership.upsert({
          where: { tenantId_userId: { tenantId: inv.tenantId, userId } },
          update: { role: (inv as any).role ?? "MEMBER" },
          create: { tenantId: inv.tenantId, userId, role: (inv as any).role ?? "MEMBER" },
        });
        membershipEnsured = true;
      } catch (err) {
        console.error("[INVITE] membership upsert failed:", err);
      }
    } else {
      console.warn("[INVITE] no userId — telegramAuth not attached or not authenticated");
    }

    // Count uses only for non-public invites
    if (!(inv.expiresAt == null && inv.maxUses == null)) {
      await db.shopInvite.update({
        where: { code },
        data: { usedCount: (inv.usedCount ?? 0) + 1 },
      });
    }

    console.log("[INVITE] accept success:", {
      tenantId: inv.tenantId,
      slug: inv.tenant.slug,
      membershipEnsured,
    });

    return res.json({
      ok: true,
      status: "accepted",
      tenantId: inv.tenantId,
      slug: inv.tenant.slug,
      tenant: { id: inv.tenantId, slug: inv.tenant.slug, name: inv.tenant.name },
      membershipEnsured,
    });
  } catch (e) {
    console.error("[INVITE] accept failed (routes.ts):", e);
    next(e);
  }
});

// List members
membersRouter.get('/tenants/:tenantId/members', async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    const rawMembers = await db.membership.findMany({
      where: { tenantId },
      include: { user: true },
    });

    // Collect all avatar image IDs
    const avatarIds = Array.from(
      new Set(
        rawMembers
          .map((m) => m.user?.avatarUrl)
          .filter((id: string | null | undefined): id is string => Boolean(id))
      )
    );

    let avatarMap: Record<string, string> = {};
    if (avatarIds.length) {
      const images = await db.image.findMany({
        where: { id: { in: avatarIds } },
        select: { id: true, mime: true },
      });

      avatarMap = Object.fromEntries(
        images.map((im) => {
          const ext = extFromMime(im.mime);
          return [im.id, publicImageUrl(im.id, ext)];
        })
      );
    }

    const members = rawMembers.map((m) => ({
      ...m,
      user: {
        ...m.user,
        avatarWebUrl: m.user?.avatarUrl
          ? avatarMap[m.user.avatarUrl] ?? null
          : null,
      },
    }));

    res.json({ members });
  } catch (e) {
    next(e);
  }
});



membersRouter.patch(
  "/tenants/:tenantId/members/:userId",
  async (req: any, res, next) => {
    try {
      const { tenantId, userId } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: "Missing role" });
      }

      // same pattern as the invite route
      const actorId = req.userId ? String(req.userId) : null;
      if (!actorId) {
        return res.status(401).json({ error: "unauthorized_no_user" });
      }

      // Get existing membership (for fromRole in audit)
      const prev = await db.membership.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
      });

      if (!prev) {
        return res.status(404).json({ error: "Membership not found" });
      }

      // Update membership AND include user so response matches GET /members
            const updated = await db.membership.update({
        where: { tenantId_userId: { tenantId, userId } },
        data: { role },
        include: { user: true },
      });

      // Build avatarWebUrl for this one user (if any)
      let avatarWebUrl: string | null = null;
      if (updated.user?.avatarUrl) {
        const im = await db.image.findUnique({
          where: { id: updated.user.avatarUrl },
          select: { mime: true },
        });
        if (im) {
          const ext = extFromMime(im.mime);
          avatarWebUrl = publicImageUrl(updated.user.avatarUrl, ext);
        }
      }

      const member = {
        ...updated,
        user: {
          ...updated.user,
          avatarWebUrl,
        },
      };

      // ✅ Return shape matching frontend expectation
      return res.json({ member });


    } catch (err) {
      next(err);
    }
  }
);


export default membersRouter;