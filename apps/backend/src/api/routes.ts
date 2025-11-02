// apps/backend/src/server/routes.ts
import { Router } from 'express';

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


import type { Request } from "express";
import type { Tenant } from "@prisma/client";
type ReqWithTenant = Request & { tenantId?: string; tenant?: Tenant };


export const api = Router();

const BOT_TOKEN = process.env.BOT_TOKEN!;
if (!BOT_TOKEN) {
  // optional: log a warning; the route below needs it.
  console.warn("BOT_TOKEN is missing – /api/products/:id/image will not work.");
}

function resolveBotToken(slug?: string | null) {
  // Prefer per-tenant env var, else global bot token
  return (slug ? process.env[`BOT_TOKEN__${slug.toUpperCase()}`] : undefined) || process.env.BOT_TOKEN;
}


function int(v: any, d: number) { const n = parseInt(String(v ?? ''), 10); return Number.isFinite(n) ? n : d; }

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

api.get("/_debug/tenant-cats", async (_req, res) => {
  const tenantId = await (await import("../services/tenant.util")).getTenantId();
  const count = await db.category.count({ where: { tenantId } });
  res.json({ tenantId, count });
});

//api.post('/auth/telegram', authTelegramHandler);
// -------- AUTH GUARD --------
api.use(telegramAuth);

// apps/backend/src/server/routes.ts  (add near other routes)
api.post('/tenants', async (req: any, res) => {
  // requires telegramAuth earlier so req.userId is set
  const userId = req.userId!;
  const { name } = req.body || {};
  if (!name || String(name).trim().length < 3) return res.status(400).json({ error: 'name_too_short' });

  const clean = String(name).trim();
  const slugBase = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const slug = slugBase || `shop-${Math.random().toString(36).slice(2, 6)}`;

  const exists = await db.tenant.findUnique({ where: { slug } });
  const finalSlug = exists ? `${slug}-${Math.random().toString(36).slice(2, 4)}` : slug;

  const tenant = await db.$transaction(async (tx) => {
    const t = await tx.tenant.create({ data: { slug: finalSlug, name: clean } });
    await tx.membership.create({ data: { tenantId: t.id, userId, role: 'OWNER' } });
    return t;
  });

  res.json({ tenant });
});


// GET /shops/list?userId=123
// GET /shops/list → returns shops for *authenticated* Telegram user
api.get("/shops/list", async (req: any, res, next) => {
  try {
    const userId = req.userId; // 👈 come from telegramAuth above
    console.log("[/shops/list] userId=", userId);

    if (!userId) {
      return res.status(401).json({ error: "unauthorized_no_user" });
    }

    const owned = await db.membership.findMany({
      where: { userId, role: "OWNER" },
      include: { tenant: true },
    });

    const joined = await db.membership.findMany({
      where: { userId, role: { in: ["MEMBER", "HELPER", "COLLABORATOR"] } },
      include: { tenant: true },
    });

    res.json({
      universal: { title: "Universal Shop", key: "universal" },
      myShops: owned.map((m) => m.tenant),
      joinedShops: joined.map((m) => m.tenant),
    });
  } catch (e) {
    next(e);
  }
});


const upload = multer({ storage: multer.memoryStorage() });
// real R2 upload
api.post("/uploads/image", upload.single("file"), async (req: any, res, next) => {
  try {
    const userId = req.userId!;        // from telegramAuth
    const tenantId = req.tenantId || "global"; // if you want to default; or make it required
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "file_required" });
    }

    // 👇 THIS calls your existing r2.ts logic
    const img = await upsertImageFromBytes(file.buffer, file.mimetype, tenantId);

    // img.id is the value we will store in productImage.imageId
    res.json({
      imageId: img.id,
      width: img.width,
      height: img.height,
      mime: img.mime,
      key: img.key,
    });
  } catch (e) {
    next(e);
  }
});


// Create invite (OWNER)
api.post('/tenants/:tenantId/invites', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { role, maxUses, expiresAt, actorId } = req.body;
    const code = Math.random().toString(36).slice(2,10);
    const invite = await db.shopInvite.create({
      data: { tenantId, role, maxUses, expiresAt: expiresAt ? new Date(expiresAt) : null, code, createdBy: actorId },
    });
    res.json({ invite, deepLink: `https://t.me/${process.env.BOT_USERNAME}?start=join_${code}` });
  } catch (e) { next(e); }
});

