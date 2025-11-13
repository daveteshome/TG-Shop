import { publicImageUrl } from "../lib/r2";

export function toPhotoUrl(row: {
  imgUrl?: string | null;
  imgImageId?: string | null;
  imgMime?: string | null;
}): string | null {
  // Prefer explicit URL saved on ProductImage
  if (row?.imgUrl) return row.imgUrl;

  // Fallback to CDN URL from imageId + mime
  if (row?.imgImageId) {
    const mime = (row.imgMime || "").toLowerCase();
    let ext: "jpg" | "png" | "webp" = "jpg";
    if (mime.includes("png")) ext = "png";
    else if (mime.includes("webp")) ext = "webp";
    return publicImageUrl(row.imgImageId, ext);
  }
  return null;
}
