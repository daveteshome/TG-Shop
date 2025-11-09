import { Markup } from "telegraf";
import { ENV } from "../../config/env";
import { UsersService } from "../../services/users.service";


  // Optional: only ensure menu button if not already the right one.
  async function ensureMenuButton(ctx: any) {
    if (ctx.chat?.type !== "private") return;
    if (!ENV.WEBAPP_URL || !/^https:\/\//i.test(ENV.WEBAPP_URL)) return;

    try {
      const current = await ctx.telegram.getChatMenuButton({ chat_id: ctx.chat.id }).catch(() => null);
      const isSame =
        current &&
        current.type === "web_app" &&
        current.text === "🛍️ Open Shop" &&
        current.web_app?.url === ENV.WEBAPP_URL;

      if (!isSame) {
        await ctx.telegram.setChatMenuButton({
          chat_id: ctx.chat.id,
          menu_button: {
            type: "web_app",
            text: "🛍️ Open Shop",
            web_app: { url: ENV.WEBAPP_URL },
          },
        });
      }
    } catch {
      // swallow; never remove/override if API fails
    }
  }

export const registerCommonHandlers = (bot: any) => {
  // Keep the menu button (optional)


  bot.start(async (ctx: any) => {
    await ensureMenuButton(ctx);
    const payload: string =
      (ctx as any).startPayload ??
      ((ctx.message as any)?.text?.split(" ").slice(1).join(" ") || "");

    // Ensure user exists
    const tgId = String(ctx.from.id);
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ");
    await UsersService.ensure(tgId, name);

    // If it’s a join link, show a WebApp button that includes the payload in URL
    if (payload?.startsWith("join_")) {
      const url = `${ENV.WEBAPP_URL}?tgWebAppStartParam=${encodeURIComponent(payload)}`;
      await ctx.reply(
        "Tap to open the shop:",
        Markup.inlineKeyboard([Markup.button.webApp("🛍️ Open Mini App", url)])
      );
      return;
    }

    // Default: plain WebApp button (no payload)
    await ctx.reply(
      "Welcome! Open the mini app:",
      Markup.inlineKeyboard([Markup.button.webApp("🛍️ Open Mini App", ENV.WEBAPP_URL)])
    );
  });

  bot.action("HELP", async (ctx: any) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      "Use “View Products” to browse by category. “My Orders” shows past orders."
    );
  });
};