// Accept invite (bot callback)
api.post('/invites/accept', async (req, res, next) => {
  try {
    const { code, userId } = req.body;
    const inv = await db.shopInvite.findUnique({ where: { code } });
    if (!inv) return res.status(404).json({ error: 'invalid invite' });
    if (inv.expiresAt && inv.expiresAt < new Date()) return res.status(410).json({ error: 'expired' });
    if (inv.maxUses && inv.usedCount >= inv.maxUses) return res.status(409).json({ error: 'max uses reached' });

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

// List members
api.get('/tenants/:tenantId/members', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const members = await db.membership.findMany({ where: { tenantId }, include: { user: true } });
    res.json({ members });
  } catch (e) { next(e); }
});

// Update role (OWNER)
api.patch('/tenants/:tenantId/members/:userId', async (req, res, next) => {
  try {
    const { tenantId, userId } = req.params;
    const { role, actorId } = req.body;
    const m = await db.membership.update({ where: { tenantId_userId: { tenantId, userId } }, data: { role } });
    await db.membershipAudit.create({ data: { tenantId, actorId, targetId: userId, action: 'ROLE_UPDATE', toRole: role } });
    res.json({ member: m });
  } catch (e) { next(e); }
});

// Remove member
api.delete('/tenants/:tenantId/members/:userId', async (req, res, next) => {
  try {
    const { tenantId, userId } = req.params;
    await db.membership.delete({ where: { tenantId_userId: { tenantId, userId } } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/tenants  { name }  → creates tenant and OWNER membership
api.post("/tenants", async (req: any, res, next) => {
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

// UNIVERSAL FEED
api.get('/universal', async (req, res, next) => {
  try {
    const { q, categoryId, limit, cursor } = req.query as any;

    // ✅ FIX: method is listUniversalFeed (not universalFeed)
    const { items, nextCursor } = await CatalogService.listUniversalFeed({
      q,
      categoryId,
      limit: limit ? Number(limit) : undefined,
      cursor: cursor as string | undefined,
    });

    res.json({ items, nextCursor });
  } catch (e) { next(e); }
});

// apps/backend/src/api/products.ts (or wherever you have it)
api.post("/shop/:slug/products", resolveTenant, async (req: any, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const slug = req.params.slug;
    const {
      title,
      price,
      currency,
      description,
      categoryId,
      stock,
      active = true,
      imageIds,
    } = req.body || {};

    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({ error: "title_required" });
    }

    const priceNum = Number(price);
    if (price === undefined || Number.isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: "invalid_price" });
    }

    const stockNumRaw = stock === undefined || stock === null || stock === "" ? 0 : Number(stock);
    if (Number.isNaN(stockNumRaw) || stockNumRaw < 0 || !Number.isInteger(stockNumRaw)) {
      return res.status(400).json({ error: "invalid_stock" });
    }

    const product = await db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          tenantId,
          title: title.trim(),
          price: priceNum,
          currency: currency || "ETB",
          description: description ?? null,
          categoryId: categoryId ?? null,
          stock: stockNumRaw,
          active,
        },
      });

      if (Array.isArray(imageIds) && imageIds.length > 0) {
        for (let i = 0; i < imageIds.length; i++) {
          await tx.productImage.create({
            data: {
              tenantId,
              productId: p.id,
              imageId: imageIds[i],
              position: i,
            },
          });
        }
      }

      return p;
    });

    res.json({ productId: product.id });
  } catch (e) {
    next(e);
  }
});


// GET single product with all images
api.get("/shop/:slug/products/:id", resolveTenant, async (req: any, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const productId = String(req.params.id);

    const product = await db.product.findFirst({
      where: { id: productId, tenantId },
    });

    if (!product) {
      return res.status(404).json({ error: "product_not_found" });
    }

    const images = await db.productImage.findMany({
      where: { productId, tenantId },
      orderBy: { position: "asc" },
      select: { id: true, imageId: true, tgFileId: true, url: true, position: true },
    });

    // turn imageId into public url (same logic you already have)
    const imagesWithUrl = await Promise.all(
      images.map(async (im) => {
        if (im.imageId) {
          const imgRow = await db.image.findUnique({
            where: { id: im.imageId },
            select: { mime: true },
          });
          const mime = imgRow?.mime?.toLowerCase() || "image/jpeg";
          let ext: "jpg" | "png" | "webp" = "jpg";
          if (mime.includes("png")) ext = "png";
          else if (mime.includes("webp")) ext = "webp";
          return {
            ...im,
            webUrl: publicImageUrl(im.imageId!, ext),
          };
        }
        if (im.url) {
          return { ...im, webUrl: im.url };
        }
        return { ...im, webUrl: null };
      })
    );

    res.json({
      product,
      images: imagesWithUrl,
    });
  } catch (e) {
    next(e);
  }
});



