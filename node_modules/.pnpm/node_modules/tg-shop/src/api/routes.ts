// apps/backend/src/server/routes.ts
import { Router } from 'express';
import type {Response as ExResponse, NextFunction } from "express";


import { CatalogService } from '../services/catalog.service';
import { CartService } from '../services/cart.service';
import  ProductsRouter  from "../routes/products";
import { OrdersService } from '../services/orders.service';
import { db } from '../lib/db';
import { ENV } from '../config/env';
import crypto from "crypto";
import {Readable } from "node:stream";
import { publicImageUrl } from "../lib/r2"; // <-- adjust ../ if your path differs
import { firstImageWebUrl } from "../services/image.resolve";

import { resolveTenant } from '../middlewares/resolveTenant';
import { telegramAuth } from '../api/telegramAuth';
import multer from "multer";

import { upsertImageFromBytes  } from "../lib/r2";  // 👈 this exists in your repo
//const upload = multer({ storage: multer.memoryStorage() });
import SearchRouter from "../services/search";
// ── ADD near other imports ─────────────────────────────────────────────────────
import { listCategoriesWithCountsForShop } from "../services/catalog.service";


import type { Request } from "express";
import type { Tenant } from "@prisma/client";
type ReqWithTenant = Request & { tenantId?: string; tenant?: Tenant };


export const api = Router();


const BOT_TOKEN = process.env.BOT_TOKEN!;
if (!BOT_TOKEN) {
  // optional: log a warning; the route below needs it.
  console.warn("BOT_TOKEN is missing – /api/products/:id/image will not work.");
}



api.get('/ping', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// -------- DEBUG (before auth) --------
api.get('/_debug', (req, res) => {
  const auth = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const m = auth.match(/^tma\s+(.+)$/i);
  const raw = m ? m[1] : '';
  res.json({
    hasAuth: !!m,
    authLen: raw.length,
    authPrefix: auth.slice(0, 10),
    ua: req.headers['user-agent'],
    path: req.originalUrl,
  });
});

api.get('/_verify', (req, res) => {
  const auth = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const m = auth.match(/^tma\s+(.+)$/i);
  if (!m) return res.json({ ok: false, reason: 'no_auth_header' });

  const raw = m[1];
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch {}

  const params = new URLSearchParams(decoded);
  const provided = params.get('hash') || '';
  const keys = [...params.keys()].sort();

  const pairs: string[] = [];
  params.forEach((v, k) => { if (k !== 'hash' && k !== 'signature') pairs.push(`${k}=${v}`); });
  pairs.sort();
  const checkString = pairs.join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(ENV.BOT_TOKEN).digest();
  const expected = crypto.createHmac('sha256', secret).update(checkString).digest('hex');

  res.json({
    ok: provided === expected,
    provided_tail: provided.slice(-12),
    expected_tail: expected.slice(-12),
    keysUsed: keys,
    botTokenTail: ENV.BOT_TOKEN.slice(-8),
    reason: provided ? (provided === expected ? 'match' : 'mismatch') : 'hash_missing',
  });
});

import { bot } from '../bot/bot';
api.get('/_whoami', async (_req, res) => {
  try {
    const me = await bot.telegram.getMe();
    res.json({ username: me.username || '', id: me.id, botTokenTail: ENV.BOT_TOKEN.slice(-8) });
  } catch {
    res.json({ username: '', id: 0, botTokenTail: ENV.BOT_TOKEN.slice(-8) });
  }
});
api.use(telegramAuth);



api.use(SearchRouter);
api.use("/s/:slug", resolveTenant, SearchRouter);


const upload = multer({ storage: multer.memoryStorage() });
// real R2 upload
api.post("/uploads/image", upload.single("file"), async (req: Request, res: ExResponse, next: NextFunction) => {
  try {
    const tenantId = (req as any).tenantId || "global";

    const file = req.file;                          // <-- narrow
    if (!file) return res.status(400).json({ error: "file_required" });

    const img = await upsertImageFromBytes(file.buffer, file.mimetype, tenantId);

    const ext = extFromMime(file.mimetype);         // <-- returns union
    const webUrl = publicImageUrl(img.id, ext);     // <-- OK for TS now

    return res.json({
      imageId: img.id,
      width: img.width,
      height: img.height,
      mime: img.mime,
      key: img.key,
      webUrl,                                       // <-- add preview URL
    });
  } catch (e) {
    next(e);
  }
});









// Converts a MIME type to a safe extension literal that matches publicImageUrl()'s type
function extFromMime(mime?: string | null): "jpg" | "png" | "webp" | undefined {
  if (!mime) return "jpg";
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpg";
}



// ---------- Catalog ----------
api.get("/categories", async (_req, res, next) => {
  try {
    const cats = await CatalogService.listAllCategoriesForCascader();
    // cats already in shape: [{ id, title }, ...] and prefixed with "All"
    res.json(cats);
  } catch (e) {
    next(e);
  }
});





// ... your other api routes ...

const DEV = process.env.NODE_ENV !== "production";







// ---------- Profile ----------

// top of file
const DEFAULT_AVATARS = Array.from({ length: 20 }).map((_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return `/avatars/avatar-${n}.png`;
});


// ---------- Profile ----------
