import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { XMLParser } from "fast-xml-parser";

function parseDateVN(dateStr?: string) {
  if (!dateStr) return null;

  if (dateStr.length === 8) {
    return new Date(
      `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
    );
  }

  return new Date(dateStr);
}

export async function POST(req: Request) {
  try {
    const text = await req.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
    });

    const json = parser.parse(text);

    const khoaHoc = json?.BAO_CAO1?.DATA?.KHOA_HOC;
    const nguoiLX = json?.BAO_CAO1?.DATA?.NGUOI_LX;

    if (!khoaHoc) {
      return NextResponse.json(
        { error: "Không tìm thấy KHOA_HOC" },
        { status: 400 }
      );
    }

    const list = Array.isArray(nguoiLX) ? nguoiLX : [nguoiLX];

    // ✅ upsert course
    const course = await prisma.course.upsert({
      where: { maKhoaHoc: khoaHoc.MA_KHOA_HOC },
      update: {
        tenKhoaHoc: khoaHoc.TEN_KHOA_HOC,
        hangDaoTao: khoaHoc.HANG_DAO_TAO,
      },
      create: {
        maKhoaHoc: khoaHoc.MA_KHOA_HOC,
        tenKhoaHoc: khoaHoc.TEN_KHOA_HOC,
        hangDaoTao: khoaHoc.HANG_DAO_TAO,
        ngayKhaiGiang: parseDateVN(khoaHoc.NGAY_KHAI_GIANG),
        ngayBeGiang: parseDateVN(khoaHoc.NGAY_BE_GIANG),
      },
    });

    let created = 0;
    let updated = 0;

    for (const item of list) {
      if (!item?.MA_DK) continue;

      const data = {
        courseId: course.id,

        maDk: item.MA_DK,
        hoVaTen: item.HO_VA_TEN,
        ngaySinh: parseDateVN(item.NGAY_SINH),
        soCmt: item.SO_CMT,
        gioiTinh: item.GIOI_TINH,

        soHoSo: item?.HO_SO?.SO_HO_SO,
        ngayNhanHoSo: parseDateVN(item?.HO_SO?.NGAY_NHAN_HO_SO),

        hangGplx: khoaHoc.HANG_GPLX,
        hangDaoTao: khoaHoc.HANG_DAO_TAO,
      };

      const existed = await prisma.student.findUnique({
        where: { maDk: item.MA_DK },
      });

      if (existed) {
        // ✅ UPDATE nếu trùng MA_DK
        await prisma.student.update({
          where: { maDk: item.MA_DK },
          data,
        });
        updated++;
      } else {
        // ✅ CREATE nếu chưa có
        await prisma.student.create({
          data,
        });
        created++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Import thành công",
      total: list.length,
      created,
      updated,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      { error: error.message || "Import lỗi" },
      { status: 500 }
    );
  }
}