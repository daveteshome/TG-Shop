// apps/backend/src/server/routes.ts
import { Router } from 'express';
import type {Response as ExResponse, NextFunction } from "express";
import { publicImageUrl } from "../lib/r2"; // <-- adjust ../ if your path differs
import { db } from "../lib/db";
import { resolveTenant } from '../middlewares/resolveTenant';
import { telegramAuth } from '../api/telegramAuth';
import multer from "multer";
import { upsertImageFromBytes  } from "../lib/r2";  // 👈 this exists in your repo
import type { Request } from "express";
import { extFromMime } from "./utils/ext";


export const ownerShopsRouter = Router();
ownerShopsRouter.use(telegramAuth);
const upload = multer({ storage: multer.memoryStorage() });
type TenantRequest = Request & { tenantId?: string };


ownerShopsRouter.post(
  "/shop/:slug/uploads/image",
  resolveTenant,
  upload.single("file"),
  async (req: TenantRequest, res: ExResponse, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const file = req.file;                          // <-- narrow
      if (!file) return res.status(400).json({ error: "file_required" });

      const img = await upsertImageFromBytes(file.buffer, file.mimetype, tenantId);

      const ext = extFromMime(file.mimetype);         // union type
      const webUrl = publicImageUrl(img.id, ext);

      return res.json({
        imageId: img.id,
        width: img.width,
        height: img.height,
        mime: img.mime,
        key: img.key,
        webUrl,
      });
    } catch (e) {
      next(e);
    }
  }
);

ownerShopsRouter.get("/shop/:slug", resolveTenant, async (req: Request, res: ExResponse, next: NextFunction) => {
  try {
    const t = (req as any).tenant;
    if (!t) return res.status(404).json({ error: "tenant_not_found" });

    const tenant = await db.tenant.findUnique({
      where: { id: t.id },
      select: {
        id: true,
        slug: true,
        name: true,
        publicPhone: true,
        publishUniversal: true,
        description: true,
        aboutText: true,
        shopType: true,
        location: true,
        deliveryRules: true,
        logoImageId: true,
        bannerUrl: true,
        defaultCurrency: true,
        minOrderAmount: true,
        status: true,
        deliveryMode: true,
        publicTelegramLink: true,
        instagramUrl: true,
        facebookUrl: true,
        twitterUrl: true,
        returnPolicy: true,
        shippingInfo: true,
        paymentMethods: true,
        bankAccounts: true,
      },
    });
    if (!tenant) return res.status(404).json({ error: "tenant_not_found" });

    let logoWebUrl: string | null = null;
    if (tenant.logoImageId) {
      const img = await db.image.findUnique({
        where: { id: tenant.logoImageId },
        select: { mime: true },
      });
      const ext = extFromMime(img?.mime);
      logoWebUrl = publicImageUrl(tenant.logoImageId, ext);
    }

    res.json({ ...tenant, logoWebUrl });
  } catch (e) {
    next(e);
  }
});

// DELETE /shop/:slug/membership - Leave shop (remove your membership)
ownerShopsRouter.delete("/shop/:slug/membership", resolveTenant, async (req: any, res: ExResponse, next: NextFunction) => {
  try {
    const t = (req as any).tenant as { id: string };
    const userId = req.userId; // from telegramAuth
    
    if (!t || !userId) return res.status(404).json({ error: "tenant_or_user_not_found" });

    // Check if user is the owner
    const membership = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: t.id,
          userId: userId,
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ error: "membership_not_found" });
    }

    if (membership.role === "OWNER") {
      return res.status(403).json({ error: "owner_cannot_leave" });
    }

    // Delete the membership
    await db.membership.delete({
      where: {
        id: membership.id,
      },
    });

    res.json({ success: true, message: "left_shop" });
  } catch (e) {
    next(e);
  }
});

