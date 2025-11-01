// backend/src/services/image.resolve.ts
import { db } from "../lib/db";
import { publicImageUrl } from "../lib/r2";
import { ENV } from "../config/env";

function maybeConvertWorkerUrlToR2(url: string): string | null {
  try {
    const m = /\/images\/([0-9a-f]{64})\//i.exec(url);
    if (!m) return null;
    if (!ENV.R2_PUBLIC_BASE) {
      console.warn("[img] R2_PUBLIC_BASE missing; keeping legacy Worker URL");
      return null;
    }
    const sha = m[1];
    return publicImageUrl(sha, "jpg");
  } catch (e) {
    console.warn("[img] convert Worker→R2 failed; keeping legacy URL", {
      url,
      err: (e as Error).message,
    });
    return null;
  }
}

function extFromMime(mime: string | null | undefined): "jpg" | "png" | "webp" {
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpg";
}

/**
 * Best public web URL for the first image of a product.
 */
export async function firstImageWebUrl(productId: string): Promise<string | null> {
  const img = await db.productImage.findFirst({
    where: { productId },
    orderBy: { position: "asc" },
    select: { imageId: true, tgFileId: true, url: true },
  });

  if (!img) return null;

  // 1) R2 image (this is your new webapp-uploaded case)
  if (img.imageId) {
    const imageRow = await db.image.findUnique({
      where: { id: img.imageId }, // 👈 now it's guaranteed string
      select: { mime: true },
    });
    const ext = extFromMime(imageRow?.mime);
    return publicImageUrl(img.imageId, ext);
  }

  // 2) Telegram file — let the /api/products/:id/image route handle it
  if (img.tgFileId) {
    // you already have a route that redirects to the right file
    return `/api/products/${productId}/image`;
  }

  // 3) Legacy plain URL
  if (img.url) {
    const converted = maybeConvertWorkerUrlToR2(img.url);
    return converted || img.url;
  }

  return null;
}

/**
 * For the bot — keep as-is, but we can also make it extension-aware.
 */
export async function resolveProductPhotoInput(productId: string) {
  const img = await db.productImage.findFirst({
    where: { productId },
    orderBy: { position: "asc" },
    select: { imageId: true, tgFileId: true, url: true },
  });
  if (!img) return null;

  // telegram file
  if (img.tgFileId) return img.tgFileId;

  // r2 image
  if (img.imageId) {
    const imageRow = await db.image.findUnique({
      where: { id: img.imageId },
      select: { mime: true },
    });
    const ext = extFromMime(imageRow?.mime);
    return { url: publicImageUrl(img.imageId, ext) };
  }

  // legacy url
  if (img.url && /^https?:\/\//i.test(img.url)) {
    return { url: img.url };
  }

  return null;
}
