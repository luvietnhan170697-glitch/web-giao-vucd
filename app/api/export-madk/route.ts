import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

type ExportMode = "ma_dk" | "mapping" | "file";
type ExportTarget = "students" | "graduation" | "sat_hach";

type ParsedMapping = {
  soCccd: string;
  khoaHoc: string;
};

function normalize(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseDate(value: Date | string | null | undefined): string {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const day = pad2(d.getDate());
  const month = pad2(d.getMonth() + 1);
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => normalize(v)).filter(Boolean))];
}

function parseMaDkText(input: string): string[] {
  return uniqueStrings(
    input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  );
}

function parseMappingText(input: string): ParsedMapping[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const mappings: ParsedMapping[] = [];

  for (const line of lines) {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 2) continue;

    const soCccd = normalize(parts[0]);
    const khoaHoc = normalize(parts[1]);

    if (!soCccd || !khoaHoc) continue;
    mappings.push({ soCccd, khoaHoc });
  }

  return mappings;
}

function readCsvText(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

function parseCsvRows(text: string): Record<string, unknown>[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function getCell(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    const normalized = normalize(value);
    if (normalized) return normalized;
  }
  return "";
}

async function parseRowsFromFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".csv")) {
    return parseCsvRows(readCsvText(buffer));
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

async function readInput(
  req: NextRequest
): Promise<{
  mode: ExportMode;
  target: ExportTarget;
  maDkList: string[];
  mappingList: ParsedMapping[];
}> {
  const formData = await req.formData();

  const mode = normalize(formData.get("mode")) as ExportMode;
  const target = normalize(formData.get("target")) as ExportTarget;

  if (!["ma_dk", "mapping", "file"].includes(mode)) {
    throw new Error("Chế độ xuất không hợp lệ");
  }

  if (!["students", "graduation", "sat_hach"].includes(target)) {
    throw new Error("Loại dữ liệu xuất không hợp lệ");
  }

  if (mode === "ma_dk") {
    const maDkText = normalize(formData.get("maDkText"));
    const maDkList = parseMaDkText(maDkText);

    if (!maDkList.length) {
      throw new Error("Vui lòng nhập danh sách MA_DK");
    }

    return { mode, target, maDkList, mappingList: [] };
  }

  if (mode === "mapping") {
    const mappingText = normalize(formData.get("mappingText"));
    const mappingList = parseMappingText(mappingText);

    if (!mappingList.length) {
      throw new Error("Vui lòng nhập danh sách mapping theo dạng CCCD | Khóa học");
    }

    return { mode, target, maDkList: [], mappingList };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    throw new Error("Chưa chọn file tải lên");
  }

  const rows = await parseRowsFromFile(file);
  if (!rows.length) {
    throw new Error("File không có dữ liệu");
  }

  const maDkList = uniqueStrings(
    rows.map((row) =>
      getCell(row, ["MA_DK", "ma_dk", "maDk", "Mã ĐK", "MaDK", "MADK"])
    )
  );

  const mappingList: ParsedMapping[] = rows
    .map((row) => {
      const soCccd = getCell(row, [
        "CCCD",
        "cccd",
        "soCccd",
        "Số CCCD",
        "SO_CCCD",
        "SO_CMT",
        "soCmt",
        "CMT",
      ]);

      const khoaHoc = getCell(row, [
        "KHOA_HOC",
        "Khóa học",
        "khoaHoc",
        "TEN_KHOA_HOC",
        "tenKhoaHoc",
      ]);

      return { soCccd, khoaHoc };
    })
    .filter((item) => item.soCccd && item.khoaHoc);

  if (!maDkList.length && !mappingList.length) {
    throw new Error("File phải có cột MA_DK hoặc cột CCCD + Khóa học");
  }

  return { mode, target, maDkList, mappingList };
}

async function findStudentsByMaDk(maDkList: string[]) {
  return prisma.student.findMany({
    where: {
      maDk: {
        in: maDkList,
      },
    },
    include: {
      course: true,
      medicalChecks: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      graduationResults: {
        orderBy: [{ ngayThi: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
      practicalResults: {
        orderBy: [{ ngayThi: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
  });
}

async function findStudentsByMapping(mappingList: ParsedMapping[]) {
  return prisma.student.findMany({
    where: {
      OR: mappingList.map((item) => ({
        AND: [
          { soCmt: item.soCccd },
          {
            course: {
              is: {
                tenKhoaHoc: item.khoaHoc,
              },
            },
          },
        ],
      })),
    },
    include: {
      course: true,
      medicalChecks: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      graduationResults: {
        orderBy: [{ ngayThi: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
      practicalResults: {
        orderBy: [{ ngayThi: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
  });
}

type StudentWithRelations = Awaited<ReturnType<typeof findStudentsByMaDk>>[number];

function findStudentByMapping(
  students: StudentWithRelations[],
  item: ParsedMapping
) {
  return students.find(
    (s) =>
      normalize(s.soCmt) === item.soCccd &&
      normalize(s.course?.tenKhoaHoc) === item.khoaHoc
  );
}

function buildStudentRows(
  orderedKeys: string[],
  students: StudentWithRelations[],
  mode: ExportMode,
  mappingList: ParsedMapping[]
) {
  if (mode === "mapping") {
    return mappingList.map((item) => {
      const student = findStudentByMapping(students, item);
      const medical = student?.medicalChecks?.[0];

      return {
        CCCD_TRA_CUU: item.soCccd,
        KHOA_HOC_TRA_CUU: item.khoaHoc,
        MA_DK: student?.maDk || "",
        HO_VA_TEN: student?.hoVaTen || "",
        NGAY_SINH: parseDate(student?.ngaySinh),
        SO_CMT: student?.soCmt || "",
        SO_DIEN_THOAI: student?.soDienThoai || "",
        GIOI_TINH: student?.gioiTinh || "",
        SO_HO_SO: student?.soHoSo || "",
        NGAY_NHAN_HO_SO: parseDate(student?.ngayNhanHoSo),
        HANG_GPLX: student?.hangGplx || "",
        HANG_DAO_TAO: student?.hangDaoTao || "",
        GIAO_VIEN: student?.giaoVien || "",
        CTV: student?.ctv || "",
        KHOA_HOC: student?.course?.tenKhoaHoc || "",
        MA_KHOA_HOC: student?.course?.maKhoaHoc || "",
        NGAY_KHAM_SUC_KHOE: parseDate(medical?.ngayKham ?? student?.ngayKhamSucKhoe),
        NGAY_HET_HAN_SK: parseDate(medical?.ngayHetHan ?? student?.ngayHetHan),
        GHI_CHU: student?.ghiChu || "",
      };
    });
  }

  return orderedKeys.map((maDk) => {
    const student = students.find((s) => normalize(s.maDk) === maDk);
    const medical = student?.medicalChecks?.[0];

    return {
      MA_DK: maDk,
      HO_VA_TEN: student?.hoVaTen || "",
      NGAY_SINH: parseDate(student?.ngaySinh),
      SO_CMT: student?.soCmt || "",
      SO_DIEN_THOAI: student?.soDienThoai || "",
      GIOI_TINH: student?.gioiTinh || "",
      SO_HO_SO: student?.soHoSo || "",
      NGAY_NHAN_HO_SO: parseDate(student?.ngayNhanHoSo),
      HANG_GPLX: student?.hangGplx || "",
      HANG_DAO_TAO: student?.hangDaoTao || "",
      GIAO_VIEN: student?.giaoVien || "",
      CTV: student?.ctv || "",
      KHOA_HOC: student?.course?.tenKhoaHoc || "",
      MA_KHOA_HOC: student?.course?.maKhoaHoc || "",
      NGAY_KHAM_SUC_KHOE: parseDate(medical?.ngayKham ?? student?.ngayKhamSucKhoe),
      NGAY_HET_HAN_SK: parseDate(medical?.ngayHetHan ?? student?.ngayHetHan),
      GHI_CHU: student?.ghiChu || "",
    };
  });
}

function buildGraduationRows(
  orderedKeys: string[],
  students: StudentWithRelations[],
  mode: ExportMode,
  mappingList: ParsedMapping[]
) {
  if (mode === "mapping") {
    return mappingList.map((item) => {
      const student = findStudentByMapping(students, item);
      const graduation = student?.graduationResults?.[0];

      return {
        CCCD_TRA_CUU: item.soCccd,
        KHOA_HOC_TRA_CUU: item.khoaHoc,
        MA_DK: student?.maDk || "",
        HO_VA_TEN: student?.hoVaTen || "",
        SO_CMT: student?.soCmt || "",
        KHOA_HOC: student?.course?.tenKhoaHoc || "",
        NGAY_THI_TN: parseDate(graduation?.ngayThi),
        LY_THUYET: graduation?.lyThuyet || "",
        MO_PHONG: graduation?.moPhong || "",
        HINH: graduation?.hinh || "",
        DUONG: graduation?.duong || "",
        KET_QUA_TN: graduation?.ketQua || "",
        NOI_DUNG_ROT: graduation?.noiDungRot || "",
      };
    });
  }

  return orderedKeys.map((maDk) => {
    const student = students.find((s) => normalize(s.maDk) === maDk);
    const graduation = student?.graduationResults?.[0];

    return {
      MA_DK: maDk,
      HO_VA_TEN: student?.hoVaTen || "",
      SO_CMT: student?.soCmt || "",
      KHOA_HOC: student?.course?.tenKhoaHoc || "",
      NGAY_THI_TN: parseDate(graduation?.ngayThi),
      LY_THUYET: graduation?.lyThuyet || "",
      MO_PHONG: graduation?.moPhong || "",
      HINH: graduation?.hinh || "",
      DUONG: graduation?.duong || "",
      KET_QUA_TN: graduation?.ketQua || "",
      NOI_DUNG_ROT: graduation?.noiDungRot || "",
    };
  });
}

function buildSatHachRows(
  orderedKeys: string[],
  students: StudentWithRelations[],
  mode: ExportMode,
  mappingList: ParsedMapping[]
) {
  if (mode === "mapping") {
    return mappingList.map((item) => {
      const student = findStudentByMapping(students, item);
      const exam = student?.practicalResults?.[0];

      return {
        CCCD_TRA_CUU: item.soCccd,
        KHOA_HOC_TRA_CUU: item.khoaHoc,
        MA_DK: student?.maDk || "",
        HO_VA_TEN: student?.hoVaTen || "",
        SO_CMT: student?.soCmt || "",
        KHOA_HOC: student?.course?.tenKhoaHoc || "",
        NGAY_SAT_HACH: parseDate(exam?.ngayThi),
        NGAY_DAT: parseDate(exam?.ngayDat),
        KET_QUA_SAT_HACH: exam?.ketQua || "",
        NOI_DUNG_ROT: exam?.noiDungRot || "",
        GHI_CHU_SAT_HACH: exam?.ghiChu || "",
      };
    });
  }

  return orderedKeys.map((maDk) => {
    const student = students.find((s) => normalize(s.maDk) === maDk);
    const exam = student?.practicalResults?.[0];

    return {
      MA_DK: maDk,
      HO_VA_TEN: student?.hoVaTen || "",
      SO_CMT: student?.soCmt || "",
      KHOA_HOC: student?.course?.tenKhoaHoc || "",
      NGAY_SAT_HACH: parseDate(exam?.ngayThi),
      NGAY_DAT: parseDate(exam?.ngayDat),
      KET_QUA_SAT_HACH: exam?.ketQua || "",
      NOI_DUNG_ROT: exam?.noiDungRot || "",
      GHI_CHU_SAT_HACH: exam?.ghiChu || "",
    };
  });
}

function createWorkbookBuffer(sheetName: string, rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      if (!cell) continue;

      if (typeof cell.v === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(cell.v)) {
        cell.t = "s";
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/export-madk",
    runtime: "nodejs",
    message: "Export route is ready",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { mode, target, maDkList, mappingList } = await readInput(req);

    const students =
      mode === "mapping"
        ? await findStudentsByMapping(mappingList)
        : await findStudentsByMaDk(maDkList);

    const orderedKeys = mode === "mapping" ? [] : maDkList;

    let rows: Record<string, unknown>[] = [];
    let sheetName = "DATA";
    let filename = "export.xlsx";

    if (target === "students") {
      rows = buildStudentRows(orderedKeys, students, mode, mappingList);
      sheetName = "HOC_VIEN";
      filename = "export-hoc-vien.xlsx";
    } else if (target === "graduation") {
      rows = buildGraduationRows(orderedKeys, students, mode, mappingList);
      sheetName = "TOT_NGHIEP";
      filename = "export-tot-nghiep.xlsx";
    } else {
      rows = buildSatHachRows(orderedKeys, students, mode, mappingList);
      sheetName = "SAT_HACH";
      filename = "export-sat-hach.xlsx";
    }

    const outputBuffer = createWorkbookBuffer(sheetName, rows);

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("POST /api/export-madk error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Xuất dữ liệu thất bại",
      },
      { status: 500 }
    );
  }
}