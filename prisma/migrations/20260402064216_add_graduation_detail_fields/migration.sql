/*
  Warnings:

  - You are about to drop the column `ghiChu` on the `GraduationResult` table. All the data in the column will be lost.
  - You are about to drop the column `ngayDat` on the `GraduationResult` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "GraduationResult" DROP CONSTRAINT "GraduationResult_studentId_fkey";

-- AlterTable
ALTER TABLE "GraduationResult" DROP COLUMN "ghiChu",
DROP COLUMN "ngayDat",
ADD COLUMN     "duong" TEXT,
ADD COLUMN     "hinh" TEXT,
ADD COLUMN     "lyThuyet" TEXT,
ADD COLUMN     "moPhong" TEXT;

-- AddForeignKey
ALTER TABLE "GraduationResult" ADD CONSTRAINT "GraduationResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
