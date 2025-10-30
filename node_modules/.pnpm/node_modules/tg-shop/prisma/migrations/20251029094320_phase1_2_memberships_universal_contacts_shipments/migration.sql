/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,cartId,productId,variantId]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `type` on the `ContactIntent` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."ShopRole" AS ENUM ('OWNER', 'HELPER', 'COLLABORATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "public"."ContactType" AS ENUM ('message', 'call');

-- CreateEnum
CREATE TYPE "public"."ReportTarget" AS ENUM ('TENANT', 'PRODUCT');

-- CreateEnum
CREATE TYPE "public"."PlatformRole" AS ENUM ('USER', 'ADMIN', 'MOD');

-- CreateEnum
CREATE TYPE "public"."ShipmentStatus" AS ENUM ('pending', 'packed', 'shipped', 'delivered', 'canceled', 'returned');

-- DropIndex
DROP INDEX "public"."ContactIntent_tenantId_idx";

-- AlterTable
ALTER TABLE "public"."ContactIntent" DROP COLUMN "type",
ADD COLUMN     "type" "public"."ContactType" NOT NULL;

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "shipCity" TEXT,
ADD COLUMN     "shipCountry" TEXT,
ADD COLUMN     "shipLine1" TEXT,
ADD COLUMN     "shipLine2" TEXT,
ADD COLUMN     "shipName" TEXT,
ADD COLUMN     "shipPhone" TEXT,
ADD COLUMN     "shipPostal" TEXT,
ADD COLUMN     "shipRegion" TEXT;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "reviewStatus" "public"."ReviewStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT;

-- AlterTable
ALTER TABLE "public"."Tenant" ADD COLUMN     "botToken" TEXT,
ADD COLUMN     "botTokenEnc" BYTEA,
ADD COLUMN     "botTokenKmsKey" TEXT,
ADD COLUMN     "botTokenNonce" BYTEA,
ADD COLUMN     "botUsername" TEXT,
ADD COLUMN     "postChatId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "platformRole" "public"."PlatformRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "public"."Shipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "public"."ShipmentStatus" NOT NULL DEFAULT 'pending',
    "carrier" TEXT,
    "trackingNo" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "meta" JSONB,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."ShopRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "public"."ShopRole" NOT NULL DEFAULT 'MEMBER',
    "createdBy" TEXT NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MiniAppSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tgChatId" TEXT,
    "initHash" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "MiniAppSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TenantSettings" (
    "tenantId" TEXT NOT NULL,
    "checkoutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "universalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allowDMFromUniversal" BOOLEAN NOT NULL DEFAULT true,
    "locale" TEXT,
    "timezone" TEXT,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "public"."ProductView" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "viewerTgId" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Report" (
    "id" TEXT NOT NULL,
    "target" "public"."ReportTarget" NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "reporterTgId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MembershipAudit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromRole" "public"."ShopRole",
    "toRole" "public"."ShopRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shipment_tenantId_idx" ON "public"."Shipment"("tenantId");

-- CreateIndex
CREATE INDEX "Shipment_orderId_status_idx" ON "public"."Shipment"("orderId", "status");

-- CreateIndex
CREATE INDEX "Membership_tenantId_role_idx" ON "public"."Membership"("tenantId", "role");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "public"."Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "public"."Membership"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopInvite_code_key" ON "public"."ShopInvite"("code");

-- CreateIndex
CREATE INDEX "ShopInvite_tenantId_idx" ON "public"."ShopInvite"("tenantId");

-- CreateIndex
CREATE INDEX "ShopInvite_expiresAt_idx" ON "public"."ShopInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "MiniAppSession_userId_openedAt_idx" ON "public"."MiniAppSession"("userId", "openedAt");

-- CreateIndex
CREATE INDEX "MiniAppSession_tenantId_idx" ON "public"."MiniAppSession"("tenantId");

-- CreateIndex
CREATE INDEX "ProductView_tenantId_createdAt_idx" ON "public"."ProductView"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductView_productId_createdAt_idx" ON "public"."ProductView"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_tenantId_createdAt_idx" ON "public"."Report"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_productId_idx" ON "public"."Report"("productId");

-- CreateIndex
CREATE INDEX "MembershipAudit_tenantId_createdAt_idx" ON "public"."MembershipAudit"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "MembershipAudit_actorId_idx" ON "public"."MembershipAudit"("actorId");

-- CreateIndex
CREATE INDEX "MembershipAudit_targetId_idx" ON "public"."MembershipAudit"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_tenantId_cartId_productId_variantId_key" ON "public"."CartItem"("tenantId", "cartId", "productId", "variantId");

-- CreateIndex
CREATE INDEX "ContactIntent_tenantId_createdAt_idx" ON "public"."ContactIntent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_tenantId_status_createdAt_idx" ON "public"."Order"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "universal_feed_idx" ON "public"."Product"("publishToUniversal", "reviewStatus", "active", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Shipment" ADD CONSTRAINT "Shipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("tgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopInvite" ADD CONSTRAINT "ShopInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiniAppSession" ADD CONSTRAINT "MiniAppSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("tgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiniAppSession" ADD CONSTRAINT "MiniAppSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductView" ADD CONSTRAINT "ProductView_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductView" ADD CONSTRAINT "ProductView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipAudit" ADD CONSTRAINT "MembershipAudit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
