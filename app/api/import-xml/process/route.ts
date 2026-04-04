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

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/;
  const matchYmd = str.match(ymd);
  if (matchYmd) {
    const [, yyyy, mm, dd] = matchYmd;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }

  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function pick(obj: any, keys: string[]) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function findStudentRows(node: any): any[] {
  if (!node) return [];

  if (Array.isArray(node)) {
    const directRows = node.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        (
          pick(item, ["MA_DK", "ma_dk", "MaDK", "maDk"]) ||
          pick(item, ["SO_CMT", "so_cmt", "SoCmt", "CCCD", "cccd"]) ||
          pick(item, ["HO_VA_TEN", "ho_va_ten", "HoVaTen", "HO_TEN", "ho_ten"])
        )
    );

    if (directRows.length > 0) {
      return directRows;
    }

    for (const item of node) {
      const found = findStudentRows(item);
      if (found.length > 0) return found;
    }
    return [];
  }

  if (typeof node === "object") {
    const selfLooksLikeStudent =
      pick(node, ["MA_DK", "ma_dk", "MaDK", "maDk"]) ||
      pick(node, ["SO_CMT", "so_cmt", "SoCmt", "CCCD", "cccd"]);

    if (selfLooksLikeStudent) {
      return [node];
    }

    for (const key of Object.keys(node)) {
      const found = findStudentRows(node[key]);
      if (found.length > 0) return found;
    }
  }

  return [];
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
    const studentsRaw = findStudentRows(parsed);

    if (!studentsRaw.length) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy danh sách học viên trong XML. Cần xem lại key dữ liệu XML thực tế.",
        },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of studentsRaw) {
      const maDk = asText(
        pick(item, ["MA_DK", "ma_dk", "MaDK", "maDk"])
      );

      const soCmt = asText(
        pick(item, ["SO_CMT", "so_cmt", "SoCmt", "CCCD", "cccd"])
      );

      const hoVaTen = asText(
        pick(item, [
          "HO_VA_TEN",
          "ho_va_ten",
          "HoVaTen",
          "HO_TEN",
          "ho_ten",
          "HoTen",
        ])
      );

      if (!maDk || !hoVaTen) {
        skipped++;
        continue;
      }

      const ngaySinh = toDate(
        asText(
          pick(item, [
            "NGAY_SINH",
            "ngay_sinh",
            "NgaySinh",
            "NGAYSINH",
            "ngaysinh",
          ])
        )
      );

      const soDienThoai = asText(
        pick(item, [
          "SO_DIEN_THOAI",
          "so_dien_thoai",
          "SoDienThoai",
          "DIEN_THOAI",
          "dien_thoai",
        ])
      );

      const hangGplx = asText(
        pick(item, ["HANG_GPLX", "hang_gplx", "HangGPLX"])
      );

      const hangDaoTao = asText(
        pick(item, ["HANG_DAO_TAO", "hang_dao_tao", "HangDaoTao"])
      );

      const ngayNhanHoSo = toDate(
        asText(
          pick(item, [
            "NGAY_NHAN_HO_SO",
            "ngay_nhan_ho_so",
            "NgayNhanHoSo",
          ])
        )
      );

      const maKhoaHoc = asText(
        pick(item, [
          "MA_KHOA_HOC",
          "ma_khoa_hoc",
          "MaKhoaHoc",
          "MA_LOP",
          "ma_lop",
          "MaLop",
          "MALOP",
          "malop",
          "KHOA",
          "khoa",
        ])
      );

      const tenKhoaHoc = asText(
        pick(item, [
          "TEN_KHOA_HOC",
          "ten_khoa_hoc",
          "TenKhoaHoc",
          "TEN_LOP",
          "ten_lop",
          "TenLop",
          "TENLOP",
          "tenlop",
        ])
      );

      let courseId: string | null = null;

      if (maKhoaHoc || tenKhoaHoc) {
        const existingCourse = await prisma.course.findFirst({
          where: {
            OR: [
              ...(maKhoaHoc ? [{ maKhoaHoc }] : []),
              ...(tenKhoaHoc ? [{ tenKhoaHoc }] : []),
            ],
          },
        });

        if (existingCourse) {
          const updatedCourse = await prisma.course.update({
            where: { id: existingCourse.id },
            data: {
              maKhoaHoc: maKhoaHoc || existingCourse.maKhoaHoc,
              tenKhoaHoc: tenKhoaHoc || existingCourse.tenKhoaHoc,
              hangDaoTao: hangDaoTao || existingCourse.hangDaoTao,
            },
          });

          courseId = updatedCourse.id;
        } else if (maKhoaHoc) {
          const createdCourse = await prisma.course.create({
            data: {
              maKhoaHoc,
              tenKhoaHoc: tenKhoaHoc || null,
              hangDaoTao: hangDaoTao || null,
            },
          });

          courseId = createdCourse.id;
        }
      }

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
            ngaySinh: ngaySinh || existing.ngaySinh,
            soDienThoai: soDienThoai || existing.soDienThoai,
            hangGplx: hangGplx || existing.hangGplx,
            hangDaoTao: hangDaoTao || existing.hangDaoTao,
            ngayNhanHoSo: ngayNhanHoSo || existing.ngayNhanHoSo,
            ghiChu: note || existing.ghiChu,
            courseId: courseId || existing.courseId,
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
            courseId,
          },
        });
        created++;
      }
    }

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