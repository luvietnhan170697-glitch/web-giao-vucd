import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { XMLParser } from "fast-xml-parser";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  if (/^\d{8}$/.test(v)) {
    const yyyy = v.slice(0, 4);
    const mm = v.slice(4, 6);
    const dd = v.slice(6, 8);
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = String(body?.url || "");
    const note = String(body?.note || "");
    const originalName = String(body?.originalName || "");

    if (!url) {
      return NextResponse.json(
        { error: "Thiếu URL Blob." },
        { status: 400 }
      );
    }

    const fileRes = await fetch(url, {
      cache: "no-store",
    });

    if (!fileRes.ok) {
      return NextResponse.json(
        { error: "Không đọc được file XML từ Blob." },
        { status: 400 }
      );
    }

    const xmlText = await fileRes.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false,
      trimValues: true,
    });

    const parsed = parser.parse(xmlText);
    const root = parsed?.BAO_CAO1;

    if (!root) {
      return NextResponse.json(
        { error: "Không tìm thấy BAO_CAO1 trong XML." },
        { status: 400 }
      );
    }

    const khoaHoc = root?.DATA?.KHOA_HOC;
    const nguoiLxList = toArray(root?.DATA?.NGUOI_LXS?.NGUOI_LX);

    if (!khoaHoc) {
      return NextResponse.json(
        { error: "Không tìm thấy KHOA_HOC trong XML." },
        { status: 400 }
      );
    }

    const maKhoaHoc = String(khoaHoc?.MA_KHOA_HOC || "").trim();

    if (!maKhoaHoc) {
      return NextResponse.json(
        { error: "Thiếu MA_KHOA_HOC trong XML." },
        { status: 400 }
      );
    }

    const course = await prisma.course.upsert({
      where: { maKhoaHoc },
      update: {
        tenKhoaHoc: khoaHoc?.TEN_KHOA_HOC || null,
        maBci: khoaHoc?.MA_BCI || null,
        hangDaoTao: khoaHoc?.MA_HANG_DAO_TAO || khoaHoc?.HANG_GPLX || null,
        ngayKhaiGiang: parseDate(khoaHoc?.NGAY_KHAI_GIANG),
        ngayBeGiang: parseDate(khoaHoc?.NGAY_BE_GIANG),
        ngaySatHach: parseDate(khoaHoc?.NGAY_SAT_HACH),
        soHocSinh: khoaHoc?.SO_HOC_SINH ? Number(khoaHoc.SO_HOC_SINH) : null,
      },
      create: {
        maKhoaHoc,
        tenKhoaHoc: khoaHoc?.TEN_KHOA_HOC || null,
        maBci: khoaHoc?.MA_BCI || null,
        hangDaoTao: khoaHoc?.MA_HANG_DAO_TAO || khoaHoc?.HANG_GPLX || null,
        ngayKhaiGiang: parseDate(khoaHoc?.NGAY_KHAI_GIANG),
        ngayBeGiang: parseDate(khoaHoc?.NGAY_BE_GIANG),
        ngaySatHach: parseDate(khoaHoc?.NGAY_SAT_HACH),
        soHocSinh: khoaHoc?.SO_HOC_SINH ? Number(khoaHoc.SO_HOC_SINH) : null,
      },
    });

    const maDkList = nguoiLxList
      .map((item) => String(item?.MA_DK || "").trim())
      .filter(Boolean);

    const existingStudents = maDkList.length
      ? await prisma.student.findMany({
          where: {
            maDk: {
              in: maDkList,
            },
          },
          select: {
            maDk: true,
          },
        })
      : [];

    const existingSet = new Set(
      existingStudents.map((student) => student.maDk).filter(Boolean)
    );

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    const batchSize = 100;

    for (let i = 0; i < nguoiLxList.length; i += batchSize) {
      const batch = nguoiLxList.slice(i, i + batchSize);

      for (const item of batch) {
        try {
          const hoSo = item?.HO_SO || {};
          const maDk = String(item?.MA_DK || "").trim();

          if (!maDk) {
            failed++;
            errors.push(
              `Thiếu MA_DK ở học viên ${item?.HO_VA_TEN || "không rõ tên"}`
            );
            continue;
          }

          const data = {
            courseId: course.id,
            maDk,
            hoVaTen: item?.HO_VA_TEN || "",
            soCmt: item?.SO_CMT ? String(item.SO_CMT).trim() : null,
            ngaySinh: parseDate(item?.NGAY_SINH),
            gioiTinh: item?.GIOI_TINH || null,
            soHoSo: hoSo?.SO_HO_SO ? String(hoSo.SO_HO_SO).trim() : null,
            ngayNhanHoSo: parseDate(hoSo?.NGAY_NHAN_HOSO),
            hangGplx: hoSo?.HANG_GPLX || khoaHoc?.HANG_GPLX || null,
            hangDaoTao: hoSo?.HANG_DAOTAO || khoaHoc?.MA_HANG_DAO_TAO || null,
          };

          if (existingSet.has(maDk)) {
            await prisma.student.update({
              where: { maDk },
              data,
            });
            updated++;
          } else {
            await prisma.student.create({
              data,
            });
            created++;
          }
        } catch (e: any) {
          failed++;
          errors.push(
            `Lỗi học viên ${item?.HO_VA_TEN || "không rõ"}: ${e.message}`
          );
        }
      }
    }

    await prisma.importLog.create({
      data: {
        loaiFile: "XML",
        tenFile: originalName || "import-xml",
        tongSoDong: nguoiLxList.length,
        thanhCong: created + updated,
        thatBai: failed,
        ghiChu: errors.length
          ? errors.join(" | ").slice(0, 1000)
          : note || "OK",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Import XML hoàn tất",
      fileName: originalName,
      course: {
        maKhoaHoc: course.maKhoaHoc,
        tenKhoaHoc: course.tenKhoaHoc,
      },
      total: nguoiLxList.length,
      created,
      updated,
      failed,
      errors,
    });
  } catch (error: any) {
    console.error("POST /api/import-xml/process error:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi import XML" },
      { status: 500 }
    );
  }
}