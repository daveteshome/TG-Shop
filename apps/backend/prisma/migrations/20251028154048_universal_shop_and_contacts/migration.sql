/*
  Warnings:

  - You are about to drop the column `botToken` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `botUsername` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `postChatId` on the `Tenant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishToUniversal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Tenant" DROP COLUMN "botToken",
DROP COLUMN "botUsername",
DROP COLUMN "postChatId",
ADD COLUMN     "publicPhone" TEXT,
ADD COLUMN     "publishUniversal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."ContactIntent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerTgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlockList" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "buyerTgId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactIntent_tenantId_idx" ON "public"."ContactIntent"("tenantId");

-- CreateIndex
CREATE INDEX "ContactIntent_productId_idx" ON "public"."ContactIntent"("productId");

-- CreateIndex
CREATE INDEX "ContactIntent_buyerTgId_idx" ON "public"."ContactIntent"("buyerTgId");

-- CreateIndex
CREATE INDEX "BlockList_tenantId_idx" ON "public"."BlockList"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockList_tenantId_buyerTgId_key" ON "public"."BlockList"("tenantId", "buyerTgId");

-- AddForeignKey
ALTER TABLE "public"."ContactIntent" ADD CONSTRAINT "ContactIntent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContactIntent" ADD CONSTRAINT "ContactIntent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlockList" ADD CONSTRAINT "BlockList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
