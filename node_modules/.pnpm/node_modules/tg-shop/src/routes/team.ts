// apps/backend/src/routes/team.ts
import { Router } from 'express';
import type { Response as ExResponse, NextFunction, Request } from "express";
import { db } from "../lib/db";
import { resolveTenant } from '../middlewares/resolveTenant';
import { telegramAuth } from '../api/telegramAuth';

export const teamRouter = Router();

teamRouter.use(telegramAuth);

// GET /shop/:slug/team/:userId - Get member details
teamRouter.get("/shop/:slug/team/:userId", resolveTenant, async (req: any, res: ExResponse, next: NextFunction) => {
  try {
    const t = (req as any).tenant as { id: string };
    const { userId } = req.params;
    const currentUserId = req.userId;
    
    if (!t || !currentUserId) return res.status(404).json({ error: "tenant_or_user_not_found" });

    // Check if current user is owner or collaborator
    const currentUserMembership = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: t.id,
          userId: currentUserId,
        },
      },
    });

    if (!currentUserMembership || (currentUserMembership.role !== "OWNER" && currentUserMembership.role !== "COLLABORATOR")) {
      return res.status(403).json({ error: "forbidden_admin_only" });
    }

    // Get member details
    const member = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: t.id,
          userId: userId,
        },
      },
      include: {
        user: {
          select: {
            tgId: true,
            username: true,
            name: true,
          },
        },
      },
    });

    if (!member) {
      return res.status(404).json({ error: "member_not_found" });
    }

    res.json({ member });
  } catch (e) {
    next(e);
  }
});

// PATCH /shop/:slug/team/:userId/role - Change member role
teamRouter.patch("/shop/:slug/team/:userId/role", resolveTenant, async (req: any, res: ExResponse, next: NextFunction) => {
  try {
    const t = (req as any).tenant as { id: string };
    const { userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.userId;
    
    if (!t || !currentUserId) return res.status(404).json({ error: "tenant_or_user_not_found" });

    // Check if current user is owner or collaborator
    const currentUserMembership = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: t.id,
          userId: currentUserId,
        },
      },
    });

    if (!currentUserMembership || (currentUserMembership.role !== "OWNER" && currentUserMembership.role !== "COLLABORATOR")) {
      return res.status(403).json({ error: "forbidden_admin_only" });
    }

    // Get target member
    const targetMember = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: t.id,
          userId: userId,
        },
      },
    });

    if (!targetMember) {
      return res.status(404).json({ error: "member_not_found" });
    }

    // Owners cannot be changed
    if (targetMember.role === "OWNER") {
      return res.status(403).json({ error: "cannot_change_owner_role" });
    }

    // Collaborators can only change HELPER and MEMBER roles
    if (currentUserMembership.role === "COLLABORATOR") {
      // Collaborators cannot change other collaborators
      if (targetMember.role === "COLLABORATOR") {
        return res.status(403).json({ error: "collaborators_cannot_change_other_collaborators" });
      }
      // Collaborators can only assign HELPER and MEMBER roles
      if (role !== "HELPER" && role !== "MEMBER") {
        return res.status(403).json({ error: "collaborators_can_only_assign_helper_or_member" });
      }
    }

    // Update role
    const updated = await db.membership.update({
      where: {
        id: targetMember.id,
      },
      data: {
        role: role,
      },
    });

    res.json({ success: true, member: updated });
  } catch (e) {
    next(e);
  }
});

// DELETE /shop/:slug/team/:userId - Remove member
teamRouter.delete("/shop/:slug/team/:userId", resolveTenant, async (req: any, res: ExResponse, next: NextFunction) => {
  try {
    const t = (req as any).tenant as { id: string };
    const { userId } = req.params;
    const currentUserId = req.userId;
    
    if (!t || !currentUserId) return res.status(404).json({ error: "tenant_or_user_not_found" });

    // Check if current user is owner or collaborator
    const currentUserMembership = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: t.id,
          userId: currentUserId,
        },
      },
    });

    if (!currentUserMembership || (currentUserMembership.role !== "OWNER" && currentUserMembership.role !== "COLLABORATOR")) {
      return res.status(403).json({ error: "forbidden_admin_only" });
    }

    // Get target member
    const targetMember = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: t.id,
          userId: userId,
        },
      },
    });

    if (!targetMember) {
      return res.status(404).json({ error: "member_not_found" });
    }

    // Cannot remove owners
    if (targetMember.role === "OWNER") {
      return res.status(403).json({ error: "cannot_remove_owner" });
    }

    // Collaborators can only remove HELPER and MEMBER roles
    if (currentUserMembership.role === "COLLABORATOR") {
      if (targetMember.role === "COLLABORATOR") {
        return res.status(403).json({ error: "collaborators_cannot_remove_other_collaborators" });
      }
      // Only HELPER and MEMBER can be removed by collaborators
      if (targetMember.role !== "HELPER" && targetMember.role !== "MEMBER") {
        return res.status(403).json({ error: "collaborators_can_only_remove_helpers_and_members" });
      }
    }

    // Remove member
    await db.membership.delete({
      where: {
        id: targetMember.id,
      },
    });

    res.json({ success: true, message: "member_removed" });
  } catch (e) {
    next(e);
  }
});
