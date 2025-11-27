import { db } from "../lib/db";

const norm = (s: string) => s.trim().toLowerCase();

type Where = {
  tenantIds: string[] | "ALL";
  activeOnly?: boolean;
  categoryId?: string | null;
  approvedOnly?: boolean;
};

function buildWhereFor(
  where: Where,
  baseParamIndex: number, // 3 for data (q,limit,offset), 1 for count (q)
) {
  // base match is always $1 (q), regardless of baseParamIndex
  const clauses: string[] = [
    `(
      lower(p.title)       LIKE '%' || $1 || '%'
      OR lower(p.description) LIKE '%' || $1 || '%'
    )`,
  ];

  // we'll compute param indexes relative to baseParamIndex
  let nextIdx = baseParamIndex;

  const params: any[] = [];

  // tenantIds
  if (where.tenantIds === "ALL") {
    // no clause
  } else if (Array.isArray(where.tenantIds) && where.tenantIds.length > 0) {
    nextIdx += 1; // reserve index for tenantIds array
    clauses.push(`"p"."tenantId" = ANY($${nextIdx}::text[])`);
    params.push(where.tenantIds);
  } else {
    clauses.push("FALSE");
  }

  // activeOnly
  if (where.activeOnly) {
    clauses.push(`"p"."active" = true`);
  }

  // approvedOnly (for universal search)
  if (where.approvedOnly) {
    clauses.push(`"p"."publishToUniversal" = true`);
    clauses.push(`"p"."reviewStatus" = 'approved'`);
  }

  // categoryId
  if (where.categoryId) {
    nextIdx += 1;
    clauses.push(`"p"."categoryId" = $${nextIdx}::text`);
    params.push(where.categoryId);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return { whereSql, params };
}

export async function searchProductsRaw({
  q, limit, offset, where,
}: {
  q: string; limit: number; offset: number; where: Where;
}) {
  const query = norm(q);
  if (!query) return { rows: [], total: 0 };

  // ---------- DATA QUERY (base params: $1=q, $2=limit, $3=offset) ----------
  const dataWhere = buildWhereFor(where, /* baseParamIndex */ 3);

  const dataSql = `
    WITH src AS (
      SELECT
        p.id, p.title, p.description, p.price, p.currency,
        t.slug AS "tenantSlug", t.name AS "tenantName",

        img."imageId" AS "imgImageId",
        img."url"     AS "imgUrl",
        i."mime"      AS "imgMime",

        (CASE WHEN lower(p.title)       LIKE '%' || $1 || '%' THEN 1 ELSE 0 END) AS title_hit,
        (CASE WHEN lower(p.description) LIKE '%' || $1 || '%' THEN 1 ELSE 0 END) AS desc_hit
      FROM "Product" p
      JOIN "Tenant" t ON t.id = p."tenantId"
      LEFT JOIN LATERAL (
        SELECT pi."imageId", pi."url", pi."position", pi.id AS "piId"
        FROM "ProductImage" pi
        WHERE pi."productId" = p.id
        ORDER BY COALESCE(pi."position", 1000000000) ASC, pi.id ASC
        LIMIT 1
      ) AS img ON TRUE
      LEFT JOIN "Image" i ON i.id = img."imageId"
      ${dataWhere.whereSql}
    )
    SELECT *
    FROM src
    ORDER BY
      title_hit DESC,
      desc_hit  DESC,
      title     ASC
    LIMIT $2 OFFSET $3;
  `;

  const dataArgs = [query, limit, offset, ...dataWhere.params];
  const rows = await db.$queryRawUnsafe<any[]>(dataSql, ...dataArgs);

  // ---------- COUNT QUERY (base params: $1=q) ----------
  const countWhere = buildWhereFor(where, /* baseParamIndex */ 1);

  const countSql = `
    SELECT count(*)::int AS n
    FROM "Product" p
    ${countWhere.whereSql}
  `;
  const countArgs = [query, ...countWhere.params];
  const [{ n: total }] = await db.$queryRawUnsafe<{ n: number }[]>(countSql, ...countArgs);

  return { rows, total };
}
