import { db } from "./db";

/**
 * Resolve a bot token for a tenant.
 * Priority:
 *   1) BOT_TOKEN__<TENANT_SLUG_UPPERCASE>
 *   2) BOT_TOKEN
 *
 * We no longer read a botToken column from the DB (it’s not in the Prisma types).
 */
function resolveTenantBotToken(slug?: string | null): string {
  const fromTenantEnv =
    slug ? process.env[`BOT_TOKEN__${String(slug).toUpperCase()}`] : undefined;
  const token = fromTenantEnv || process.env.BOT_TOKEN || "";
  return token;
}

/**
 * Download a Telegram file by file_id for a given tenant.
 * Returns raw bytes and a best-effort MIME type.
 */
export async function downloadFileByIdForTenant(
  fileId: string,
  tenantId: string
): Promise<{ bytes: Buffer; mime: string }> {
  // Only select slug; token comes from env via resolveTenantBotToken()
  const t = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });

  const botToken = resolveTenantBotToken(t?.slug);
  if (!botToken) {
    throw new Error(
      "BOT_TOKEN not configured (set BOT_TOKEN or BOT_TOKEN__<TENANT_SLUG>)"
    );
  }

  const metaResp = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(
      fileId
    )}`
  );
  const metaJson: any = await metaResp.json().catch(() => null);
  const path = metaJson?.result?.file_path;
  if (!metaJson?.ok || !path) {
    throw new Error("Telegram getFile failed");
  }

  const fileResp = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${path}`
  );
  if (!fileResp.ok) {
    throw new Error(`Telegram file fetch ${fileResp.status}`);
  }

  const buf = Buffer.from(await fileResp.arrayBuffer());
  // Telegram often returns a generic/empty content-type; default to image/jpeg
  const ct = fileResp.headers.get("content-type") || "image/jpeg";
  return { bytes: buf, mime: ct };
}

/**
 * Convenience: build a public Telegram file URL for the first image of a product.
 * Returns null if the product or its first tgFileId is missing.
 */
export async function telegramFileUrlForProduct(
  productId: string
): Promise<string | null> {
  const p = await db.product.findFirst({
    where: { id: productId },
    include: {
      images: {
        orderBy: { position: "asc" },
        take: 1,
        select: { tgFileId: true },
      },
      tenant: { select: { slug: true } }, // ❗️only slug, no botToken in DB
    },
  });

  const tgFileId = p?.images?.[0]?.tgFileId;
  if (!p || !tgFileId) return null;

  const botToken = resolveTenantBotToken(p.tenant?.slug);
  if (!botToken) {
    throw new Error(
      "BOT_TOKEN missing (set BOT_TOKEN or BOT_TOKEN__<TENANT_SLUG>)"
    );
  }

  const meta = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(
      tgFileId
    )}`
  );
  const metaJson: any = await meta.json().catch(() => null);
  const filePath = metaJson?.result?.file_path;
  if (!metaJson?.ok || !filePath) throw new Error("Telegram getFile failed");

  return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
}
