import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";

const prisma = new PrismaClient();

function parseDate(value?: string | null): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  if (v.includes("-")) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{8}$/.test(v)) {
    const yyyy = v.slice(0, 4);
    const mm = v.slice(4, 6);
    const dd = v.slice(6, 8);
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [dd, mm, yyyy] = v.split("/");
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pickFirst(...values: unknown[]): string | null {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function pickNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const note = String(formData.get("note") || "");

    if (!file) {
      return NextResponse.json({ error: "Không có file XML" }, { status: 400 });
    }

    const xmlText = await file.text();

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

    const maKhoaHoc = pickFirst(khoaHoc.MA_KHOA_HOC);
    if (!maKhoaHoc) {
      return NextResponse.json(
        { error: "Thiếu MA_KHOA_HOC trong XML" },
        { status: 400 }
      );
    }

    const tenKhoaHoc = pickFirst(khoaHoc.TEN_KHOA_HOC);
    const maBci = pickFirst(khoaHoc.MA_BCI);
    const hangDaoTao =
      pickFirst(khoaHoc.MA_HANG_DAO_TAO, khoaHoc.HANG_GPLX);

    const course = await prisma.course.upsert({
      where: {
        maKhoaHoc,
      },
      update: {
        tenKhoaHoc,
        maBci,
        hangDaoTao,
        ngayKhaiGiang: parseDate(pickFirst(khoaHoc.NGAY_KHAI_GIANG)),
        ngayBeGiang: parseDate(pickFirst(khoaHoc.NGAY_BE_GIANG)),
        ngaySatHach: parseDate(pickFirst(khoaHoc.NGAY_SAT_HACH)),
        soHocSinh: pickNumber(khoaHoc.SO_HOC_SINH),
      },
      create: {
        maKhoaHoc,
        tenKhoaHoc,
        maBci,
        hangDaoTao,
        ngayKhaiGiang: parseDate(pickFirst(khoaHoc.NGAY_KHAI_GIANG)),
        ngayBeGiang: parseDate(pickFirst(khoaHoc.NGAY_BE_GIANG)),
        ngaySatHach: parseDate(pickFirst(khoaHoc.NGAY_SAT_HACH)),
        soHocSinh: pickNumber(khoaHoc.SO_HOC_SINH),
      },
    });

    let created = 0;
    let updated = 0;
    let duplicateMaDk = 0;
    const errors: string[] = [];

    for (const item of nguoiLxList) {
      try {
        const hoSo = item?.HO_SO || {};
        const maDk = pickFirst(item?.MA_DK);

        if (!maDk) {
          errors.push(
            `Thiếu MA_DK ở học viên: ${pickFirst(item?.HO_VA_TEN) || "Không rõ tên"}`
          );
          continue;
        }

        const ngayKhamSucKhoe = parseDate(
          pickFirst(
            item?.NGAY_KHAM_SUC_KHOE,
            item?.NGAY_KSK,
            hoSo?.NGAY_KHAM_SUC_KHOE,
            hoSo?.NGAY_KSK
          )
        );

        const ngayHetHanKhamSucKhoe = ngayKhamSucKhoe
          ? addMonths(ngayKhamSucKhoe, 12)
          : null;

        const studentData = {
          courseId: course.id,
          maDk,
          hoVaTen: pickFirst(item?.HO_VA_TEN) || "",
          ngaySinh: parseDate(pickFirst(item?.NGAY_SINH)),
          soCmt: pickFirst(
            item?.SO_CMT,
            item?.SO_CMND,
            item?.SO_CCCD,
            item?.CCCD
          ),
          soDienThoai: pickFirst(
            item?.SO_DIEN_THOAI,
            item?.DIEN_THOAI,
            item?.SDT,
            hoSo?.SO_DIEN_THOAI,
            hoSo?.DIEN_THOAI
          ),
          gioiTinh: pickFirst(item?.GIOI_TINH),
          soHoSo: pickFirst(hoSo?.SO_HO_SO),
          ngayNhanHoSo: parseDate(pickFirst(hoSo?.NGAY_NHAN_HOSO)),
          hangGplx: pickFirst(hoSo?.HANG_GPLX, item?.HANG_GPLX),
          hangDaoTao: pickFirst(hoSo?.HANG_DAOTAO, item?.HANG_DAO_TAO),
          giaoVien: pickFirst(
            item?.GIAO_VIEN,
            item?.TEN_GIAO_VIEN,
            hoSo?.GIAO_VIEN,
            hoSo?.TEN_GIAO_VIEN
          ),
          ctv: pickFirst(
            item?.CTV,
            item?.CONG_TAC_VIEN,
            hoSo?.CTV,
            hoSo?.CONG_TAC_VIEN
          ),
          ghiChu: pickFirst(
            item?.GHI_CHU,
            hoSo?.GHI_CHU,
            note || null
          ),
          ngayKhamSucKhoe,
          ngayHetHanKhamSucKhoe,
        };

        const existedStudent = await prisma.student.findUnique({
          where: { maDk },
        });

        if (existedStudent) {
          if (existedStudent.courseId === course.id) {
            await prisma.student.update({
              where: { maDk },
              data: studentData,
            });
            updated++;
            continue;
          }

          duplicateMaDk++;
          errors.push(
            `Trùng MA_DK ở khóa khác: ${maDk} - ${pickFirst(item?.HO_VA_TEN) || "Không rõ tên"}`
          );
          continue;
        }

        await prisma.student.create({
          data: studentData,
        });

        created++;
      } catch (e: any) {
        errors.push(
          `Lỗi học viên ${pickFirst(item?.HO_VA_TEN) || "Không rõ"}: ${e.message}`
        );
      }
    }

    await prisma.importLog.create({
      data: {
        loaiFile: "XML",
        tenFile: file.name || "import-xml",
        tongSoDong: nguoiLxList.length,
        thanhCong: created + updated,
        thatBai: errors.length,
        ghiChu: errors.length
          ? errors.join(" | ").slice(0, 1000)
          : note || "OK",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Import XML hoàn tất",
      fileName: file.name,
      note,
      course: {
        maKhoaHoc: course.maKhoaHoc,
        tenKhoaHoc: course.tenKhoaHoc,
      },
      total: nguoiLxList.length,
      created,
      updated,
      duplicateMaDk,
      failed: errors.length,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Lỗi import XML" },
      { status: 500 }
    );
  }
}