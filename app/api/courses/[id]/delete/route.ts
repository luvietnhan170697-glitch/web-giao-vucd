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
    const { confirmCourseCode, deleteSecret } = await req.json();

    if (!deleteSecret || deleteSecret !== process.env.DELETE_COURSE_SECRET) {
      return NextResponse.json(
        { error: "Sai mật mã xóa" },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        students: {
          select: { id: true },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Không tìm thấy khóa học" },
        { status: 404 }
      );
    }

    if (!confirmCourseCode || confirmCourseCode !== course.maKhoaHoc) {
      return NextResponse.json(
        { error: "Mã khóa xác nhận không đúng" },
        { status: 400 }
      );
    }

    const studentIds = course.students.map((s) => s.id);

    await prisma.$transaction(async (tx) => {
      if (studentIds.length > 0) {
        await tx.medicalCheck.deleteMany({
          where: { studentId: { in: studentIds } },
        });

        await tx.graduationResult.deleteMany({
          where: { studentId: { in: studentIds } },
        });

        await tx.practicalExamResult.deleteMany({
          where: { studentId: { in: studentIds } },
        });

        await tx.examComponent.deleteMany({
          where: { studentId: { in: studentIds } },
        });

        await tx.student.deleteMany({
          where: { id: { in: studentIds } },
        });
      }

      await tx.course.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      message: "Đã xóa khóa học và toàn bộ học viên trong khóa",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Lỗi server khi xóa khóa" },
      { status: 500 }
    );
  }
}