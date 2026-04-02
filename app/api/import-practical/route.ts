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

function addOneYear(date: Date) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

function formatDateVN(date?: Date | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("vi-VN");
}

function getComponentCode(tenNoiDung: string) {
  const normalized = normalizeValue(tenNoiDung).toLowerCase();

  if (normalized === "ly_thuyet" || normalized === "ly thuyet" || normalized === "lý thuyết") {
    return "L";
  }
  if (normalized === "mo_phong" || normalized === "mo phong" || normalized === "mô phỏng") {
    return "M";
  }
  if (normalized === "hinh" || normalized === "hình") {
    return "H";
  }
  if (normalized === "duong" || normalized === "đường") {
    return "Đ";
  }

  return tenNoiDung;
}

function isComponentStillValid(component: {
  ngayDat?: Date | null;
  baoLuuDenNgay?: Date | null;
  conHieuLuc?: boolean;
}, examDate: Date | null) {
  if (!component.ngayDat || !component.baoLuuDenNgay || !examDate) return false;
  if (component.conHieuLuc === false) return false;
  return examDate <= component.baoLuuDenNgay;
}

function buildProtectionNote(components: Array<{
  tenNoiDung: string;
  ngayDat?: Date | null;
  baoLuuDenNgay?: Date | null;
  conHieuLuc?: boolean;
}>) {
  const now = new Date();
  const notes: string[] = [];

  for (const item of components) {
    const code = getComponentCode(item.tenNoiDung);

    if (!item.ngayDat || !item.baoLuuDenNgay) {
      notes.push(`${code}: chưa đạt`);
      continue;
    }

    const diffMs = item.baoLuuDenNgay.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (item.conHieuLuc === false || diffDays < 0) {
      notes.push(`${code}: hết hạn ${formatDateVN(item.baoLuuDenNgay)}`);
    } else if (diffDays <= 30) {
      notes.push(`${code}: sắp hết hạn ${formatDateVN(item.baoLuuDenNgay)}`);
    } else {
      notes.push(`${code}: còn hạn ${formatDateVN(item.baoLuuDenNgay)}`);
    }
  }

  return notes.join(" | ");
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
      const maDk = normalizeMaDK(getCell(row, ["ma_dk", "madk", "ma dk"]));

      if (!maDk) {
        skipped.push("Thiếu ma_dk");
        continue;
      }

      const student = await prisma.student.findFirst({
        where: { maDk },
        include: {
          examComponents: true,
        },
      });

      if (!student) {
        skipped.push(`${maDk}: không tìm thấy học viên`);
        continue;
      }

      const examDate =
        parseDate(
          getCell(row, [
            "ngay_thi_sat_hach",
            "ngay_thi_sh",
            "ngày_thi_sát_hạch",
            "ngay thi sat hach",
          ])
        ) ?? null;

      const statuses = {
        lyThuyet: normalizeExamStatus(
          getCell(row, ["ly_thuyet", "ly thuyet", "lý thuyết"])
        ),
        moPhong: normalizeExamStatus(
          getCell(row, ["mo_phong", "mo phong", "mô phỏng"])
        ),
        hinh: normalizeExamStatus(getCell(row, ["hinh", "hình"])),
        duong: normalizeExamStatus(getCell(row, ["duong", "đường"])),
      };

      const componentDefs = [
        { key: "lyThuyet", tenNoiDung: "Lý thuyết", code: "L", status: statuses.lyThuyet },
        { key: "moPhong", tenNoiDung: "Mô phỏng", code: "M", status: statuses.moPhong },
        { key: "hinh", tenNoiDung: "Hình", code: "H", status: statuses.hinh },
        { key: "duong", tenNoiDung: "Đường", code: "Đ", status: statuses.duong },
      ] as const;

      const failedCodes: string[] = [];
      const protectionComponents: Array<{
        tenNoiDung: string;
        ngayDat?: Date | null;
        baoLuuDenNgay?: Date | null;
        conHieuLuc?: boolean;
      }> = [];

      for (const item of componentDefs) {
        const oldComponent = student.examComponents.find(
          (c) => c.tenNoiDung.toLowerCase() === item.tenNoiDung.toLowerCase()
        );

        if (item.status === "Đạt") {
          if (!examDate) {
            skipped.push(`${maDk}: thiếu ngày_thi_sat_hach cho nội dung ${item.code}`);
            continue;
          }

          const ngayDat = examDate;
          const baoLuuDenNgay = addOneYear(ngayDat);

          if (oldComponent) {
            await prisma.examComponent.update({
              where: { id: oldComponent.id },
              data: {
                tenNoiDung: item.tenNoiDung,
                ngayDat,
                baoLuuDenNgay,
                conHieuLuc: true,
                ghiChu: `Đạt ngày ${formatDateVN(ngayDat)}, bảo lưu đến ${formatDateVN(
                  baoLuuDenNgay
                )}`,
              },
            });

            protectionComponents.push({
              tenNoiDung: item.tenNoiDung,
              ngayDat,
              baoLuuDenNgay,
              conHieuLuc: true,
            });
          } else {
            const created = await prisma.examComponent.create({
              data: {
                studentId: student.id,
                tenNoiDung: item.tenNoiDung,
                ngayDat,
                baoLuuDenNgay,
                conHieuLuc: true,
                ghiChu: `Đạt ngày ${formatDateVN(ngayDat)}, bảo lưu đến ${formatDateVN(
                  baoLuuDenNgay
                )}`,
              },
            });

            protectionComponents.push(created);
          }
        } else if (item.status === "Không đạt" || item.status === "Vắng") {
          failedCodes.push(item.code);

          if (oldComponent) {
            const stillValid = isComponentStillValid(oldComponent, examDate);

            if (stillValid) {
              protectionComponents.push(oldComponent);
            } else {
              if (oldComponent.conHieuLuc !== false && oldComponent.baoLuuDenNgay) {
                await prisma.examComponent.update({
                  where: { id: oldComponent.id },
                  data: {
                    conHieuLuc: false,
                    ghiChu: `Hết hiệu lực bảo lưu ngày ${formatDateVN(oldComponent.baoLuuDenNgay)}`,
                  },
                });
              }

              protectionComponents.push({
                ...oldComponent,
                conHieuLuc: false,
              });
            }
          } else {
            protectionComponents.push({
              tenNoiDung: item.tenNoiDung,
              ngayDat: null,
              baoLuuDenNgay: null,
              conHieuLuc: false,
            });
          }
        } else {
          if (oldComponent) {
            const stillValid = isComponentStillValid(oldComponent, examDate);

            if (stillValid) {
              protectionComponents.push(oldComponent);
            } else {
              if (oldComponent.conHieuLuc !== false && oldComponent.baoLuuDenNgay) {
                await prisma.examComponent.update({
                  where: { id: oldComponent.id },
                  data: {
                    conHieuLuc: false,
                    ghiChu: `Hết hiệu lực bảo lưu ngày ${formatDateVN(oldComponent.baoLuuDenNgay)}`,
                  },
                });
              }

              failedCodes.push(item.code);
              protectionComponents.push({
                ...oldComponent,
                conHieuLuc: false,
              });
            }
          } else {
            failedCodes.push(item.code);
            protectionComponents.push({
              tenNoiDung: item.tenNoiDung,
              ngayDat: null,
              baoLuuDenNgay: null,
              conHieuLuc: false,
            });
          }
        }
      }

      const latestComponents = await prisma.examComponent.findMany({
        where: { studentId: student.id },
      });

      const componentMap = new Map(
        latestComponents.map((item) => [item.tenNoiDung.toLowerCase(), item])
      );

      const finalLy = componentMap.get("lý thuyết");
      const finalMp = componentMap.get("mô phỏng");
      const finalH = componentMap.get("hình");
      const finalD = componentMap.get("đường");

      const validLy = finalLy ? isComponentStillValid(finalLy, examDate) : false;
      const validMp = finalMp ? isComponentStillValid(finalMp, examDate) : false;
      const validH = finalH ? isComponentStillValid(finalH, examDate) : false;
      const validD = finalD ? isComponentStillValid(finalD, examDate) : false;

      const finalFailedCodes: string[] = [];
      if (!validLy) finalFailedCodes.push("L");
      if (!validMp) finalFailedCodes.push("M");
      if (!validH) finalFailedCodes.push("H");
      if (!validD) finalFailedCodes.push("Đ");

      const allPassed = finalFailedCodes.length === 0;

      const allComponentsForNote = [
        finalLy ?? { tenNoiDung: "Lý thuyết", ngayDat: null, baoLuuDenNgay: null, conHieuLuc: false },
        finalMp ?? { tenNoiDung: "Mô phỏng", ngayDat: null, baoLuuDenNgay: null, conHieuLuc: false },
        finalH ?? { tenNoiDung: "Hình", ngayDat: null, baoLuuDenNgay: null, conHieuLuc: false },
        finalD ?? { tenNoiDung: "Đường", ngayDat: null, baoLuuDenNgay: null, conHieuLuc: false },
      ];

      const ghiChuBaoLuu = buildProtectionNote(allComponentsForNote);

      const allNgayDat = [finalLy?.ngayDat, finalMp?.ngayDat, finalH?.ngayDat, finalD?.ngayDat]
        .filter(Boolean)
        .map((d) => new Date(d as Date));

      const latestNgayDat =
        allNgayDat.length > 0
          ? new Date(Math.max(...allNgayDat.map((d) => d.getTime())))
          : null;

      await prisma.practicalExamResult.create({
        data: {
          studentId: student.id,
          ngayThi: examDate,
          ngayDat: allPassed ? latestNgayDat : null,
          ketQua: allPassed ? "Đạt" : "Không đạt",
          noiDungRot: allPassed ? "" : finalFailedCodes.join("-"),
          ghiChu: ghiChuBaoLuu,
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
    console.error("IMPORT_PRACTICAL_ERROR:", error);

    return Response.json(
      {
        error: "Lỗi import sát hạch",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}