// DELETE /shop/:slug - Soft delete shop (owner only)
ownerShopsRouter.delete("/shop/:slug", resolveTenant, async (req: any, res: ExResponse, next: NextFunction) => {
  try {
    const t = (req as any).tenant as { id: string };
    const userId = req.userId;
    
    if (!t || !userId) return res.status(404).json({ error: "tenant_or_user_not_found" });

    // Check if user is the owner
    const membership = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: t.id,
          userId: userId,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      return res.status(403).json({ error: "only_owner_can_delete" });
    }

    // Soft delete: set deletedAt timestamp
    await db.tenant.update({
      where: { id: t.id },
      data: {
        deletedAt: new Date(),
      },
    });

    res.json({ success: true, message: "shop_deleted", gracePeriodDays: 30 });
  } catch (e) {
    next(e);
  }
});

// GET /shops/deleted - Get deleted shops for current user
ownerShopsRouter.get("/shops/deleted", async (req: any, res: ExResponse, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    // Get deleted shops where user is owner and within 30-day grace period
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedShops = await db.membership.findMany({
      where: {
        userId,
        role: "OWNER",
        tenant: {
          deletedAt: {
            not: null,
            gte: thirtyDaysAgo, // Only shops deleted within last 30 days
          },
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            logoImageId: true,
            deletedAt: true,
          },
        },
      },
    });

    // Calculate days remaining for each shop
    const shopsWithDaysRemaining = deletedShops.map((m) => {
      const deletedAt = m.tenant.deletedAt!;
      const daysSinceDeletion = Math.floor(
        (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysRemaining = Math.max(0, 30 - daysSinceDeletion);

      // Get logo URL if exists
      let logoWebUrl: string | null = null;
      if (m.tenant.logoImageId) {
        // We'll fetch images in bulk below
        logoWebUrl = null; // placeholder
      }

      return {
        ...m.tenant,
        deletedAt: deletedAt.toISOString(),
        daysRemaining,
      };
    });

    // Fetch logo URLs for all shops
    const logoIds = shopsWithDaysRemaining
      .map((s) => s.logoImageId)
      .filter((id): id is string => Boolean(id));

    let logoMap: Record<string, string> = {};
    if (logoIds.length > 0) {
      const images = await db.image.findMany({
        where: { id: { in: logoIds } },
        select: { id: true, mime: true },
      });

      logoMap = Object.fromEntries(
        images.map((img) => {
          const ext = extFromMime(img.mime);
          return [img.id, publicImageUrl(img.id, ext)];
        })
      );
    }

    // Add logo URLs to shops
    const shopsWithLogos = shopsWithDaysRemaining.map((shop) => ({
      ...shop,
      logoWebUrl: shop.logoImageId ? logoMap[shop.logoImageId] ?? null : null,
    }));

    res.json({ deletedShops: shopsWithLogos });
  } catch (e) {
    next(e);
  }
});

// POST /shop/:slug/restore - Restore a deleted shop
ownerShopsRouter.post("/shop/:slug/restore", resolveTenant, async (req: any, res: ExResponse, next: NextFunction) => {
  try {
    const t = (req as any).tenant as { id: string };
    const userId = req.userId;

    if (!t || !userId) return res.status(404).json({ error: "tenant_or_user_not_found" });

    // Check if user is the owner
    const membership = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: t.id,
          userId: userId,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      return res.status(403).json({ error: "only_owner_can_restore" });
    }

    // Get the tenant to check if it's deleted
    const tenant = await db.tenant.findUnique({
      where: { id: t.id },
      select: { deletedAt: true },
    });

    if (!tenant?.deletedAt) {
      return res.status(400).json({ error: "shop_not_deleted" });
    }

    // Check if within 30-day grace period
    const daysSinceDeletion = Math.floor(
      (Date.now() - tenant.deletedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceDeletion > 30) {
      return res.status(400).json({ error: "grace_period_expired" });
    }

    // Restore: clear deletedAt timestamp
    await db.tenant.update({
      where: { id: t.id },
      data: {
        deletedAt: null,
      },
    });

    res.json({ success: true, message: "shop_restored" });
  } catch (e) {
    next(e);
  }
});

