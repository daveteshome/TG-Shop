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
        location: true,
        deliveryRules: true,
        logoImageId: true,
        bannerUrl: true,
        defaultCurrency: true,
        minOrderAmount: true,
        status: true,
        deliveryMode: true,
        publicTelegramLink: true,
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
      location,
      deliveryRules,
      logoImageId, // <-- accept only ID
      bannerUrl,
      defaultCurrency,
      minOrderAmount,
      status,
      deliveryMode,
      publicTelegramLink,
    } = req.body || {};

    const data: any = {};
    if (typeof name === "string") data.name = name;
    if (publicPhone === null || typeof publicPhone === "string") data.publicPhone = publicPhone;
    if (typeof publishUniversal === "boolean") data.publishUniversal = publishUniversal;
    if (description === null || typeof description === "string") data.description = description;
    if (aboutText === null || typeof aboutText === "string") data.aboutText = aboutText;
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

