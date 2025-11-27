import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import SearchRouter from "../src/services/search";

import { bot } from './bot/bot';
import { ENV } from './config/env';
import { ensureUser } from './bot/middlewares/ensureUser';
import { registerCommonHandlers } from './bot/handlers/common';
import { registerViewProducts } from './bot/handlers/user/viewProducts';
import { registerMyOrders } from './bot/handlers/user/myOrders';
import { registerAdminOrders } from './bot/handlers/admin/orders';
import { registerAdminProducts } from './bot/handlers/admin/products';
import { registerProfileHandlers } from './bot/handlers/user/profile';
import { registerCheckoutFlow } from './bot/handlers/user/checkout';
import { registerCartHandlers } from './bot/handlers/user/cart';
import { registerAdminProductPhoto } from './bot/handlers/admin/product_photo';


import { resolveTenant } from './middlewares/resolveTenant';
import { telegramAuth } from './api/telegramAuth'; // must set req.user = { tgId }
import { api } from './api/routes';

import { buyerOrdersRouter } from './routes/buyer.orders';
import { cartRouter } from './routes/cart';
import {checkoutRouter} from "./routes/checkout";
import contactRouter from "./routes/contact";
import membersRouter from "./routes/members";
import { ordersRouter } from './routes/orders';
import { ownerCategoriesRouter } from './routes/owner.categories';
import { ownerOrdersRouter } from './routes/owner.orders';
import { ownerProductsRouter } from './routes/owner.products';
import { ownerShopsRouter } from './routes/owner.shop';
import productsRouter from './routes/products';
import { profileRouter } from './routes/profile';
import {publicTenantRouter} from "./routes/publicTenant";
import shopRouter from "./routes/shop";
import shopsRouter from "./routes/shops";
import { tenantRouter } from "./routes/tenants";
import universalRouter from "./routes/universal";
import { adminRouter } from './routes/admin';
import { reportsRouter } from './routes/reports';
import categoryRequestsRouter from './routes/category-requests';
import { userOrdersRouter } from './routes/user.orders';
import { teamRouter } from './routes/team';
import { cleanupRouter } from './routes/cleanup';

export function createApp() {
  const app = express();

  // If behind ngrok / reverse proxy, trust X-Forwarded-For so req.ip is correct
  app.set('trust proxy', 1);

  // Security headers
  //app.use(helmet());

  // Strict CORS (only your WebApp origin)
  app.use(cors({
    origin: [
      ENV.WEBAPP_URL,
      'https://semiconductor-work-capitol-bite.trycloudflare.com',
      'https://web.telegram.org',
      'https://oauth.telegram.org',
      /\.t\.me$/,
      /\.telegram\.org$/,
      /\.trycloudflare\.com$/, // Allow all Cloudflare tunnel subdomains
      'http://localhost:3000', // For local development
      'http://localhost:5173' // Vite dev server
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body limits (prevent abuse)
  app.use(express.json({ limit: '10mb' })); // Increased limit for potential image uploads
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));


  


  // Rate limit API (uses userId if available, else IPv6-safe IP key)
  // Cloudflare Tunnel has no rate limits, so we can be generous here
  const apiLimiter = rateLimit({
    windowMs: 60_000, // 1 minute
    max: 1000, // Much higher limit for Cloudflare Tunnel (was 100)
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Use Telegram userId when present; otherwise IPv6-safe IP key
    keyGenerator: (req: any) => (req.user?.tgId ?? req.userId ?? ipKeyGenerator(req.ip)),
    message: {
      error: 'Too many requests, please try again later.'
    }
  });

 



    // Mount API with limiter
    app.use('/api', apiLimiter);
    // --- Tenant-aware API (auth required) ---
    // Order matters: limiter above applies to this route because it shares the '/api' prefix.
    app.use('/api/t/:slug', resolveTenant, telegramAuth, ordersRouter);
  // “Public” API that still requires Telegram auth (the router itself calls telegramAuth)
    
  // Global search (universal + owner)
app.use('/api', SearchRouter);

// Tenant-scoped search (if you use /api/s/:slug/search ...)
app.use('/api/s/:slug', resolveTenant, SearchRouter);


  app.use('/api', api);

  // Image proxy should be mounted directly at /api/products/* (your webapp links to this)
  app.use('/api/products', productsRouter);

  // Mount helpers we’re missing:
  app.use('/api/contact-intent', contactRouter);
  
  // Mount team router BEFORE shop router so /api/shop/:slug/team/* routes work
  app.use('/api', teamRouter);
  app.use('/api/shop', shopRouter);
  app.use('/api', shopsRouter);     // new: shops list + create tenant
  app.use('/api', membersRouter);   // new: invites + members mgmt
  app.use("/public", publicTenantRouter);
  app.use('/api', tenantRouter);
  app.use('/api', profileRouter);
  app.use('/api', ownerCategoriesRouter);
  app.use('/api', ownerShopsRouter);
  app.use('/api', ownerProductsRouter);
  app.use('/api', ownerOrdersRouter);
  app.use('/api', checkoutRouter);
  app.use('/api', cartRouter);
  app.use('/api', buyerOrdersRouter);
  app.use('/api', universalRouter);
  app.use('/api', userOrdersRouter); // All user orders (buyer + owner)
  app.use('/api', adminRouter); // Platform admin routes
  app.use('/api', reportsRouter); // Public reports
  app.use('/api/category-requests', categoryRequestsRouter); // Category requests
  app.use('/api', cleanupRouter); // Cleanup service for expired shops
  // ----- Telegram Bot -----
  bot.use(ensureUser());
  registerCommonHandlers(bot);
  registerProfileHandlers(bot);
  registerViewProducts(bot);
  registerCartHandlers(bot);
  registerCheckoutFlow(bot, ENV.ADMIN_IDS);
  registerMyOrders(bot);
  registerAdminOrders(bot);
  registerAdminProducts(bot);
  registerAdminProductPhoto(bot as any);

  const WEBHOOK_PATH = '/tg/webhook';
  app.use(bot.webhookCallback(WEBHOOK_PATH));

  // Health endpoint with more details
  app.get('/', (_req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: ENV.NODE_ENV,
      webappUrl: ENV.WEBAPP_URL
    });
  });

  // Error handling middleware
  app.use((err: any, req: Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      ...(ENV.NODE_ENV === 'development' && { details: err.message })
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  return {
    app,
    start: async () => {
      app.listen(ENV.PORT, async () => {
        console.log(`Server running on port ${ENV.PORT}`);
        console.log(`Environment: ${ENV.NODE_ENV}`);
        console.log(`WebApp URL: ${ENV.WEBAPP_URL}`);
        
        try {
          await bot.telegram.setWebhook(`${ENV.BASE_URL}${WEBHOOK_PATH}`);
          console.log('Webhook set to', `${ENV.BASE_URL}${WEBHOOK_PATH}`);
          
          const botInfo = await bot.telegram.getMe();
          console.log(`Bot @${botInfo.username} is ready`);
        } catch (e) {
          console.error('Webhook error:', e);
        }
      });
    }
  };
}