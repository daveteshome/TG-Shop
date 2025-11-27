# TG-Shop - Telegram Multi-Tenant E-Commerce Platform

## 📖 Project Overview

**TG-Shop** is a comprehensive Telegram-based multi-tenant e-commerce platform that empowers anyone to create and manage their own online shop directly inside Telegram. The platform seamlessly integrates individual vendor shops with a universal marketplace, creating a unified shopping experience similar to Etsy or Amazon Marketplace, but entirely within the Telegram ecosystem.

### Key Features

#### 🌐 Universal Marketplace
The Universal Shop serves as a public marketplace aggregating products from all participating vendors:
- **Unified Browsing**: Browse and search across multiple shops in one interface
- **Smart Product Distribution**: Daily-shuffled product listings ensure fair visibility for all vendors
- **Advanced Filtering**: Filter by shop, category, price range, and search terms
- **Shared Product Views**: Consistent product detail pages with vendor information
- **Smart Sections**: Personalized recommendations based on browsing history and trending products

#### 🏪 Individual Shop Management
Each shop operates as an independent e-commerce environment with full tenant isolation:
- **Product Management**: Add, edit, and manage products with titles, descriptions, prices, stock levels, and images (stored in Cloudflare R2)
- **Real-Time Inventory**: Automatic stock tracking - inventory decreases with each sale
- **Team Collaboration**: Assign roles (OWNER, COLLABORATOR, HELPER, MEMBER) with granular permissions
- **Sales Analytics**: Detailed insights including revenue trends, top-selling products, and stock turnover
- **Shop Customization**: Custom shop names, slugs, contact information, and branding

#### 📊 Inventory Management System
Doubles as a complete inventory management tool for physical stores:
- **Stock Tracking**: Log incoming stock, record daily sales, and monitor inventory levels
- **Inventory History**: Complete audit trail of all stock movements (IN, OUT, ADJUST)
- **Profit Monitoring**: Track total profit and revenue across all sales channels
- **Multi-Channel Integration**: Bridge physical store activity with online sales data

#### 🛒 Complete E-Commerce Experience
Full-featured shopping experience inside Telegram Mini-App:
- **Product Browsing**: Category-based navigation with infinite scroll
- **Shopping Cart**: Add, update, and remove items with real-time total calculation
- **Checkout Flow**: Streamlined checkout with address collection and order confirmation
- **Order Management**: Track order status, view order history, and manage deliveries
- **Payment Integration**: Support for multiple payment providers (Stripe, TeleBirr, WeBirr, Manual)

## 🏗️ Technology Stack

**Backend:**
- Node.js + Express.js + TypeScript
- Prisma ORM + PostgreSQL
- Telegraf (Telegram Bot Framework)
- Cloudflare R2 (Image Storage)
- AWS SDK (S3-compatible R2 client)

**Frontend:**
- React 18 + TypeScript
- Vite (Build Tool)
- Telegram Mini-App SDK
- Axios + React Router

**Infrastructure:**
- Cloudflare Tunnel (Reverse Proxy)
- PostgreSQL Database
- Cloudflare R2 Storage
- Cloudflare Workers (Image CDN)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Telegram Bot Token (from @BotFather)
- Cloudflare R2 account
- Cloudflare Tunnel (cloudflared CLI)

### Quick Start

1. **Install dependencies**
```bash
pnpm install
```

2. **Configure environment** (see `.env.example` files)

3. **Setup database**
```bash
cd apps/backend
pnpm db:push
pnpm db:seed
```

4. **Start development**
```bash
# Terminal 1: Applications
pnpm dev

# Terminal 2: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:8080

# Terminal 3: Reverse Proxy
node proxy.js

# Terminal 4: Update webhook
update-webhook-quick.bat
```

### Development Tools

```bash
pnpm db:studio              # Database GUI
pnpm seed:marketplace-r2    # Seed marketplace with R2 images
pnpm reseed:shop            # Reseed specific shop
pnpm cleanup:products       # Clean up products
```

