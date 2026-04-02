import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";

const prisma = new PrismaClient();

function parseDate(value?: string | null): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  // yyyy-mm-dd hoặc yyyy-mm-dd hh:mm:ss
  if (v.includes("-")) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  // yyyymmdd
  if (/^\d{8}$/.test(v)) {
    const yyyy = v.slice(0, 4);
    const mm = v.slice(4, 6);
    const dd = v.slice(6, 8);
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function POST(req: Request) {
  try {
    const xmlText = await req.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false,
      trimValues: true,
    });

    const parsed = parser.parse(xmlText);

    const root = parsed?.BAO_CAO1;
    if (!root) {
      return NextResponse.json(
        { error: "Không tìm thấy BAO_CAO1 trong XML" },
        { status: 400 }
      );
    }

    const khoaHoc = root?.DATA?.KHOA_HOC;
    const nguoiLxList = toArray(root?.DATA?.NGUOI_LXS?.NGUOI_LX);

    if (!khoaHoc) {
      return NextResponse.json(
        { error: "Không tìm thấy DATA.KHOA_HOC trong XML" },
        { status: 400 }
      );
    }

    const course = await prisma.course.upsert({
      where: {
        maKhoaHoc: String(khoaHoc.MA_KHOA_HOC),
      },
      update: {
        tenKhoaHoc: khoaHoc.TEN_KHOA_HOC || null,
        maBci: khoaHoc.MA_BCI || null,
        hangDaoTao: khoaHoc.MA_HANG_DAO_TAO || khoaHoc.HANG_GPLX || null,
        ngayKhaiGiang: parseDate(khoaHoc.NGAY_KHAI_GIANG),
        ngayBeGiang: parseDate(khoaHoc.NGAY_BE_GIANG),
        ngaySatHach: parseDate(khoaHoc.NGAY_SAT_HACH),
        soHocSinh: khoaHoc.SO_HOC_SINH ? Number(khoaHoc.SO_HOC_SINH) : null,
      },
      create: {
        maKhoaHoc: String(khoaHoc.MA_KHOA_HOC),
        tenKhoaHoc: khoaHoc.TEN_KHOA_HOC || null,
        maBci: khoaHoc.MA_BCI || null,
        hangDaoTao: khoaHoc.MA_HANG_DAO_TAO || khoaHoc.HANG_GPLX || null,
        ngayKhaiGiang: parseDate(khoaHoc.NGAY_KHAI_GIANG),
        ngayBeGiang: parseDate(khoaHoc.NGAY_BE_GIANG),
        ngaySatHach: parseDate(khoaHoc.NGAY_SAT_HACH),
        soHocSinh: khoaHoc.SO_HOC_SINH ? Number(khoaHoc.SO_HOC_SINH) : null,
      },
    });

    let success = 0;
    const errors: string[] = [];

    for (const item of nguoiLxList) {
      try {
        const hoSo = item?.HO_SO || {};
        const maDk = item?.MA_DK ? String(item.MA_DK).trim() : null;

        if (!maDk) {
          errors.push(`Thiếu MA_DK ở học viên: ${item?.HO_VA_TEN || "Không rõ tên"}`);
          continue;
        }

        await prisma.student.upsert({
          where: { maDk },
          update: {
            courseId: course.id,
            hoVaTen: item?.HO_VA_TEN || "",
            soCmt: item?.SO_CMT ? String(item.SO_CMT).trim() : null,
            ngaySinh: parseDate(item?.NGAY_SINH),
            gioiTinh: item?.GIOI_TINH || null,
            soHoSo: hoSo?.SO_HO_SO ? String(hoSo.SO_HO_SO).trim() : null,
            ngayNhanHoSo: parseDate(hoSo?.NGAY_NHAN_HOSO),
            hangGplx: hoSo?.HANG_GPLX || item?.HANG_GPLX || null,
            hangDaoTao: hoSo?.HANG_DAOTAO || null,
          },
          create: {
            courseId: course.id,
            maDk,
            hoVaTen: item?.HO_VA_TEN || "",
            soCmt: item?.SO_CMT ? String(item.SO_CMT).trim() : null,
            ngaySinh: parseDate(item?.NGAY_SINH),
            gioiTinh: item?.GIOI_TINH || null,
            soHoSo: hoSo?.SO_HO_SO ? String(hoSo.SO_HO_SO).trim() : null,
            ngayNhanHoSo: parseDate(hoSo?.NGAY_NHAN_HOSO),
            hangGplx: hoSo?.HANG_GPLX || item?.HANG_GPLX || null,
            hangDaoTao: hoSo?.HANG_DAOTAO || null,
          },
        });

        success++;
      } catch (e: any) {
        errors.push(
          `Lỗi học viên ${item?.HO_VA_TEN || "Không rõ"}: ${e.message}`
        );
      }
    }

    await prisma.importLog.create({
      data: {
        loaiFile: "XML",
        tenFile: "import-xml",
        tongSoDong: nguoiLxList.length,
        thanhCong: success,
        thatBai: errors.length,
        ghiChu: errors.length ? errors.join(" | ").slice(0, 1000) : "OK",
      },
    });

    return NextResponse.json({
      message: "Import XML thành công",
      course: {
        maKhoaHoc: course.maKhoaHoc,
        tenKhoaHoc: course.tenKhoaHoc,
      },
      total: nguoiLxList.length,
      success,
      failed: errors.length,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Lỗi import XML" },
      { status: 500 }
    );
  }
}