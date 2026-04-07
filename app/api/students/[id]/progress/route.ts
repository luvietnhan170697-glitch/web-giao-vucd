import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        course: true,
        medicalChecks: {
          orderBy: { createdAt: "desc" },
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
      },
    });

    if (!student) {
      return NextResponse.json(
        { ok: false, message: "Không tìm thấy học viên" },
        { status: 404 }
      );
    }

    const medical = student.medicalChecks?.[0] ?? null;
    const graduation = student.graduationResults?.[0] ?? null;
    const exam = student.practicalResults?.[0] ?? null;

    const graduationDone = !!graduation;
    const examDone = !!exam;
    const medicalDone = !!medical;

    return NextResponse.json({
      ok: true,
      progress: {
        student: {
          id: student.id,
          maDk: student.maDk,
          hoTen: student.hoTen,
          soCccd: student.soCccd,
          soDienThoai: student.soDienThoai,
          ghiChu: student.ghiChu,
        },
        course: student.course
          ? {
              id: student.course.id,
              maKhoaHoc: student.course.maKhoaHoc,
              tenKhoaHoc: student.course.tenKhoaHoc,
              ngayKhaiGiang: formatDate(student.course.ngayKhaiGiang),
              ngayBeGiang: formatDate(student.course.ngayBeGiang),
              ngaySatHach: formatDate(student.course.ngaySatHach),
            }
          : null,
        medical: medical
          ? {
              ngayKhamSucKhoe: formatDate(medical.ngayKhamSucKhoe),
              ngayHetHan: formatDate(medical.ngayHetHan),
              ketQua: medical.ketQua ?? null,
              ghiChu: medical.ghiChu ?? null,
            }
          : null,
        graduation: graduation
          ? {
              ngayThi: formatDate(graduation.ngayThi),
              lyThuyet: graduation.lyThuyet ?? null,
              moPhong: graduation.moPhong ?? null,
              saHinh: graduation.saHinh ?? null,
              duongTruong: graduation.duongTruong ?? null,
              ketQua: graduation.ketQua ?? null,
              ghiChu: graduation.ghiChu ?? null,
            }
          : null,
        exam: exam
          ? {
              ngayThi: formatDate(exam.ngayThi),
              ketQua: exam.ketQua ?? null,
              ghiChu: exam.ghiChu ?? null,
            }
          : null,
        summary: {
          medicalDone,
          graduationDone,
          examDone,
          completedLevel:
            medicalDone && graduationDone && examDone
              ? "Hoàn tất"
              : medicalDone || graduationDone || examDone
              ? "Đang học"
              : "Mới nhập",
        },
      },
    });
  } catch (error) {
    console.error("GET /api/students/[id]/progress error:", error);
    return NextResponse.json(
      { ok: false, message: "Lấy tiến độ học viên thất bại" },
      { status: 500 }
    );
  }
}