import { Router } from 'express';
import { db } from '../lib/db';
import { publicImageUrl } from "../lib/r2"; 
import { resolveTenant } from '../middlewares/resolveTenant';
import { telegramAuth } from '../api/telegramAuth';
import { extFromMime } from "./utils/ext";;
import {Readable } from "node:stream";

export const ownerProductsRouter = Router();
ownerProductsRouter.use(telegramAuth);


async function getDescendantsIds(rootId: string): Promise<string[]> {
  const seen = new Set<string>();
  let frontier: string[] = [String(rootId)];

  while (frontier.length) {
    const rows = await db.category.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    const kids = rows.map(r => String(r.id));

    const fresh: string[] = [];
    for (const id of kids) {
      if (!seen.has(id)) {
        seen.add(id);
        fresh.push(id);
      }
    }
    frontier = fresh;
  }
  return Array.from(seen); // descendants only (not including root)
}



// apps/backend/src/api/owner.products.ts
ownerProductsRouter.post("/shop/:slug/products", resolveTenant, async (req: any, res, next) => {
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
          isPublished: true,
          publishToUniversal: true,
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

// /shop/:slug/products handler with this one ---
ownerProductsRouter.get("/shop/:slug/products", resolveTenant, async (req: any, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const categoryId = (req.query.category as string | undefined) || undefined;

    const where: any = { tenantId, active: true };

    if (categoryId && categoryId !== "all") {
      const descendants = await getDescendantsIds(categoryId);
      where.categoryId = { in: [categoryId, ...descendants] };
    }

    const products = await db.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: {
            url: true,                 // http(s) or tg:file_id (legacy)
            imageId: true,             // for publicImageUrl()
            image: { select: { mime: true } }, // to decide extension
          },
        },
        tenant: { select: { id: true, slug: true, name: true, publicPhone: true } },
      },
    });

    const items = products.map((p) => {
      const img  = p.images?.[0] || null;

      // Build R2 URL first (same as detail/logo)
      const photoUrl = img ?.imageId
        ? publicImageUrl(img .imageId, extFromMime(img .image?.mime))
        : null;

      return {
        id: p.id,
        title: p.title,
        description: p.description ?? null,
        price: Number(p.price),
        currency: p.currency,
        stock: p.stock,
        active: p.active,
        categoryId: p.categoryId ?? null,
        photoUrl,
      };
    });

    res.json({ items, tenant: req.tenant });
  } catch (e) {
    next(e);
  }
});

// GET /shop/:slug/products/:id
ownerProductsRouter.get("/shop/:slug/products/:id", resolveTenant, async (req: any, res, next) => {
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
      select: { id: true, imageId: true, position: true },
    });

    const imagesWithUrl = await Promise.all(
      images.map(async (im) => {
        if (!im.imageId) {
          return { ...im, webUrl: null };
        }

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
          webUrl: publicImageUrl(im.imageId, ext),
        };
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

ownerProductsRouter.patch("/shop/:slug/products/:id", resolveTenant, async (req: any, res, next) => {
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

ownerProductsRouter.get("/products/:id/image", async (req, res) => {
  const id = req.params.id;

  try {
    const p = await db.product.findFirst({
      where: { id, active: true },
      include: {
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: {
            imageId: true,
            image: { select: { mime: true } },
          },
        },
      },
    });

    if (!p) {
      console.warn("[image:route] product not found or inactive", { productId: id });
      return res.status(404).send(`Product not found or inactive: ${id}`);
    }

    const im = p.images?.[0];
    if (!im?.imageId) {
      console.warn("[image:route] no imageId for product", { productId: id });
      return res.status(404).send(`No image for product: ${id}`);
    }

    const ext = extFromMime(im.image?.mime);
    const url = publicImageUrl(im.imageId, ext);

    const r2 = await fetch(url);
    if (!r2.ok) {
      const t = await r2.text().catch(() => "");
      console.error("[image:route] r2 fetch failed", {
        status: r2.status,
        body: t.slice(0, 200),
        url,
      });
      return res.status(502).send("R2 fetch failed");
    }

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", r2.headers.get("content-type") || "image/jpeg");

    const body: any = r2.body;
    if (body && typeof (Readable as any).fromWeb === "function") {
      return (Readable as any).fromWeb(body).pipe(res);
    }

    const buf = Buffer.from(await r2.arrayBuffer());
    res.setHeader("Content-Length", String(buf.length));
    return res.end(buf);
  } catch (err: any) {
    console.error("[image:route] error", {
      productId: id,
      err: err?.message,
      stack: err?.stack,
    });
    return res.status(500).send(`image proxy error: ${err?.message ?? String(err)}`);
  }
});
