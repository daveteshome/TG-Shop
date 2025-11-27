import { Router } from "express";
import { db } from "../lib/db";
import { telegramAuth } from "../api/telegramAuth";
import { publicImageUrl } from "../lib/r2";
import { extFromMime } from "./utils/ext";

const shopsRouter = Router();

// All endpoints here require Telegram auth
shopsRouter.use(telegramAuth);

// GET /api/shops/list  → returns { universal, myShops, joinedShops }
// GET /api/shops/list  → returns { universal, myShops, joinedShops }
shopsRouter.get("/shops/list", async (req: any, res, next) => {
  console.log("on routs.ts page 12 [/shops/list] userId=");
  try {
    const userId = req.userId!;

    // My Shops: OWNER, COLLABORATOR, HELPER (management access)
    const myShopsMemberships = await db.membership.findMany({
      where: { 
        userId, 
        role: { in: ["OWNER", "COLLABORATOR", "HELPER"] },
        tenant: {
          deletedAt: null  // Only show non-deleted shops
        }
      },
      include: { tenant: true },
    });

    // Joined Shops: MEMBER only (read-only access)
    const joinedMemberships = await db.membership.findMany({
      where: { 
        userId, 
        role: "MEMBER",
        tenant: {
          deletedAt: null  // Only show non-deleted shops
        }
      },
      include: { tenant: true },
    });

    // tenant objects with role
    const myTenants = myShopsMemberships.map((m: any) => ({
      ...m.tenant,
      userRole: m.role, // Include the user's role in this shop
    }));
    const joinedTenants = joinedMemberships.map((m: any) => ({
      ...m.tenant,
      userRole: m.role,
    }));

    // build logoWebUrl for all tenants
    const logoIds = Array.from(
      new Set(
        [...myTenants, ...joinedTenants]
          .map((t: any) => t?.logoImageId)
          .filter((id: string | null | undefined): id is string => Boolean(id))
      )
    );

    let logoMap: Record<string, string> = {};
    if (logoIds.length) {
      const images = await db.image.findMany({
        where: { id: { in: logoIds } },
        select: { id: true, mime: true },
      });

      logoMap = Object.fromEntries(
        images.map((im) => {
          const ext = extFromMime(im.mime);
          return [im.id, publicImageUrl(im.id, ext)];
        })
      );
    }

    const withLogo = (t: any) => ({
      ...t,
      logoWebUrl: t.logoImageId ? logoMap[t.logoImageId] ?? null : null,
    });

    res.json({
      universal: { title: "Universal Shop", key: "universal" },
      myShops: myTenants.map(withLogo),
      joinedShops: joinedTenants.map(withLogo),
    });
  } catch (e) {
    next(e);
  }
});


// POST /api/tenants  { name }  → creates tenant and OWNER membership


export default shopsRouter;
