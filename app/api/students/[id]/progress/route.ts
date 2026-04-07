import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalize(value: string | null | undefined) {
  return (value || "").trim() || "-";
}

function calcGraduationStatus(result: {
  lyThuyet?: string | null;
  moPhong?: string | null;
  hinh?: string | null;
  duong?: string | null;
  ketQua?: string | null;
}) {
  if (result.ketQua && result.ketQua.trim()) return result.ketQua;

  const parts = [
    normalize(result.lyThuyet).toLowerCase(),
    normalize(result.moPhong).toLowerCase(),
    normalize(result.hinh).toLowerCase(),
    normalize(result.duong).toLowerCase(),
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
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        course: true,
        medicalChecks: {
          orderBy: [{ ngayKham: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
        graduationResults: {
          orderBy: [{ ngayThi: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
        practicalResults: {
          orderBy: [{ ngayThi: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
        examComponents: {
          orderBy: [{ ngayDat: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Không tìm thấy học viên" },
        { status: 404 }
      );
    }

    const medical = student.medicalChecks?.[0] || null;
    const graduation = student.graduationResults?.[0] || null;
    const practical = student.practicalResults?.[0] || null;

    return NextResponse.json({
      id: student.id,
      maDk: student.maDk || "",
      hoVaTen: student.hoVaTen || "",
      course: student.course
        ? {
            id: student.course.id,
            maKhoaHoc: student.course.maKhoaHoc || "",
            tenKhoaHoc: student.course.tenKhoaHoc || "",
          }
        : null,
      sucKhoe: {
        ngayKham: medical?.ngayKham || student.ngayKhamSucKhoe || null,
        ngayHetHan: medical?.ngayHetHan || student.ngayHetHan || null,
      },
      totNghiep: graduation
        ? {
            ngayThi: graduation.ngayThi || null,
            lyThuyet: normalize(graduation.lyThuyet),
            moPhong: normalize(graduation.moPhong),
            hinh: normalize(graduation.hinh),
            duong: normalize(graduation.duong),
            ketQua: calcGraduationStatus(graduation),
            noiDungRot: normalize(graduation.noiDungRot),
          }
        : null,
      satHach: practical
        ? {
            ngayThi: practical.ngayThi || null,
            ngayDat: practical.ngayDat || null,
            ketQua: normalize(practical.ketQua),
            noiDungRot: normalize(practical.noiDungRot),
            ghiChu: normalize(practical.ghiChu),
          }
        : null,
      examComponents: student.examComponents.map((item) => ({
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
      { error: error?.message || "Lỗi lấy tiến độ học viên" },
      { status: 500 }
    );
  }
}