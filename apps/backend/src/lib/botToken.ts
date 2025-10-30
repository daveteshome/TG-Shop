import { db } from "./db";

// Small in-memory cache to avoid hitting DB/env on every call
const cache = new Map<string, { token: string; exp: number }>();
const TTL_MS = 5 * 60 * 1000;

/**
 * Resolve a bot token from environment variables for a given slug.
 * Priority:
 *   1) BOT_TOKEN__<SLUG_IN_UPPERCASE>
 *   2) BOT_TOKEN
 */
function resolveFromEnv(slug?: string | null): string | undefined {
  const bySlug = slug ? process.env[`BOT_TOKEN__${String(slug).toUpperCase()}`] : undefined;
  return bySlug || process.env.BOT_TOKEN || undefined;
}

/**
 * Get bot token for a tenant by id. Caches result for TTL_MS.
 * Uses tenant.slug from DB, then resolves token from env.
 */
export async function getBotTokenForTenant(tenantId: string): Promise<string> {
  const now = Date.now();
  const hit = cache.get(tenantId);
  if (hit && hit.exp > now) return hit.token;

  // Only select slug; we no longer store/select a botToken column
  const t = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });

  const token = resolveFromEnv(t?.slug);
  if (!token) {
    throw Object.assign(new Error("BOT_TOKEN not configured (set BOT_TOKEN or BOT_TOKEN__<TENANT_SLUG>)"), {
      status: 500,
    });
  }

  cache.set(tenantId, { token, exp: now + TTL_MS });
  return token;
}

/**
 * Optional convenience if you already know the tenant slug (avoid DB hit).
 */
export function getBotTokenForSlug(slug?: string | null): string {
  const token = resolveFromEnv(slug);
  if (!token) {
    throw Object.assign(new Error("BOT_TOKEN not configured (set BOT_TOKEN or BOT_TOKEN__<TENANT_SLUG>)"), {
      status: 500,
    });
  }
  return token;
}
