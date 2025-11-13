// apps/backend/src/services/search.scope.ts
import { db } from "../lib/db";

export type SearchScope = "universal" | "owner" | "buyer";

export async function resolveTenantIdsForScope(
  scope: SearchScope,
  userId: string | null,
  ownerTenantId: string | null
): Promise<string[] | "ALL"> {
  switch (scope) {
    case "universal":
      return "ALL";
    case "owner":
      return ownerTenantId ? [ownerTenantId] : [];
    case "buyer":
      if (!userId) return [];
      const rows = await db.membership.findMany({
        where: { userId },
        select: { tenantId: true },
      });
      return rows.map((r) => r.tenantId);
  }
}
