// apps/backend/src/routes/profile.ts
import { Router } from "express";
import { db } from "../lib/db";
import { telegramAuth } from "../api/telegramAuth";
import { publicImageUrl } from "../lib/r2";
import { extFromMime } from "./utils/ext";

export const profileRouter = Router();
profileRouter.use(telegramAuth);

// Build avatarWebUrl from stored imageId (avatarUrl field)
async function buildAvatarWebUrl(imageId?: string | null): Promise<string | null> {
  if (!imageId) return null;
  const im = await db.image.findUnique({
    where: { id: imageId },
    select: { mime: true },
  });
  const ext = extFromMime(im?.mime) || "jpg";
  return publicImageUrl(imageId, ext);
}

// Normalize user to API Profile shape
async function toProfileApi(u: any) {
  const avatarWebUrl = await buildAvatarWebUrl(u?.avatarUrl ?? null);
  return {
    tgId: u.tgId,
    phone: u.phone ?? null,
    name: u.name ?? null,
    username: u.username ?? null,
    country: u.country ?? null,
    city: u.city ?? null,
    place: u.place ?? null,
    specialReference: u.specialReference ?? null,
    // DB stores imageId here
    avatarUrl: u.avatarUrl ?? null,
    // Extra field for web preview
    avatarWebUrl,
  };
}

// GET /profile
profileRouter.get("/profile", async (req: any, res, next) => {
  try {
    const userId = req.userId!;
    let u = await db.user.findUnique({ where: { tgId: userId } });

    if (!u) {
      // create minimal user if missing
      u = await db.user.create({
        data: {
          tgId: userId,
        },
      });
    }

    const payload = await toProfileApi(u);
    res.json(payload);
  } catch (e) {
    next(e);
  }
});

// PUT /profile
profileRouter.put("/profile", async (req: any, res, next) => {
  try {
    const userId = req.userId!;

    const {
      phone = null,
      name = null,
      username = null,
      country = null,
      city = null,
      place = null,
      specialReference = null,
      avatarUrl = null, // imageId from /api/uploads/image
    } = req.body || {};

    const data: any = {
      phone,
      name,
      username,
      country,
      city,
      place,
      specialReference,
      avatarUrl,
    };

    const u = await db.user.upsert({
      where: { tgId: userId },
      create: {
        tgId: userId,
        ...data,
      },
      update: data,
    });

    const payload = await toProfileApi(u);
    res.json(payload);
  } catch (e) {
    next(e);
  }
});
