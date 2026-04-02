import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "../../../lib/prisma";

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeMaDK(value: unknown) {
  return normalizeValue(value).toUpperCase();
}

function normalizeExamStatus(value: unknown): string {
  const v = normalizeValue(value).toLowerCase();

  if (!v) return "";

  if (v === "đạt" || v === "dat") return "Đạt";

  if (
    v === "không đạt" ||
    v === "khong dat" ||
    v === "rớt" ||
    v === "rot" ||
    v === "trượt" ||
    v === "truot"
  ) {
    return "Không đạt";
  }

  if (v === "vắng" || v === "vang") return "Vắng";

  return normalizeValue(value);
}

function getCell(row: Record<string, unknown>, acceptedKeys: string[]) {
  for (const key of Object.keys(row)) {
    const normalizedKey = key.trim().toLowerCase();
    if (acceptedKeys.includes(normalizedKey)) {
      return row[key];
    }
  }
  return "";
}

function pickNewOrOld(newValue: unknown, oldValue: unknown): string {
  const normalizedNew = normalizeExamStatus(newValue);
  if (normalizedNew) return normalizedNew;
  return normalizeExamStatus(oldValue);
}

function calcResult(input: {
  lyThuyet?: unknown;
  moPhong?: unknown;
  hinh?: unknown;
  duong?: unknown;
}) {
  const lyThuyet = normalizeExamStatus(input.lyThuyet);
  const moPhong = normalizeExamStatus(input.moPhong);
  const hinh = normalizeExamStatus(input.hinh);
  const duong = normalizeExamStatus(input.duong);

  const failed: string[] = [];

  if (lyThuyet && lyThuyet !== "Đạt") failed.push("L");
  if (moPhong && moPhong !== "Đạt") failed.push("M");
  if (hinh && hinh !== "Đạt") failed.push("H");
  if (duong && duong !== "Đạt") failed.push("Đ");

  const allPassed =
    lyThuyet === "Đạt" &&
    moPhong === "Đạt" &&
    hinh === "Đạt" &&
    duong === "Đạt";

  return {
    lyThuyet,
    moPhong,
    hinh,
    duong,
    ketQua: allPassed ? "Đạt" : "Không đạt",
    noiDungRot: allPassed ? "" : failed.join("-"),
  };
}

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;

    return new Date(
      parsed.y,
      parsed.m - 1,
      parsed.d,
      parsed.H || 0,
      parsed.M || 0,
      parsed.S || 0
    );
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]);
    const year = Number(ddmmyyyy[3]);
    const date = new Date(year, month - 1, day);
    if (!isNaN(date.getTime())) return date;
  }

  const iso = new Date(raw);
  if (!isNaN(iso.getTime())) return iso;

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "Chưa upload file" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return Response.json(
        { error: "File Excel không có sheet nào" },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (!rows.length) {
      return Response.json({ error: "File Excel trống" }, { status: 400 });
    }

    let updated = 0;
    const skipped: string[] = [];

    for (const row of rows) {
      const maDk = normalizeMaDK(
        getCell(row, ["ma_dk", "madk", "ma dk"])
      );

      if (!maDk) {
        skipped.push("Thiếu ma_dk");
        continue;
      }

      const student = await prisma.student.findFirst({
        where: { maDk },
      });

      if (!student) {
        skipped.push(`${maDk}: không tìm thấy học viên`);
        continue;
      }

      const old = await prisma.graduationResult.findFirst({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
      });

      const merged = calcResult({
        lyThuyet: pickNewOrOld(
          getCell(row, ["ly_thuyet", "ly thuyet", "lý thuyết"]),
          old?.lyThuyet
        ),
        moPhong: pickNewOrOld(
          getCell(row, ["mo_phong", "mo phong", "mô phỏng"]),
          old?.moPhong
        ),
        hinh: pickNewOrOld(
          getCell(row, ["hinh", "hình"]),
          old?.hinh
        ),
        duong: pickNewOrOld(
          getCell(row, ["duong", "đường"]),
          old?.duong
        ),
      });

      await prisma.graduationResult.create({
        data: {
          studentId: student.id,
          ngayThi:
            parseDate(
              getCell(row, [
                "ngay_thi_tot_nghiep",
                "ngày_thi_tốt_nghiệp",
                "ngay thi tot nghiep",
              ])
            ) ??
            old?.ngayThi ??
            null,
          lyThuyet: merged.lyThuyet,
          moPhong: merged.moPhong,
          hinh: merged.hinh,
          duong: merged.duong,
          ketQua: merged.ketQua,
          noiDungRot: merged.noiDungRot,
        },
      });

      updated++;
    }

    return Response.json({
      success: true,
      updated,
      skipped,
    });
  } catch (error) {
    console.error("IMPORT_GRADUATION_ERROR:", error);

    return Response.json(
      {
        error: "Lỗi import tốt nghiệp",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}