// UPDATE PRODUCT in a tenant

api.patch("/shop/:slug/products/:id", resolveTenant, async (req: any, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const productId = req.params.id;
    const {
      title,
      price,
      currency,
      description,
      categoryId,
      stock,
      active,
      imageIds,
      imagesReplace,
    } = req.body || {};

    await db.$transaction(async (tx) => {
      const data: any = {};

      if (title !== undefined) data.title = String(title).trim();
      if (currency !== undefined) data.currency = currency;
      if (description !== undefined) data.description = description;
      if (categoryId !== undefined) data.categoryId = categoryId;
      if (active !== undefined) data.active = !!active;

      if (price !== undefined) {
        const priceNum = Number(price);
        if (Number.isNaN(priceNum) || priceNum < 0) {
          throw new Error("invalid_price");
        }
        data.price = priceNum;
      }

      if (stock !== undefined) {
        const stockNum = Number(stock);
        if (Number.isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
          throw new Error("invalid_stock");
        }
        data.stock = stockNum;
      }

      await tx.product.update({
        where: { id: productId, tenantId },
        data,
      });

      // images — keep your existing logic
      if (Array.isArray(imageIds)) {
        await tx.productImage.deleteMany({ where: { tenantId, productId } });
        for (let i = 0; i < imageIds.length; i++) {
          await tx.productImage.create({
            data: {
              tenantId,
              productId,
              imageId: imageIds[i],
              position: i,
            },
          });
        }
        return;
      }

      if (Array.isArray(imagesReplace)) {
        await tx.productImage.deleteMany({ where: { tenantId, productId } });

        for (let i = 0; i < imagesReplace.length; i++) {
          const item = imagesReplace[i];
          if (item.type === "existing") {
            const old = await tx.productImage.findUnique({
              where: { id: item.productImageId },
            });
            if (!old) continue;
            await tx.productImage.create({
              data: {
                tenantId,
                productId,
                imageId: old.imageId,
                url: old.url,
                tgFileId: old.tgFileId,
                position: i,
              },
            });
          } else if (item.type === "new") {
            await tx.productImage.create({
              data: {
                tenantId,
                productId,
                imageId: item.imageId,
                position: i,
              },
            });
          }
        }
      }
    });

    res.json({ ok: true });
  } catch (e: any) {
    if (e?.message === "invalid_price" || e?.message === "invalid_stock") {
      return res.status(400).json({ error: e.message });
    }
    next(e);
  }
});




// TENANT PRODUCTS by slug
// TENANT PRODUCTS by slug
api.get('/shop/:slug/products', resolveTenant, async (req: ReqWithTenant, res, next) => {
  try {
    const tenantId = req.tenantId!;

    const products = await db.product.findMany({
      where: { tenantId, active: true },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        images: { orderBy: { position: 'asc' }, take: 1, select: { tgFileId: true, imageId: true, url: true } },
      },
    });

    const items = await Promise.all(
      products.map(async (p) => {
        const photo = await firstImageWebUrl(p.id);
        return {
          id: p.id,
          title: p.title,
          description: p.description ?? null,
          price: Number(p.price),
          currency: p.currency,
          stock: p.stock,
          active: p.active,
          categoryId: p.categoryId ?? null,
          photoUrl: photo,
        };
      })
    );

    res.json({ items, tenant: req.tenant });
  } catch (e) { next(e); }
});



