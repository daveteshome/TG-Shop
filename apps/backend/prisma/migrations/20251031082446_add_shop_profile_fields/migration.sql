-- CreateEnum
CREATE TYPE "public"."ShopStatus" AS ENUM ('open', 'closed', 'paused');

-- CreateEnum
CREATE TYPE "public"."DeliveryMode" AS ENUM ('delivery', 'pickup', 'both');

-- AlterTable
ALTER TABLE "public"."Tenant" ADD COLUMN     "aboutText" TEXT,
ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "businessHours" JSONB,
ADD COLUMN     "defaultCurrency" "public"."Currency",
ADD COLUMN     "deliveryMode" "public"."DeliveryMode" NOT NULL DEFAULT 'both',
ADD COLUMN     "deliveryRules" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "minOrderAmount" DECIMAL(10,2),
ADD COLUMN     "publicTelegramLink" TEXT,
ADD COLUMN     "status" "public"."ShopStatus" NOT NULL DEFAULT 'open';

-- CreateTable
CREATE TABLE "public"."PinnedProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinnedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PinnedProduct_tenantId_position_idx" ON "public"."PinnedProduct"("tenantId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PinnedProduct_tenantId_productId_key" ON "public"."PinnedProduct"("tenantId", "productId");

-- AddForeignKey
ALTER TABLE "public"."PinnedProduct" ADD CONSTRAINT "PinnedProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PinnedProduct" ADD CONSTRAINT "PinnedProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