ownerShopsRouter.patch("/shop/:slug", resolveTenant, async (req: Request, res: ExResponse, next: NextFunction) => {
  try {
    const t = (req as any).tenant as { id: string };
    if (!t) return res.status(404).json({ error: "tenant_not_found" });

    const {
      name,
      publicPhone,
      publishUniversal,
      description,
      aboutText,
      shopType,
      location,
      deliveryRules,
      logoImageId, // <-- accept only ID
      bannerUrl,
      defaultCurrency,
      minOrderAmount,
      status,
      deliveryMode,
      publicTelegramLink,
      instagramUrl,
      facebookUrl,
      twitterUrl,
      returnPolicy,
      shippingInfo,
      paymentMethods,
      bankAccounts,
    } = req.body || {};

    const data: any = {};
    if (typeof name === "string") data.name = name;
    if (publicPhone === null || typeof publicPhone === "string") data.publicPhone = publicPhone;
    if (typeof publishUniversal === "boolean") data.publishUniversal = publishUniversal;
    if (description === null || typeof description === "string") data.description = description;
    if (aboutText === null || typeof aboutText === "string") data.aboutText = aboutText;
    if (shopType === null || typeof shopType === "string") data.shopType = shopType;
    if (location === null || typeof location === "string") data.location = location;
    if (deliveryRules === null || typeof deliveryRules === "string") data.deliveryRules = deliveryRules;
    if (logoImageId === null || typeof logoImageId === "string") data.logoImageId = logoImageId; // <-- persist ID
    if (bannerUrl === null || typeof bannerUrl === "string") data.bannerUrl = bannerUrl;
    if (defaultCurrency === null || typeof defaultCurrency === "string") data.defaultCurrency = defaultCurrency;
    if (minOrderAmount === null || typeof minOrderAmount === "string" || typeof minOrderAmount === "number")
      data.minOrderAmount = minOrderAmount;
    if (status === null || typeof status === "string") data.status = status;
    if (deliveryMode === null || typeof deliveryMode === "string") data.deliveryMode = deliveryMode;
    if (publicTelegramLink === null || typeof publicTelegramLink === "string") data.publicTelegramLink = publicTelegramLink;
    if (instagramUrl === null || typeof instagramUrl === "string") data.instagramUrl = instagramUrl;
    if (facebookUrl === null || typeof facebookUrl === "string") data.facebookUrl = facebookUrl;
    if (twitterUrl === null || typeof twitterUrl === "string") data.twitterUrl = twitterUrl;
    if (returnPolicy === null || typeof returnPolicy === "string") data.returnPolicy = returnPolicy;
    if (shippingInfo === null || typeof shippingInfo === "string") data.shippingInfo = shippingInfo;
    if (paymentMethods === null || typeof paymentMethods === "string") data.paymentMethods = paymentMethods;
    if (bankAccounts === null || Array.isArray(bankAccounts)) data.bankAccounts = bankAccounts;

    const updated = await db.tenant.update({
      where: { id: t.id },
      data,
      select: {
        id: true,
        slug: true,
        name: true,
        publicPhone: true,
        publishUniversal: true,
        description: true,
        aboutText: true,
        location: true,
        deliveryRules: true,
        logoImageId: true,
        bannerUrl: true,
        defaultCurrency: true,
        minOrderAmount: true,
        status: true,
        deliveryMode: true,
        publicTelegramLink: true,
        instagramUrl: true,
        facebookUrl: true,
        twitterUrl: true,
        returnPolicy: true,
        shippingInfo: true,
        paymentMethods: true,
        bankAccounts: true,
      },
    });

    let logoWebUrl: string | null = null;
    if (updated.logoImageId) {
      const img = await db.image.findUnique({
        where: { id: updated.logoImageId },
        select: { mime: true },
      });
      const ext = extFromMime(img?.mime);
      logoWebUrl = publicImageUrl(updated.logoImageId, ext);
    }

    res.json({ ...updated, logoWebUrl });
  } catch (e) {
    next(e);
  }
});