// CONTACT INTENT from universal
api.post('/products/:productId/contact', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { type, buyerTgId } = req.body as { type: 'message' | 'call'; buyerTgId: string };

    if (type !== 'message' && type !== 'call') {
      return res.status(400).json({ error: 'type must be "message" or "call"' });
    }

    const product = await db.product.findUnique({ where: { id: productId }, select: { tenantId: true } });
    if (!product) return res.status(404).json({ error: 'not found' });

    await db.contactIntent.create({
      data: { tenantId: product.tenantId, productId, buyerTgId, type },
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});



// ---------- Catalog ----------
api.get("/categories", async (_req, res, next) => {
  try {
    const cats = await CatalogService.listCategories();
    // cats already in shape: [{ id, title }, ...] and prefixed with "All"
    res.json(cats);
  } catch (e) {
    next(e);
  }
});

// ... your other api routes ...

const DEV = process.env.NODE_ENV !== "production";

function devSend(res: any, status: number, msg: string) {
  return res.status(status).send(DEV ? msg : String(status));
}

api.get('/products', async (req, res) => {
  const categoryId = String(req.query.category || 'all');
  const page = Number(req.query.page || 1);
  const perPage = Number(req.query.perPage || 12);

  const data = await CatalogService.listProductsByCategoryPaged(categoryId, page, perPage);

  // Force-correct photoUrl for every item using the resolver
  const items = await Promise.all(
    data.items.map(async (it: any) => {
      const photo = await firstImageWebUrl(it.id);             // ← prefers R2, then TG proxy, then legacy
      const apiImage = `/api/products/${it.id}/image`;         // ← backend proxy (good universal fallback)
      const normalized = { ...it, photoUrl: photo, apiImage };
      return normalized;
    })
  );

  const result = { ...data, items };

  res.json(result);
});

api.get("/products/:id/image", async (req, res) => {
  const id = req.params.id;

  try {
    const p = await db.product.findFirst({
      where: { id, active: true },
      include: {
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: { tgFileId: true, imageId: true, url: true },
        },
        tenant: { select: { slug: true } },
      },
    });

    if (!p) {
      console.warn("[image:route] product not found or inactive", { productId: id });
      return res.status(404).send(`Product not found or inactive: ${id}`);
    }

    const im = p.images?.[0];
    if (!im) {
      console.warn("[image:route] no image rows", { productId: id });
      return res.status(404).send(`No image for product: ${id}`);
    }

    // 2) R2 image → fetch and stream (avoid redirect so we control headers)
    if (im.imageId) {
      const url = publicImageUrl(im.imageId, "jpg");

      const r2 = await fetch(url);
      if (!r2.ok) {
        const t = await r2.text().catch(() => "");
        console.error("[image:route] r2 fetch failed", { status: r2.status, body: t.slice(0,200), url });
        return res.status(502).send("R2 fetch failed");
      }

      // Force correct headers for <img>
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Type", r2.headers.get("content-type") || "image/jpeg");

      const body: any = r2.body;
      if (body && typeof (Readable as any).fromWeb === "function") {
        return (Readable as any).fromWeb(body).pipe(res);
      }
      const buf = Buffer.from(await r2.arrayBuffer());
      res.setHeader("Content-Length", String(buf.length));
      return res.end(buf);
}


    if (im.url && /^https?:\/\//i.test(im.url)) {
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.redirect(302, im.url);
    }

    if (im.tgFileId) {
      const slug = p.tenant?.slug;
      const botToken = resolveBotToken(slug);

      if (!botToken) {
        console.error("[image:route] missing bot token", { productId: id, slug });
        return res.status(500).send(`BOT_TOKEN missing for tenant ${slug ?? "(unknown)"}`);
      }
      const meta = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(im.tgFileId)}`
      );
      const metaJson: any = await meta.json().catch(() => null);
      if (!metaJson?.ok || !metaJson?.result?.file_path) {
        console.error("[image:route] getFile failed", { productId: id, meta: metaJson });
        return res.status(502).send(`Telegram getFile error`);
      }

      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${metaJson.result.file_path}`;
      const tgResp = await fetch(fileUrl);
      if (!tgResp.ok) {
        const t = await tgResp.text();
        console.error("[image:route] telegram fetch failed", { productId: id, status: tgResp.status, body: t.slice(0, 200) });
        return res.status(502).send(`Telegram file fetch ${tgResp.status}`);
      }

      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Content-Type", tgResp.headers.get("content-type") ?? "image/jpeg");

      const body: any = tgResp.body;
      if (body && typeof (Readable as any).fromWeb === "function") {
        return (Readable as any).fromWeb(body).pipe(res);
      }

      const buf = Buffer.from(await tgResp.arrayBuffer());
      res.setHeader("Content-Length", String(buf.length));
      return res.end(buf);
    }

    console.warn("[image:route] unsupported image source", { productId: id, im });
    return res.status(400).send("Unsupported image source");
  } catch (err: any) {
    console.error("[image:route] error", { productId: id, err: err?.message, stack: err?.stack });
    return res.status(500).send(`image proxy error: ${err?.message ?? String(err)}`);
  }
});

