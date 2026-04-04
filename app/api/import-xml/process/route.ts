import { NextResponse } from "next/server";
import { get, del } from "@vercel/blob";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ProcessBody = {
  pathname?: string;
  note?: string;
  originalName?: string;
};

function toDate(value?: string | null) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = str.match(dmy);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }

  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ProcessBody;
    const pathname = body.pathname?.trim();
    const note = body.note?.trim() || "";

    if (!pathname) {
      return NextResponse.json(
        { error: "Thiếu pathname của file XML" },
        { status: 400 }
      );
    }

    const blob = await get(pathname, { access: "private" });

    if (!blob) {
      return NextResponse.json(
        { error: "Không tìm thấy file XML trên Blob" },
        { status: 404 }
      );
    }

    const xmlText = await new Response(blob.stream).text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
      parseTagValue: false,
    });

    const parsed = parser.parse(xmlText);

    // =========================
    // QUAN TRỌNG:
    // Bạn sửa đoạn này theo đúng cấu trúc XML thật của bạn.
    // Ở đây tôi để mẫu khá an toàn: tìm mảng học viên ở nhiều key phổ biến.
    // =========================
    const studentsRaw =
      asArray(parsed?.DanhSachHocVien?.HocVien) ||
      asArray(parsed?.DanhSach?.HocVien) ||
      asArray(parsed?.HocVien);

    if (!studentsRaw.length) {
      return NextResponse.json(
        {
          error:
            "XML đã đọc được nhưng chưa map đúng danh sách học viên. Cần chỉnh key XML trong route process.",
        },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of studentsRaw) {
      const maDk = String(item?.MA_DK || item?.ma_dk || item?.MaDK || "").trim();
      const soCmt = String(item?.SO_CMT || item?.so_cmt || item?.SoCmt || "").trim();
      const hoVaTen = String(
        item?.HO_VA_TEN || item?.ho_va_ten || item?.HoVaTen || item?.HO_TEN || ""
      ).trim();

      if (!maDk || !hoVaTen) {
        skipped++;
        continue;
      }

      const ngaySinh = toDate(
        item?.NGAY_SINH || item?.ngay_sinh || item?.NgaySinh || null
      );

      const soDienThoai = String(
        item?.SO_DIEN_THOAI || item?.so_dien_thoai || item?.SoDienThoai || ""
      ).trim();

      const hangGplx = String(
        item?.HANG_GPLX || item?.hang_gplx || item?.HangGPLX || ""
      ).trim();

      const hangDaoTao = String(
        item?.HANG_DAO_TAO || item?.hang_dao_tao || item?.HangDaoTao || ""
      ).trim();

      const ngayNhanHoSo = toDate(
        item?.NGAY_NHAN_HO_SO || item?.ngay_nhan_ho_so || item?.NgayNhanHoSo || null
      );

      const existing = await prisma.student.findFirst({
        where: {
          OR: [
            { maDk },
            ...(soCmt ? [{ soCmt }] : []),
          ],
        },
      });

      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: {
            maDk,
            soCmt: soCmt || existing.soCmt,
            hoVaTen,
            ngaySinh,
            soDienThoai: soDienThoai || existing.soDienThoai,
            hangGplx: hangGplx || existing.hangGplx,
            hangDaoTao: hangDaoTao || existing.hangDaoTao,
            ngayNhanHoSo: ngayNhanHoSo || existing.ngayNhanHoSo,
            ghiChu: note || existing.ghiChu,
          },
        });
        updated++;
      } else {
        await prisma.student.create({
          data: {
            maDk,
            soCmt: soCmt || null,
            hoVaTen,
            ngaySinh,
            soDienThoai: soDienThoai || null,
            hangGplx: hangGplx || null,
            hangDaoTao: hangDaoTao || null,
            ngayNhanHoSo,
            ghiChu: note || null,
          },
        });
        created++;
      }
    }

    // Xử lý xong thì xóa file khỏi Blob để tránh lưu XML nhạy cảm
    await del(pathname);

    return NextResponse.json({
      ok: true,
      message: "Import XML thành công",
      total: studentsRaw.length,
      created,
      updated,
      skipped,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Lỗi xử lý import XML" },
      { status: 500 }
    );
  }
}