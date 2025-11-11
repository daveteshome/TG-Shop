// apps/backend/src/bot/handlers/user/cart.ts
import { Markup } from 'telegraf';
import { CartService } from '../../../services/cart.service';
import { OrdersService } from '../../../services/orders.service';
import { money } from '../../../lib/money';
import { getTenantId } from '../../../services/tenant.util';
import { ENV } from '../../../config/env';

const PLACEHOLDER = 'https://placehold.co/800x500/png?text=Product';

// Convert Prisma Decimal | number | string to number safely
const toNum = (v: any): number =>
  typeof v === 'number' ? v : v?.toNumber?.() ?? Number(v ?? 0);

// helper: choose Telegram photo input
function photoInput(url?: string | null) {
  const valid = url && /^https?:\/\//i.test(url) ? url : PLACEHOLDER;
  return { url: valid };
}

/**
 * Register Telegram bot cart handlers (same action names as before):
 * - CART_ADD_{productId}
 * - CART_VIEW
 * - CART_INC_{itemId}
 * - CART_DEC_{itemId}
 * - CART_CLEAR
 */
export const registerCartHandlers = (bot: any) => {
  // Add to cart (product card button)
  bot.action(/CART_ADD_(.+)/, async (ctx: any) => {
    const productId = ctx.match[1];
    const userId = String(ctx.from.id);

    // Logs (will fall back to default tenant on backend service)
    console.log('[BOT add] userId=', userId, 'tenantId=', await getTenantId());

    await ctx.answerCbQuery('Added to cart');
    await CartService.add(userId, productId, 1);
  });

  // View cart
  bot.action('CART_VIEW', async (ctx: any) => {
    await ctx.answerCbQuery();
    const userId = String(ctx.from.id);

    console.log('[BOT view] userId=', userId, 'tenantId=', await getTenantId());

    const cart = await CartService.list(userId);

    if (!cart || !cart.items?.length) {
      return ctx.reply('🧺 Your cart is empty.');
    }

    // cart.items now follow:
    // { itemId, productId, title, unitPrice(Decimal|number), currency, qty }
    const currency = cart.items[0]?.currency || 'ETB';
    const total = cart.items.reduce((s, it) => s + toNum(it.unitPrice) * it.qty, 0);

    for (const it of cart.items) {
      const unit = toNum(it.unitPrice);
      const line = `${it.title} x${it.qty} — ${money(unit * it.qty, it.currency)}`;

      const kb = Markup.inlineKeyboard([
        [
          Markup.button.callback('➖', `CART_DEC_${it.itemId}`),
          Markup.button.callback('➕', `CART_INC_${it.itemId}`),
        ],
      ]);

      // old imageUrl removed; construct from productId against backend /api/products route
      const imgUrl = `${ENV.BASE_URL}/api/products/${it.productId}/image`;
      const input = photoInput(imgUrl);

      try {
        await ctx.replyWithPhoto(input as any, { caption: line, reply_markup: kb.reply_markup });
      } catch {
        await ctx.reply(line, kb);
      }
    }

    const footer = Markup.inlineKeyboard([
      [Markup.button.callback('🧹 Clear', 'CART_CLEAR'), Markup.button.callback('✅ Checkout', 'CHECKOUT')],
    ]);

    await ctx.reply(`Total: ${money(total, currency)}`, footer);
  });

  bot.action(/CART_INC_(.+)/, async (ctx: any) => {
    const itemId = ctx.match[1];
    const userId = String(ctx.from.id);
    console.log('[BOT inc] userId=', userId, 'tenantId=', await getTenantId(), 'itemId=', itemId);

    await ctx.answerCbQuery('Increased');
    await CartService.inc(itemId);
    await ctx.reply('Updated. Tap “🧺 View Cart” again to refresh.');
  });

  bot.action(/CART_DEC_(.+)/, async (ctx: any) => {
    const itemId = ctx.match[1];
    const userId = String(ctx.from.id);
    console.log('[BOT dec] userId=', userId, 'tenantId=', await getTenantId(), 'itemId=', itemId);

    await ctx.answerCbQuery('Decreased');
    await CartService.dec(itemId);
    await ctx.reply('Updated. Tap “🧺 View Cart” again to refresh.');
  });

  bot.action('CART_CLEAR', async (ctx: any) => {
    const userId = String(ctx.from.id);
    console.log('[BOT clear] userId=', userId, 'tenantId=', await getTenantId());

    await ctx.answerCbQuery('Cleared');
    await CartService.clear(userId);
    await ctx.reply('🧺 Cart cleared.');
  });
};
