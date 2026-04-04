import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";

const prisma = new PrismaClient();

function parseDateVN(dateStr?: string) {
  if (!dateStr) return null;

  if (dateStr.length === 8) {
    return new Date(
      `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
    );
  }

  return new Date(dateStr);
}

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
    });

    const json = parser.parse(text);

    const khoaHoc = json.BAO_CAO1.DATA.KHOA_HOC;
    const nguoiLX = json.BAO_CAO1.DATA.NGUOI_LX;

    const students = Array.isArray(nguoiLX) ? nguoiLX : [nguoiLX];

    // ✅ upsert course
    const course = await prisma.course.upsert({
      where: { maKhoaHoc: khoaHoc.MA_KHOA_HOC },
      update: {},
      create: {
        maKhoaHoc: khoaHoc.MA_KHOA_HOC,
        tenKhoaHoc: khoaHoc.TEN_KHOA_HOC,
        hangDaoTao: khoaHoc.HANG_DAO_TAO,
        ngayKhaiGiang: parseDateVN(khoaHoc.NGAY_KHAI_GIANG),
        ngayBeGiang: parseDateVN(khoaHoc.NGAY_BE_GIANG),
      },
    });

    for (const item of students) {
      await prisma.student.upsert({
        where: { maDk: item.MA_DK },
        update: {},
        create: {
          courseId: course.id,

          maDk: item.MA_DK,
          hoVaTen: item.HO_VA_TEN,
          ngaySinh: parseDateVN(item.NGAY_SINH),
          soCmt: item.SO_CMT,
          gioiTinh: item.GIOI_TINH,

          soHoSo: item.HO_SO?.SO_HO_SO,
          ngayNhanHoSo: parseDateVN(item.HO_SO?.NGAY_NHAN_HO_SO),

          hangGplx: khoaHoc.HANG_GPLX,
          hangDaoTao: khoaHoc.HANG_DAO_TAO,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}