/*
  Warnings:

  - You are about to drop the column `tenantId` on the `Category` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Category" DROP CONSTRAINT "Category_tenantId_fkey";

-- DropIndex
DROP INDEX "public"."Category_tenantId_active_position_idx";

-- DropIndex
DROP INDEX "public"."Category_tenantId_slug_key";

-- AlterTable
ALTER TABLE "public"."Category" DROP COLUMN "tenantId",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "public"."CategoryName" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CategoryName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CategorySynonym" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" TEXT,
    "value" TEXT NOT NULL,

    CONSTRAINT "CategorySynonym_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryName_locale_idx" ON "public"."CategoryName"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryName_categoryId_locale_key" ON "public"."CategoryName"("categoryId", "locale");

-- CreateIndex
CREATE INDEX "CategorySynonym_categoryId_idx" ON "public"."CategorySynonym"("categoryId");

-- CreateIndex
CREATE INDEX "CategorySynonym_value_idx" ON "public"."CategorySynonym"("value");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "public"."Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_position_idx" ON "public"."Category"("parentId", "position");

-- CreateIndex
CREATE INDEX "Category_active_idx" ON "public"."Category"("active");

-- CreateIndex
CREATE INDEX "Category_level_idx" ON "public"."Category"("level");

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategoryName" ADD CONSTRAINT "CategoryName_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategorySynonym" ADD CONSTRAINT "CategorySynonym_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
