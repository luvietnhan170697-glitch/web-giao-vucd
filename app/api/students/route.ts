import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalize(value: string | null) {
  return (value || "").trim();
}

function toPositiveInt(value: string | null, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = normalize(searchParams.get("q"));
    const courseId = normalize(searchParams.get("courseId"));
    const page = toPositiveInt(searchParams.get("page"), 1);
    const pageSize = toPositiveInt(searchParams.get("pageSize"), 50);

    const safePageSize = Math.min(pageSize, 100);
    const skip = (page - 1) * safePageSize;

    const where: any = {};

    if (q) {
      where.OR = [
        { maDk: { contains: q, mode: "insensitive" } },
        { hoVaTen: { contains: q, mode: "insensitive" } },
        { soCmt: { contains: q, mode: "insensitive" } },
        { soDienThoai: { contains: q, mode: "insensitive" } },
        { giaoVien: { contains: q, mode: "insensitive" } },
        { ctv: { contains: q, mode: "insensitive" } },
      ];
    }

    if (courseId) {
      where.courseId = courseId;
    }

    const [students, total, courses] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          course: true,
          medicalChecks: {
            orderBy: {
              ngayKham: "desc",
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: safePageSize,
      }),
      prisma.student.count({ where }),
      prisma.course.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          maKhoaHoc: true,
          tenKhoaHoc: true,
        },
      }),
    ]);

    return NextResponse.json({
      students: students.map((s) => ({
        id: s.id,
        maDk: s.maDk || "",
        hoVaTen: s.hoVaTen || "",
        ngaySinh: s.ngaySinh,
        soCmt: s.soCmt || "",
        soDienThoai: s.soDienThoai || "",
        giaoVien: s.giaoVien || "",
        ctv: s.ctv || "",
        ghiChu: s.ghiChu || "",
        ngayKhamSucKhoe: s.medicalChecks?.[0]?.ngayKham || s.ngayKhamSucKhoe || null,
        courseId: s.courseId || "",
        course: s.course
          ? {
              id: s.course.id,
              maKhoaHoc: s.course.maKhoaHoc || "",
              tenKhoaHoc: s.course.tenKhoaHoc || "",
            }
          : null,
      })),
      courses,
      pagination: {
        page,
        pageSize: safePageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / safePageSize)),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Lỗi lấy danh sách học viên" },
      { status: 500 }
    );
  }
}