import { getTenantId } from '../services/tenant.util';
// ---------- Cart ----------
api.get('/cart', async (req: any, res) => {
  console.log('[API] GET /cart tenantId=', await getTenantId(), 'userId=', req.userId);
  const userId = req.userId!;
  const cart = await CartService.list(userId);
  res.json(cart || { id: null, userId, items: [] });
});

api.post('/cart/items', async (req: any, res) => {
  const userId = req.userId!;
  const { productId, qty } = req.body || {};
  if (!productId) return res.status(400).json({ error: 'productId required' });
  await CartService.add(userId, String(productId), int(qty, 1));
  const cart = await CartService.list(userId);
  res.json(cart);
});

api.patch('/cart/items/:id', async (req: any, res) => {
  console.log('[API] PATCH /cart/items', req.params.id, 'tenantId=', await getTenantId(), 'userId=', req.userId);
  const itemId = String(req.params.id);
  const { qtyDelta } = req.body || {};
  if (!qtyDelta || !Number.isInteger(qtyDelta)) return res.status(400).json({ error: 'qtyDelta required (int)' });

  if (qtyDelta > 0) {
    await CartService.inc(itemId);
  } else {
    // apply |qtyDelta| times dec() — simple & safe
    for (let i = 0; i < Math.abs(qtyDelta); i++) await CartService.dec(itemId);
  }
  res.json({ ok: true });
});

api.delete('/cart/items/:id', async (req: any, res) => {
  const userId = req.userId!;
  const itemId = String(req.params.id);

  // Ensure item belongs to the user's cart before deleting
  const item = await db.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    select: { id: true },
  });

  if (!item) return res.status(404).json({ error: 'not found' });

  await db.cartItem.delete({ where: { id: itemId } });
  res.json({ ok: true });
});


// ---------- Checkout / Buy Now ----------
api.post('/checkout', async (req: any, res) => {
  const userId = req.userId!;
  const { shippingAddress, note } = req.body || {};
  try {
    const order = await OrdersService.checkoutFromCartWithDetails(userId, { shippingAddress, note });
    res.json(order);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'checkout failed' });
  }
});

// Single-item flow but same validations live in OrdersService
api.post('/buy-now', async (req: any, res) => {
  const userId = req.userId!;
  const { productId, shippingAddress, note } = req.body || {};
  if (!productId) return res.status(400).json({ error: 'productId required' });
  const p = await db.product.findUnique({ where: { id: String(productId) } });
  if (!p || !p.active) return res.status(400).json({ error: 'product unavailable' });
  try {
    const order = await OrdersService.createSingleItemPending(
   userId,
   { id: p.id, title: p.title, price: p.price.toNumber(), currency: p.currency },
   { shippingAddress, note }
 );
    res.json(order);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'buy-now failed' });
  }
});

// ---------- Orders ----------
api.get('/orders', async (req: any, res) => {
  const userId = req.userId!;
  const take = int(req.query.take, 20);
  const orders = await OrdersService.listUserOrders(userId, take);
  res.json(orders);
});

api.get('/orders/:id', async (req: any, res) => {
  const userId = req.userId!;
  const id = String(req.params.id);
  const order = await db.order.findUnique({ where: { id, userId }, include: { items: true } });
  if (!order) return res.status(404).json({ error: 'not found' });
  res.json(order);
});

// ---------- Profile ----------
api.get('/profile', async (req: any, res) => {
  const userId = req.userId!;
  const u = await db.user.findUnique({ where: { tgId: userId } });
  res.json({
    tgId: userId,
    username: u?.username ?? null,
    name: u?.name ?? null,
    phone: u?.phone ?? null
  });
});

api.put('/profile', async (req: any, res) => {
  const userId = req.userId!;
  const { phone, name, username } = req.body || {};
  const u = await db.user.upsert({
    where: { tgId: userId },
    update: { phone, name, username },
    create: { tgId: userId, phone, name, username },
  });
  res.json(u);
});

