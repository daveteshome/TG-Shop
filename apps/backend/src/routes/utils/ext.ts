export function extFromMime(
  mime?: string | null
): "jpg" | "png" | "webp" | undefined {
  if (!mime) return "jpg";
  const m = mime.toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpg";
}
