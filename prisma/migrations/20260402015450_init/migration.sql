-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "maKhoaHoc" TEXT NOT NULL,
    "tenKhoaHoc" TEXT,
    "maBci" TEXT,
    "hangDaoTao" TEXT,
    "ngayKhaiGiang" TIMESTAMP(3),
    "ngayBeGiang" TIMESTAMP(3),
    "ngaySatHach" TIMESTAMP(3),
    "soHocSinh" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "maDk" TEXT,
    "soHoSo" TEXT,
    "soCmt" TEXT,
    "hoVaTen" TEXT NOT NULL,
    "ngaySinh" TIMESTAMP(3),
    "gioiTinh" TEXT,
    "soDienThoai" TEXT,
    "ghiChu" TEXT,
    "hangGplx" TEXT,
    "hangDaoTao" TEXT,
    "ngayNhanHoSo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalCheck" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "ngayKham" TIMESTAMP(3) NOT NULL,
    "ngayHetHan" TIMESTAMP(3) NOT NULL,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraduationResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "ngayThi" TIMESTAMP(3),
    "ngayDat" TIMESTAMP(3),
    "ketQua" TEXT,
    "noiDungRot" TEXT,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GraduationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticalExamResult" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "ngayThi" TIMESTAMP(3),
    "ngayDat" TIMESTAMP(3),
    "ketQua" TEXT,
    "noiDungRot" TEXT,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticalExamResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamComponent" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tenNoiDung" TEXT NOT NULL,
    "ngayDat" TIMESTAMP(3),
    "baoLuuDenNgay" TIMESTAMP(3),
    "conHieuLuc" BOOLEAN NOT NULL DEFAULT true,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "loaiFile" TEXT NOT NULL,
    "tenFile" TEXT NOT NULL,
    "tongSoDong" INTEGER NOT NULL DEFAULT 0,
    "thanhCong" INTEGER NOT NULL DEFAULT 0,
    "thatBai" INTEGER NOT NULL DEFAULT 0,
    "ghiChu" TEXT,
    "importedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Course_maKhoaHoc_key" ON "Course"("maKhoaHoc");

-- CreateIndex
CREATE UNIQUE INDEX "Student_maDk_key" ON "Student"("maDk");

-- CreateIndex
CREATE UNIQUE INDEX "Student_soCmt_key" ON "Student"("soCmt");

-- CreateIndex
CREATE INDEX "Student_hoVaTen_idx" ON "Student"("hoVaTen");

-- CreateIndex
CREATE INDEX "Student_soHoSo_idx" ON "Student"("soHoSo");

-- CreateIndex
CREATE INDEX "Student_soDienThoai_idx" ON "Student"("soDienThoai");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalCheck" ADD CONSTRAINT "MedicalCheck_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraduationResult" ADD CONSTRAINT "GraduationResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalExamResult" ADD CONSTRAINT "PracticalExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamComponent" ADD CONSTRAINT "ExamComponent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
