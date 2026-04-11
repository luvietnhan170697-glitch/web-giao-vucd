import { NextRequest, NextResponse } from "next/server";
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

function normalizeResult(value: unknown): string | null {
  const raw = cleanString(value).toLowerCase();
  if (!raw) return null;

  if (["đạt", "dat", "pass", "passed"].includes(raw)) return "DAT";
  if (["rớt", "rot", "trượt", "truot", "fail", "failed", "không đạt", "khong dat"].includes(raw)) return "ROT";
  if (["vắng", "vang", "absent"].includes(raw)) return "VANG";

  return raw.toUpperCase();
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

  const vnMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (vnMatch) {
    const [, d, m, y] = vnMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calcKetQua(
  lyThuyet: string | null,
  moPhong: string | null,
  hinh: string | null,
  duong: string | null
) {
  const items = [
    { key: "L", value: lyThuyet },
    { key: "M", value: moPhong },
    { key: "H", value: hinh },
    { key: "Đ", value: duong },
  ];

  const failed = items
    .filter((item) => item.value && item.value !== "DAT")
    .map((item) => item.key);

  const allPresent = items.every((item) => item.value !== null && item.value !== "");

  if (allPresent && failed.length === 0) {
    return { ketQua: "DAT", noiDungRot: null };
  }

  if (failed.length > 0) {
    return { ketQua: "KHONG_DAT", noiDungRot: failed.join("-") };
  }

  return { ketQua: null, noiDungRot: null };
}

export async function POST(req: NextRequest) {
  try {
    const preview = req.nextUrl.searchParams.get("preview") === "1";

    const formData = await req.formData();
    const file = formData.get("file");
    const examDateFallback = cleanString(formData.get("examDate"));
    const note = cleanString(formData.get("note"));

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Chưa chọn file Excel." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });

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

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const maDk = cleanString(
        getCell(row, ["ma dk", "ma_dk", "mã dk", "mã đăng ký"])
      );

      const ngayThiRaw = getCell(row, [
        "ngay thi tot nghiep",
        "ngay_thi_tot_nghiep",
        "ngày thi tốt nghiệp",
        "ngay thi",
      ]);

      const lyThuyet = normalizeResult(
        getCell(row, ["ly thuyet", "ly_thuyet", "lý thuyết"])
      );

      const moPhong = normalizeResult(
        getCell(row, ["mo phong", "mo_phong", "mô phỏng"])
      );

      const hinh = normalizeResult(
        getCell(row, ["hinh", "hình"])
      );

      const duong = normalizeResult(
        getCell(row, ["duong", "đường"])
      );

      if (!maDk) {
        failed++;
        errors.push(`Dòng ${i + 2}: thiếu MA_DK.`);
        continue;
      }

      const student = await prisma.student.findUnique({
        where: { maDk },
        select: { id: true },
      });

      if (!student) {
        failed++;
        errors.push(`Dòng ${i + 2}: không tìm thấy học viên MA_DK = ${maDk}.`);
        continue;
      }

      const ngayThiFromFile = excelDateToDate(ngayThiRaw);
      const ngayThiFallback = examDateFallback ? excelDateToDate(examDateFallback) : null;
      const ngayThi = ngayThiFromFile || ngayThiFallback;

      if (!ngayThi) {
        failed++;
        errors.push(`Dòng ${i + 2}: thiếu ngày thi hợp lệ.`);
        continue;
      }

      const existing = await prisma.graduationResult.findFirst({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
      });

      const mergedLyThuyet = lyThuyet || existing?.lyThuyet || null;
      const mergedMoPhong = moPhong || existing?.moPhong || null;
      const mergedHinh = hinh || existing?.hinh || null;
      const mergedDuong = duong || existing?.duong || null;

      const { ketQua, noiDungRot } = calcKetQua(
        mergedLyThuyet,
        mergedMoPhong,
        mergedHinh,
        mergedDuong
      );

      if (!preview) {
        await prisma.graduationResult.create({
          data: {
            studentId: student.id,
            ngayThi,
            lyThuyet: mergedLyThuyet,
            moPhong: mergedMoPhong,
            hinh: mergedHinh,
            duong: mergedDuong,
            ketQua,
            noiDungRot: note
              ? noiDungRot
                ? `${noiDungRot} | ${note}`
                : note
              : noiDungRot,
          },
        });
      }

      success++;
    }

    return NextResponse.json({
      ok: failed === 0,
      message: preview
        ? "Kiểm tra file hoàn tất."
        : "Import kết quả tốt nghiệp hoàn tất.",
      summary: {
        total: rows.length,
        success,
        failed,
      },
      errors,
    });
  } catch (error) {
    console.error("IMPORT_GRADUATION_ERROR:", error);
    return NextResponse.json(
      { ok: false, message: "Import tốt nghiệp thất bại." },
      { status: 500 }
    );
  }
}