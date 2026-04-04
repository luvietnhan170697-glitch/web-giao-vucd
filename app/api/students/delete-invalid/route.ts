import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const where = {
      AND: [
        { courseId: null },
        { ngaySinh: null },
      ],
    };

    const count = await prisma.student.count({ where });

    const preview = await prisma.student.findMany({
      where,
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        maDk: true,
        hoVaTen: true,
        soCmt: true,
        courseId: true,
        ngaySinh: true,
      },
    });

    return NextResponse.json({
      ok: true,
      count,
      preview,
    });
  } catch (error) {
    console.error("GET /api/students/delete-invalid error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Không lấy được danh sách học viên lỗi.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const where = {
      AND: [
        { courseId: null },
        { ngaySinh: null },
      ],
    };

    const countBefore = await prisma.student.count({ where });

    if (countBefore === 0) {
      return NextResponse.json({
        ok: true,
        deletedCount: 0,
        message: "Không có học viên lỗi để xóa.",
      });
    }

    const deleted = await prisma.student.deleteMany({
      where,
    });

    return NextResponse.json({
      ok: true,
      deletedCount: deleted.count,
      message: `Đã xóa ${deleted.count} học viên lỗi.`,
    });
  } catch (error) {
    console.error("DELETE /api/students/delete-invalid error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          "Xóa thất bại. Có thể dữ liệu đang liên kết bảng khác hoặc tên field chưa khớp schema.",
      },
      { status: 500 }
    );
  }
}