// src/bot/handlers/common.ts
import { mainMenuKb } from '../keyboards/main';
import { UsersService } from '../../services/users.service';
import { Markup } from 'telegraf';
import { ENV } from '../../config/env';
import { handleContactStart } from './user/contact';

export const registerCommonHandlers = (bot: any) => {
  // OPTIONAL (recommended): set persistent menu button to open your mini app
  bot.use(async (ctx: any, next: any) => {
    try {
      // Only try for private chats, avoids group errors
      if (ctx.chat?.type === 'private' && ENV.WEBAPP_URL) {
        await ctx.telegram.setChatMenuButton({
          chat_id: ctx.chat.id,
          menu_button: {
            type: 'web_app',
            text: '🛍️ Open Shop',
            web_app: { url: ENV.WEBAPP_URL },
          },
        });
      }
    } catch (_) {}
    return next();
  });

  bot.start(async (ctx: any) => {
    const payload =
      (ctx as any).startPayload ??
      ((ctx.message as any)?.text?.split(' ').slice(1).join(' ') || '');

    // contact_<productId> → open contact flow
    if (payload?.startsWith('contact_') || ctx.startPayload?.startsWith?.('contact_')) {
      return handleContactStart(ctx, payload);
    }

    // join_<code> → accept invite, then show webapp button
    if (payload?.startsWith('join_')) {
      const code = payload.substring('join_'.length);
      await ctx.telegram.callApi('sendChatAction', { chat_id: ctx.chat!.id, action: 'typing' });
      await ctx.appAxios.post('/invites/accept', { code, userId: String(ctx.from!.id) });
      await ctx.reply(
        '✅ You joined the shop! Open the mini app to start.',
        Markup.inlineKeyboard([Markup.button.webApp('🛍️ Open Mini App', ENV.WEBAPP_URL)])
      );
      return;
    }

    // Ensure user exists in DB
    const tgId = String(ctx.from.id);
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');
    await UsersService.ensure(tgId, name);

    // Old menu (keep)
    await ctx.reply('Welcome to the shop! Choose an option:', mainMenuKb);

    // Add explicit inline WebApp button (this is what actually opens your mini app)
    await ctx.reply(
      'Or open the WebApp storefront:',
      Markup.inlineKeyboard([Markup.button.webApp('🛍️ Open Mini App', ENV.WEBAPP_URL)])
    );
  });

  bot.action('HELP', async (ctx: any) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      'Use “View Products” to browse by category. “My Orders” shows your past orders.\n' +
        'Buying now creates a pending order (no payment yet).'
    );
  });
};
