import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function normalizeStatus(value: string | null | undefined) {
  return (value || "").trim() || "-";
}

function getOverallGraduationResult(result: {
  lyThuyet?: string | null;
  moPhong?: string | null;
  hinh?: string | null;
  duong?: string | null;
  ketQua?: string | null;
}) {
  if (result.ketQua && result.ketQua.trim()) return result.ketQua;

  const parts = [
    normalizeStatus(result.lyThuyet).toLowerCase(),
    normalizeStatus(result.moPhong).toLowerCase(),
    normalizeStatus(result.hinh).toLowerCase(),
    normalizeStatus(result.duong).toLowerCase(),
  ];

  const hasFail = parts.some(
    (item) =>
      item.includes("rớt") ||
      item.includes("rot") ||
      item.includes("vắng") ||
      item.includes("vang") ||
      item.includes("không đạt") ||
      item.includes("khong dat")
  );

  if (hasFail) return "Không đạt";

  const allPass =
    parts.length > 0 &&
    parts.every((item) => item.includes("đạt") || item.includes("dat"));

  if (allPass) return "Đạt";

  return "-";
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        course: true,
        medicalChecks: {
          orderBy: { ngayKham: "desc" },
          take: 1,
        },
        graduationResults: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        practicalResults: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        examComponents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Không tìm thấy học viên" },
        { status: 404 }
      );
    }

    const latestMedical = student.medicalChecks?.[0] || null;
    const latestGraduation = student.graduationResults?.[0] || null;
    const latestPractical = student.practicalResults?.[0] || null;

    const ngayKham = latestMedical?.ngayKham || student.ngayKhamSucKhoe || null;
    const ngayHetHan =
      latestMedical?.ngayHetHan ||
      student.ngayHetHan ||
      (ngayKham ? addMonths(new Date(ngayKham), 12) : null);

    let sucKhoeTrangThai = "Chưa có dữ liệu";
    if (ngayHetHan) {
      sucKhoeTrangThai =
        new Date(ngayHetHan).getTime() >= new Date().getTime()
          ? "Còn hạn"
          : "Hết hạn";
    }

    return NextResponse.json({
      id: student.id,
      maDk: student.maDk || "",
      hoVaTen: student.hoVaTen || "",
      ngaySinh: student.ngaySinh || null,
      soCmt: student.soCmt || "",
      soDienThoai: student.soDienThoai || "",
      giaoVien: student.giaoVien || "",
      ctv: student.ctv || "",
      ghiChu: student.ghiChu || "",
      course: student.course
        ? {
            id: student.course.id,
            maKhoaHoc: student.course.maKhoaHoc || "",
            tenKhoaHoc: student.course.tenKhoaHoc || "",
          }
        : null,
      sucKhoe: {
        ngayKham,
        ngayHetHan,
        trangThai: sucKhoeTrangThai,
      },
      totNghiep: latestGraduation
        ? {
            ngayThi: latestGraduation.ngayThi || null,
            lyThuyet: normalizeStatus(latestGraduation.lyThuyet),
            moPhong: normalizeStatus(latestGraduation.moPhong),
            hinh: normalizeStatus(latestGraduation.hinh),
            duong: normalizeStatus(latestGraduation.duong),
            ketQua: getOverallGraduationResult(latestGraduation),
            noiDungRot: normalizeStatus(latestGraduation.noiDungRot),
          }
        : null,
      satHach: latestPractical
        ? {
            ngayThi: latestPractical.ngayThi || null,
            ngayDat: latestPractical.ngayDat || null,
            ketQua: normalizeStatus(latestPractical.ketQua),
            noiDungRot: normalizeStatus(latestPractical.noiDungRot),
            ghiChu: normalizeStatus(latestPractical.ghiChu),
          }
        : null,
      cacNoiDungDat: student.examComponents.map((item) => ({
        id: item.id,
        tenNoiDung: item.tenNoiDung || "",
        ngayDat: item.ngayDat || null,
        baoLuuDenNgay: item.baoLuuDenNgay || null,
        conHieuLuc: item.conHieuLuc,
        ghiChu: item.ghiChu || "",
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Lỗi lấy chi tiết học viên" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        hoVaTen: body.hoVaTen ?? undefined,
        ngaySinh: body.ngaySinh ? new Date(body.ngaySinh) : null,
        soCmt: body.soCmt ?? undefined,
        soDienThoai: body.soDienThoai ?? undefined,
        giaoVien: body.giaoVien ?? undefined,
        ctv: body.ctv ?? undefined,
        ghiChu: body.ghiChu ?? undefined,
        courseId: body.courseId || null,
        ngayKhamSucKhoe: body.ngayKhamSucKhoe
          ? new Date(body.ngayKhamSucKhoe)
          : null,
        ngayHetHan: body.ngayKhamSucKhoe
          ? addMonths(new Date(body.ngayKhamSucKhoe), 12)
          : null,
      },
      include: {
        course: true,
      },
    });

    if (body.ngayKhamSucKhoe) {
      const ngayKham = new Date(body.ngayKhamSucKhoe);
      const ngayHetHan = addMonths(ngayKham, 12);

      const latestMedical = await prisma.medicalCheck.findFirst({
        where: { studentId: id },
        orderBy: { ngayKham: "desc" },
      });

      if (latestMedical) {
        await prisma.medicalCheck.update({
          where: { id: latestMedical.id },
          data: {
            ngayKham,
            ngayHetHan,
          },
        });
      } else {
        await prisma.medicalCheck.create({
          data: {
            studentId: id,
            ngayKham,
            ngayHetHan,
          },
        });
      }
    }

    return NextResponse.json({
      message: "Cập nhật học viên thành công",
      student: {
        id: updatedStudent.id,
        maDk: updatedStudent.maDk || "",
        hoVaTen: updatedStudent.hoVaTen || "",
        ngaySinh: updatedStudent.ngaySinh || null,
        soCmt: updatedStudent.soCmt || "",
        soDienThoai: updatedStudent.soDienThoai || "",
        giaoVien: updatedStudent.giaoVien || "",
        ctv: updatedStudent.ctv || "",
        ghiChu: updatedStudent.ghiChu || "",
        ngayKhamSucKhoe: updatedStudent.ngayKhamSucKhoe || null,
        courseId: updatedStudent.courseId || null,
        course: updatedStudent.course
          ? {
              id: updatedStudent.course.id,
              maKhoaHoc: updatedStudent.course.maKhoaHoc || "",
              tenKhoaHoc: updatedStudent.course.tenKhoaHoc || "",
            }
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Lỗi cập nhật học viên" },
      { status: 500 }
    );
  }
}