## 📁 Project Structure

```
tg-shop/
├── apps/
│   ├── backend/                    # Express.js API + Telegram Bot
│   │   ├── src/
│   │   │   ├── api/                # API routes & Telegram auth
│   │   │   ├── bot/                # Telegram bot handlers & middlewares
│   │   │   ├── config/             # Environment configuration
│   │   │   ├── lib/                # Core utilities (DB, R2, permissions)
│   │   │   ├── middlewares/        # Express middlewares (tenant resolution)
│   │   │   ├── routes/             # REST API endpoints
│   │   │   ├── services/           # Business logic layer
│   │   │   ├── scripts/            # Database seeding & maintenance
│   │   │   ├── app.ts              # Express app configuration
│   │   │   └── index.ts            # Server entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema
│   │   │   └── seed.ts             # Initial data seeding
│   │   ├── .env                    # Environment variables
│   │   └── package.json
│   │
│   ├── webapp/                     # React Telegram Mini-App
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── common/         # Reusable UI (Button, Card, Input, Drawer)
│   │   │   │   ├── inventory/      # Inventory modals (Add, Adjust, Record)
│   │   │   │   ├── layout/         # Layout components (Header, Menu)
│   │   │   │   ├── product/        # Product display (ProductCard)
│   │   │   │   ├── shop/           # Shop-specific components
│   │   │   │   └── smart/          # Smart recommendations
│   │   │   ├── routes/             # Page components (30+ routes)
│   │   │   ├── lib/                # API client, utilities, permissions
│   │   │   ├── styles/             # Theme & component styles
│   │   │   ├── App.tsx             # Main app & routing
│   │   │   ├── main.tsx            # React entry point
│   │   │   └── index.css           # Global styles
│   │   ├── .env.local              # Frontend environment
│   │   ├── vite.config.ts          # Vite configuration
│   │   └── package.json
│   │
│   └── images-worker/              # Cloudflare Worker for image CDN
│
├── .kiro/specs/                    # Feature specifications
│   ├── co-ownership/               # Team collaboration spec
│   └── shop-deletion-recovery/     # Shop lifecycle spec
│
├── proxy.js                        # Development reverse proxy
├── start-tunnel.bat                # Cloudflare Tunnel launcher
├── update-webhook-quick.bat        # Telegram webhook updater
├── pnpm-workspace.yaml             # PNPM monorepo config
└── package.json                    # Root dependencies
```

## 🔑 Key Features

### Smart Product Distribution
- Daily seeded shuffle for variety
- Shop-based interleaving prevents clustering
- Fair visibility for all vendors

### Multi-Tenancy
- Complete data isolation per shop
- Tenant-aware middleware
- Shared categories across platform

### Role-Based Access
- OWNER > COLLABORATOR > HELPER > MEMBER
- Granular permissions
- Frontend + backend validation

### Image Management
- Cloudflare R2 storage
- CDN delivery via Workers
- SHA256 deduplication
- Auto format detection

## 📊 Database Models

- **User** - Telegram users
- **Tenant** - Individual shops
- **Membership** - User-shop roles
- **Product** - Shop products
- **ProductImage** - R2-backed images
- **Category** - Hierarchical categories
- **Order/OrderItem** - Order management
- **Cart/CartItem** - Shopping cart
- **InventoryMove** - Stock tracking
- **ProductStats** - Analytics

## 🔧 API Highlights

- **Authentication**: Telegram WebApp initData
- **Rate Limiting**: 1000 req/min per user
- **Key Endpoints**:
  - `/api/universal/products` - Marketplace
  - `/api/shop/:slug/products` - Shop catalog
  - `/api/cart/*` - Cart operations
  - `/api/checkout` - Order creation
  - `/api/reports/analytics` - Shop analytics

## 📝 License

Proprietary - All rights reserved
