-- CreateEnum
CREATE TYPE "public"."ProductCondition" AS ENUM ('new', 'used', 'refurbished');

-- AlterTable
ALTER TABLE "public"."InventoryMove" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "variantId" TEXT;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "compareAtPrice" DECIMAL(10,2),
ADD COLUMN     "condition" "public"."ProductCondition",
ADD COLUMN     "costPrice" DECIMAL(10,2),
ADD COLUMN     "dimensions" JSONB,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxOrderQuantity" INTEGER,
ADD COLUMN     "minOrderQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "saleFrom" TIMESTAMP(3),
ADD COLUMN     "saleUntil" TIMESTAMP(3),
ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "visibleFrom" TIMESTAMP(3),
ADD COLUMN     "visibleUntil" TIMESTAMP(3),
ADD COLUMN     "weightGrams" INTEGER;

-- CreateTable
CREATE TABLE "public"."ProductTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductTagLink" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ProductTagLink_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "public"."ProductSpec" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductStats" (
    "productId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "viewsTotal" INTEGER NOT NULL DEFAULT 0,
    "favoritesTotal" INTEGER NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "unitsSold" INTEGER NOT NULL DEFAULT 0,
    "revenueTotal" DECIMAL(12,2) NOT NULL,
    "lastOrderAt" TIMESTAMP(3),

    CONSTRAINT "ProductStats_pkey" PRIMARY KEY ("productId")
);

-- CreateIndex
CREATE INDEX "ProductTag_tenantId_idx" ON "public"."ProductTag"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTag_tenantId_name_key" ON "public"."ProductTag"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ProductTagLink_tagId_idx" ON "public"."ProductTagLink"("tagId");

-- CreateIndex
CREATE INDEX "ProductSpec_productId_position_idx" ON "public"."ProductSpec"("productId", "position");

-- CreateIndex
CREATE INDEX "ProductStats_tenantId_idx" ON "public"."ProductStats"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryMove_variantId_idx" ON "public"."InventoryMove"("variantId");

-- CreateIndex
CREATE INDEX "InventoryMove_orderId_idx" ON "public"."InventoryMove"("orderId");

-- CreateIndex
CREATE INDEX "Product_brand_idx" ON "public"."Product"("brand");

-- CreateIndex
CREATE INDEX "Product_condition_idx" ON "public"."Product"("condition");

-- CreateIndex
CREATE INDEX "Product_tenantId_isPublished_isArchived_idx" ON "public"."Product"("tenantId", "isPublished", "isArchived");

-- AddForeignKey
ALTER TABLE "public"."InventoryMove" ADD CONSTRAINT "InventoryMove_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryMove" ADD CONSTRAINT "InventoryMove_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductTag" ADD CONSTRAINT "ProductTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductTagLink" ADD CONSTRAINT "ProductTagLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductTagLink" ADD CONSTRAINT "ProductTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."ProductTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductSpec" ADD CONSTRAINT "ProductSpec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductStats" ADD CONSTRAINT "ProductStats_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductStats" ADD CONSTRAINT "ProductStats_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
