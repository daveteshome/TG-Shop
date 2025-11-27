import { Router } from "express";
import { db } from "../lib/db";
import { telegramAuth } from "../api/telegramAuth";

export const tenantRouter = Router();
tenantRouter.use(telegramAuth);

// 🔎 tiny helper for consistent log prefix
function logStep(step: string, extra?: any) {
  if (extra !== undefined) {
    console.log(`🧭 [create-tenant] ${step}`, extra);
  } else {
    console.log(`🧭 [create-tenant] ${step}`);
  }
}
function logErr(step: string, err: any) {
  console.error(`💥 [create-tenant][ERROR] ${step}:`, err?.message || err, err?.stack);
}

async function makeUniqueSlug(base: string): Promise<string> {
  const slugBase =
    base
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "shop";
  let candidate = slugBase;
  let i = 1;
  while (await db.tenant.findUnique({ where: { slug: candidate } })) {
    i++;
    candidate = `${slugBase}-${i}`;
  }
  return candidate;
}

// 🔹 normalize any Telegram value: @user, user, https://t.me/user
function normalizeTelegram(x?: string | null): string | null {
  if (!x) return null;
  const v = x.trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("@")) return v;
  return `https://t.me/${v}`;
}

// POST /api/tenants – create tenant with full payload, default publishUniversal=true, reassign logo
tenantRouter.post("/tenants", async (req: any, res, next) => {
  const t0 = Date.now();
  try {
    const userId = req.userId;
    if (!userId) {
      logStep("no userId → 401");
      return res.status(401).json({ error: "unauthorized" });
    }

    const {
      name,
      publicPhone = null,
      description = null,
      logoImageId = null,
      publicTelegramLink,   // 👈 now actually used
    } = req.body || {};

        // 🔎 DEBUG: log all incoming create-shop fields
    console.log("🧭 [create-tenant] incoming body", {
      userId,
      body: req.body,
    });


    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name_required" });
    }

    const publishFlag = true;
    // 🔹 Load current user to get Telegram username (tgId = userId)
    const user = await db.user.findUnique({
      where: { tgId: userId },
      select: { username: true },
    });

    // If client sends explicit link, use it; otherwise fall back to user.username
    const effectiveTelegram =
      normalizeTelegram(publicTelegramLink) ??
      normalizeTelegram(user?.username ?? null);

      // 🔎 DEBUG: see what username + telegram link we ended up with
    console.log("🧭 [create-tenant] telegram debug", {
      userId,
      userFromDb: user,
      publicTelegramLinkRaw: publicTelegramLink,
      effectiveTelegram,
    });

    const result = await db.$transaction(async (tx) => {
      logStep("transaction start");

      const slug = await makeUniqueSlug(name.trim());
      logStep("slug generated", { slug });

      // 1) Create tenant
      logStep("creating tenant…");
      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: name.trim(),
          publicPhone,
          description,
          publishUniversal: publishFlag,
          publicTelegramLink: effectiveTelegram, // 👈 default = owner's username
        },
      });
      logStep("tenant created", { id: tenant.id, slug: tenant.slug });

      // 2) Owner membership
      logStep("creating owner membership…");
      await tx.membership.create({
        data: { tenantId: tenant.id, userId, role: "OWNER" },
      });
      logStep("owner membership created");

      // 3) Optional: reassign uploaded logo, set tenant.logoImageId
      let finalTenant = tenant;
      if (logoImageId && typeof logoImageId === "string") {
        logStep("logo reassignment start", { logoImageId });

        const img = await tx.image.findUnique({ where: { id: logoImageId } });
        if (!img) {
          logStep("logo not found → 400");
          const e: any = new Error("image_not_found");
          e.code = 400;
          throw e;
        }
        logStep("logo found", { imgId: img.id, currentTenantId: img.tenantId });

        if (img.tenantId !== tenant.id) {
          logStep("updating image.tenantId…", { toTenantId: tenant.id });
          await tx.image.update({
            where: { id: img.id },
            data: { tenantId: tenant.id },
          });
          logStep("image.tenantId updated");
        } else {
          logStep("image already owned by tenant");
        }

        logStep("updating tenant.logoImageId…");
        finalTenant = await tx.tenant.update({
          where: { id: tenant.id },
          data: { logoImageId: img.id },
        });
        logStep("tenant.logoImageId set");
      } else {
        logStep("no logo provided, skipping reassignment");
      }

      logStep("transaction end");
      return finalTenant;
    });

    logStep("success response", {
      id: result.id,
      slug: result.slug,
      publishUniversal: result.publishUniversal,
      publicTelegramLink: result.publicTelegramLink,
    });
    res.json({ tenant: result });

    logStep("done", { ms: Date.now() - t0 });
  } catch (err: any) {
    logErr("outer catch", err);
    if (err?.code === 400) {
      return res.status(400).json({ error: err.message || "bad_request" });
    }
    next(err);
  }
});

// GET /shops/list → returns shops for *authenticated* Telegram user
tenantRouter.get("/shops/list", async (req: any, res, next) => {
  try {
    const userId = req.userId; // 👈 come from telegramAuth above
    console.log("[/shops/list] userId=", userId);

    if (!userId) {
      return res.status(401).json({ error: "unauthorized_no_user" });
    }

    const owned = await db.membership.findMany({
      where: { 
        userId, 
        role: "OWNER",
        tenant: {
          deletedAt: null  // Only show non-deleted shops
        }
      },
      include: { tenant: true },
    });

    const joined = await db.membership.findMany({
      where: { 
        userId, 
        role: { in: ["MEMBER", "HELPER", "COLLABORATOR"] },
        tenant: {
          deletedAt: null  // Only show non-deleted shops
        }
      },
      include: { tenant: true },
    });

    res.json({
      universal: { title: "Universal Shop", key: "universal" },
      myShops: owned.map((m) => m.tenant),
      joinedShops: joined.map((m) => m.tenant),
    });
  } catch (e) {
    next(e);
  }
});
