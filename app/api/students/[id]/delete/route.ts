import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-auth";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const { confirmMaDk } = await req.json();

    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        maDk: true,
        hoVaTen: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Không tìm thấy học viên" },
        { status: 404 }
      );
    }

    if (!confirmMaDk || confirmMaDk !== student.maDk) {
      return NextResponse.json(
        { error: "MA_DK xác nhận không đúng" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.medicalCheck.deleteMany({
        where: { studentId: id },
      });

      await tx.graduationResult.deleteMany({
        where: { studentId: id },
      });

      await tx.practicalExamResult.deleteMany({
        where: { studentId: id },
      });

      await tx.examComponent.deleteMany({
        where: { studentId: id },
      });

      await tx.student.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      message: "Đã xóa học viên thành công",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Lỗi xóa học viên" },
      { status: 500 }
    );
  }
}