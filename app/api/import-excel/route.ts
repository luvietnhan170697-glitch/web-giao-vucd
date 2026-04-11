import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RawRow = Record<string, unknown>;

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function getCell(row: RawRow, candidates: string[]) {
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(String(key));
    if (candidates.includes(normalizedKey)) {
      return value;
    }
  }
  return undefined;
}

function cleanString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function excelDateToDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // dd/mm/yyyy hoặc dd-mm-yyyy
  const vnMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (vnMatch) {
    const [, d, m, y] = vnMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // yyyy-mm-dd
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Chưa chọn file Excel." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: false,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json(
        { ok: false, message: "File Excel không có sheet dữ liệu." },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
      defval: "",
      raw: true,
    });

    if (!rows.length) {
      return NextResponse.json(
        { ok: false, message: "Không có dữ liệu trong file Excel." },
        { status: 400 }
      );
    }

    let createdCount = 0;
    let updatedCount = 0;
    const skipped: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const maDk = cleanString(
        getCell(row, ["ma dk", "ma_dk", "mã dk", "mã đăng ký"])
      );

      const hoTen = cleanString(
        getCell(row, ["họ và tên", "ho va ten", "họ tên", "ho ten"])
      );

      const ngaySinhRaw = getCell(row, ["ngày sinh", "ngay sinh", "dob"]);

      const cccd = cleanString(
        getCell(row, [
          "cccd / số cmt",
          "cccd/số cmt",
          "cccd",
          "số cmt",
          "so cmt",
          "so cccd",
        ])
      );

      const maKhoaHoc = cleanString(
        getCell(row, ["khóa học", "khoa hoc", "ma khoa hoc", "mã khóa học"])
      );

      const tenKhoaHoc = cleanString(
        getCell(row, ["tên khóa học", "ten khoa hoc", "tên lớp", "ten lop"])
      );

      if (!maDk) {
        skipped.push(`Dòng ${i + 2}: thiếu MA_DK`);
        continue;
      }

      const ngaySinh = excelDateToDate(ngaySinhRaw);

      try {
        let courseId: string | null = null;

        if (maKhoaHoc) {
          const course = await prisma.course.upsert({
            where: { maKhoaHoc },
            update: {
              tenKhoaHoc: tenKhoaHoc || undefined,
            },
            create: {
              maKhoaHoc,
              tenKhoaHoc: tenKhoaHoc || null,
            },
            select: { id: true },
          });

          courseId = course.id;
        }

        const existed = await prisma.student.findUnique({
          where: { maDk },
          select: { id: true },
        });

        await prisma.student.upsert({
          where: { maDk },
          update: {
            hoVaTen: hoTen || undefined,
            ngaySinh: ngaySinh || undefined,
            soCmt: cccd || undefined,
            courseId,
          },
          create: {
            maDk,
            hoVaTen: hoTen || null,
            ngaySinh,
            soCmt: cccd || null,
            courseId,
          },
        });

        if (existed) {
          updatedCount++;
        } else {
          createdCount++;
        }
      } catch (error) {
        console.error(`Import Excel lỗi tại dòng ${i + 2}:`, error);
        skipped.push(`Dòng ${i + 2}: lỗi khi lưu dữ liệu`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Import Excel hoàn tất.",
      totalRows: rows.length,
      createdCount,
      updatedCount,
      skippedCount: skipped.length,
      skipped,
    });
  } catch (error) {
    console.error("IMPORT_EXCEL_ERROR:", error);
    return NextResponse.json(
      { ok: false, message: "Import Excel thất bại." },
      { status: 500 }
    );
  }
}