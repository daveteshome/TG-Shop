// apps/backend/src/server/routes.ts
import { Router } from 'express';
import { db } from '../lib/db';
import { telegramAuth } from '../api/telegramAuth';

export const profileRouter = Router();
profileRouter.use(telegramAuth);

// GET /profile
profileRouter.get("/profile", async (req: any, res) => {
  const userId = req.userId!;
  const u = await db.user.findUnique({ where: { tgId: userId } });

  res.json({
    tgId: userId,
    username: u?.username ?? null,
    name: u?.name ?? null,
    phone: u?.phone ?? null,
    country: u?.country ?? null,
    city: u?.city ?? null,
    place: u?.place ?? null,
    specialReference: u?.specialReference ?? null,
    avatarUrl: u?.avatarUrl ?? null,
  });
});

// PUT /profile
profileRouter.put("/profile", async (req: any, res) => {
  const userId = req.userId!;
  const {
    phone,
    name,
    username,
    country,
    city,
    place,
    specialReference,
    avatarUrl,
  } = req.body || {};

  const u = await db.user.upsert({
    where: { tgId: userId },
    update: {
      phone,
      name,
      username,
      country,
      city,
      place,
      specialReference,
      avatarUrl,
    },
    create: {
      tgId: userId,
      phone,
      name,
      username,
      country,
      city,
      place,
      specialReference,
      avatarUrl,
    },
  });

  res.json(u);
});
