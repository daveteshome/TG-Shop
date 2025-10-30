import type { Context } from "telegraf";
import { db } from "../../../lib/db";

export async function handleContactStart(ctx: Context, payload?: string) {
  const raw = payload ?? (ctx as any).startPayload ?? "";
  const m = raw.match(/^contact_(.+)_(.+)$/);
  if (!m) return ctx.reply("Invalid contact link.");

  const [, tenantId, productId] = m;

  const p = await db.product.findFirst({
    where: { tenantId, id: productId, active: true },
    include: { tenant: true },
  });

  if (!p) return ctx.reply("This product is no longer available.");

  await db.contactIntent.create({
    data: { tenantId, productId, buyerTgId: String(ctx.from!.id), type: "message" },
  });

  await ctx.replyWithMarkdown(
    `You're contacting *${p.tenant.name}* about *${p.title}*.\n\n` +
      `Type your message below. The seller will reply here.\n\n` +
      `_Tip: never share sensitive info. Meet in public places._`
  );
}
