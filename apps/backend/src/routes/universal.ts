// apps/backend/src/routes/universal.ts
import { Router } from "express";
import { db } from "../lib/db";
import { publicImageUrl } from "../lib/r2";

const router = Router();

function buildWebUrlFromImage(im: any): string | null {
  if (!im) return null;

  if (im.imageId) {
    const mime = im.image?.mime?.toLowerCase?.() || "";
    let ext: "jpg" | "png" | "webp" = "jpg";
    if (mime.includes("png")) ext = "png";
    else if (mime.includes("webp")) ext = "webp";
    return publicImageUrl(im.imageId, ext);
  }

  if (im.url) return im.url;

  return null;
}

// GET /api/universal/products
router.get("/products", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(req.query.perPage ?? 20)));
  const skip = (page - 1) * perPage;

  const categoryId = (req.query.category as string) || undefined;
  const q = (req.query.q as string) || undefined;

  const where: any = {
    active: true,
    isPublished: true,
    publishToUniversal: true,
    tenant: {
      publishUniversal: true,
    },
  };

  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (q) {
    where.title = { contains: q, mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
      include: {
        images: {
          orderBy: { position: "asc" },
          include: {
            image: true,
          },
        },
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
            publicPhone: true,
            publishUniversal: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    db.product.count({ where }),
  ]);

  const itemsWithUrls = items.map((p) => ({
    ...p,
    images: (p.images || []).map((im: any) => ({
      ...im,
      webUrl: buildWebUrlFromImage(im),
    })),
  }));

  res.json({
    page,
    perPage,
    total,
    items: itemsWithUrls,
  });
});

// GET /api/universal/products/:id
router.get("/products/:id", async (req, res) => {
  const p = await db.product.findFirst({
    where: {
      id: req.params.id,
      active: true,
      isPublished: true,
      publishToUniversal: true,
      tenant: {
        publishUniversal: true,
      },
    },
    include: {
      images: {
        orderBy: { position: "asc" },
        include: {
          image: true,
        },
      },
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
          publicPhone: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!p) {
    return res.status(404).json({ error: "not_found" });
  }

  res.json({
    ...p,
    images: (p.images || []).map((im: any) => ({
      ...im,
      webUrl: buildWebUrlFromImage(im),
    })),
  });
});

export default router;
