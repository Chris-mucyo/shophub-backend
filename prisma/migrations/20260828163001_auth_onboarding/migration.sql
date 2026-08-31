/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nationalIdNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tin]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `fullName` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_EMAIL_VERIFICATION', 'PENDING_PHONE_VERIFICATION', 'PENDING_PROFILE', 'PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "WholesalerStatus" AS ENUM ('NOT_APPLIED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "addressCell" TEXT,
ADD COLUMN     "addressDistrict" TEXT,
ADD COLUMN     "addressSector" TEXT,
ADD COLUMN     "addressVillage" TEXT,
ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessCategory" TEXT,
ADD COLUMN     "businessDocUrl" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessRegNo" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nationalIdImage" TEXT,
ADD COLUMN     "nationalIdNumber" TEXT,
ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "proofOfAddress" TEXT,
ADD COLUMN     "selfieImage" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION',
ADD COLUMN     "tin" TEXT,
ADD COLUMN     "wholesalerStatus" "WholesalerStatus" NOT NULL DEFAULT 'NOT_APPLIED',
ALTER COLUMN "fullName" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_nationalIdNumber_key" ON "User"("nationalIdNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_tin_key" ON "User"("tin");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
