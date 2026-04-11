import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RawRow = Record<string, unknown>;

type StreamRowResult = {
  row: number;
  maDk: string;
  status: "success" | "error";
  message: string;
};

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
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

function getCell(row: RawRow, acceptedKeys: string[]) {
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);
    if (acceptedKeys.includes(normalizedKey)) {
      return value;
    }
  }
  return "";
}

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
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
    if (!Number.isNaN(date.getTime())) return date;
  }

  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime())) return iso;

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

function isComponentStillValid(
  component: {
    ngayDat?: Date | null;
    baoLuuDenNgay?: Date | null;
    conHieuLuc?: boolean;
  },
  examDate: Date | null
) {
  if (!component.ngayDat || !component.baoLuuDenNgay || !examDate) return false;
  if (component.conHieuLuc === false) return false;
  return examDate <= component.baoLuuDenNgay;
}

function buildProtectionNote(
  components: Array<{
    tenNoiDung: string;
    ngayDat?: Date | null;
    baoLuuDenNgay?: Date | null;
    conHieuLuc?: boolean;
  }>
) {
  const now = new Date();
  const notes: string[] = [];

  for (const item of components) {
    const code =
      item.tenNoiDung === "Lý thuyết"
        ? "L"
        : item.tenNoiDung === "Mô phỏng"
        ? "M"
        : item.tenNoiDung === "Hình"
        ? "H"
        : item.tenNoiDung === "Đường"
        ? "Đ"
        : item.tenNoiDung;

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

function sseLine(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const url = new URL(req.url);
    const preview = url.searchParams.get("preview") === "1";

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const examDateFallbackRaw = normalizeValue(formData.get("examDate"));
    const note = normalizeValue(formData.get("note"));

    if (!file) {
      return new Response(
        encoder.encode(
          sseLine({
            type: "done",
            ok: false,
            message: "Chưa upload file.",
            summary: { total: 0, processed: 0, success: 0, failed: 1, progress: 100 },
            results: [],
          })
        ),
        {
          status: 400,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        }
      );
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return new Response(
        encoder.encode(
          sseLine({
            type: "done",
            ok: false,
            message: "File Excel không có sheet nào.",
            summary: { total: 0, processed: 0, success: 0, failed: 1, progress: 100 },
            results: [],
          })
        ),
        {
          status: 400,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        }
      );
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
      defval: "",
      raw: true,
    });

    if (!rows.length) {
      return new Response(
        encoder.encode(
          sseLine({
            type: "done",
            ok: false,
            message: "File Excel trống.",
            summary: { total: 0, processed: 0, success: 0, failed: 1, progress: 100 },
            results: [],
          })
        ),
        {
          status: 400,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const results: StreamRowResult[] = [];
        let success = 0;
        let failed = 0;
        const total = rows.length;

        controller.enqueue(
          encoder.encode(
            sseLine({
              type: "start",
              message: preview ? "Bắt đầu kiểm tra file sát hạch..." : "Bắt đầu import sát hạch...",
              summary: {
                total,
                processed: 0,
                success: 0,
                failed: 0,
                progress: 0,
              },
            })
          )
        );

        for (let i = 0; i < rows.length; i++) {
          const rowNumber = i + 2;
          const row = rows[i];

          try {
            const maDk = normalizeMaDK(getCell(row, ["ma dk", "ma_dk", "madk"]));

            if (!maDk) {
              failed++;
              results.push({
                row: rowNumber,
                maDk: "",
                status: "error",
                message: "Thiếu MA_DK.",
              });
            } else {
              const student = await prisma.student.findFirst({
                where: { maDk },
                include: { examComponents: true },
              });

              if (!student) {
                failed++;
                results.push({
                  row: rowNumber,
                  maDk,
                  status: "error",
                  message: "Không tìm thấy học viên theo MA_DK.",
                });
              } else {
                const examDateFromFile = parseDate(
                  getCell(row, [
                    "ngay thi sat hach",
                    "ngay_thi_sat_hach",
                    "ngày thi sát hạch",
                    "ngay_thi_sh",
                  ])
                );

                const examDateFallback = examDateFallbackRaw ? parseDate(examDateFallbackRaw) : null;
                const examDate = examDateFromFile || examDateFallback;

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

                const hasAnyStatus = Object.values(statuses).some(Boolean);

                if (!hasAnyStatus) {
                  failed++;
                  results.push({
                    row: rowNumber,
                    maDk,
                    status: "error",
                    message:
                      "Không có dữ liệu kết quả nào trong các cột Lý thuyết / Mô phỏng / Hình / Đường.",
                  });
                } else {
                  const needExamDate = Object.values(statuses).includes("Đạt");

                  if (needExamDate && !examDate) {
                    failed++;
                    results.push({
                      row: rowNumber,
                      maDk,
                      status: "error",
                      message: "Có nội dung Đạt nhưng thiếu ngày thi sát hạch hợp lệ.",
                    });
                  } else {
                    if (!preview) {
                      const componentDefs = [
                        { tenNoiDung: "Lý thuyết", status: statuses.lyThuyet },
                        { tenNoiDung: "Mô phỏng", status: statuses.moPhong },
                        { tenNoiDung: "Hình", status: statuses.hinh },
                        { tenNoiDung: "Đường", status: statuses.duong },
                      ] as const;

                      for (const item of componentDefs) {
                        const oldComponent = student.examComponents.find(
                          (c) => c.tenNoiDung.toLowerCase() === item.tenNoiDung.toLowerCase()
                        );

                        if (item.status === "Đạt") {
                          const ngayDat = examDate as Date;
                          const baoLuuDenNgay = addOneYear(ngayDat);

                          if (oldComponent) {
                            await prisma.examComponent.update({
                              where: { id: oldComponent.id },
                              data: {
                                tenNoiDung: item.tenNoiDung,
                                ngayDat,
                                baoLuuDenNgay,
                                conHieuLuc: true,
                                ghiChu: `Đạt ngày ${formatDateVN(
                                  ngayDat
                                )}, bảo lưu đến ${formatDateVN(baoLuuDenNgay)}`,
                              },
                            });
                          } else {
                            await prisma.examComponent.create({
                              data: {
                                studentId: student.id,
                                tenNoiDung: item.tenNoiDung,
                                ngayDat,
                                baoLuuDenNgay,
                                conHieuLuc: true,
                                ghiChu: `Đạt ngày ${formatDateVN(
                                  ngayDat
                                )}, bảo lưu đến ${formatDateVN(baoLuuDenNgay)}`,
                              },
                            });
                          }
                        } else if (item.status === "Không đạt" || item.status === "Vắng") {
                          if (oldComponent) {
                            const stillValid = isComponentStillValid(oldComponent, examDate);
                            if (!stillValid && oldComponent.conHieuLuc !== false && oldComponent.baoLuuDenNgay) {
                              await prisma.examComponent.update({
                                where: { id: oldComponent.id },
                                data: {
                                  conHieuLuc: false,
                                  ghiChu: `Hết hiệu lực bảo lưu ngày ${formatDateVN(
                                    oldComponent.baoLuuDenNgay
                                  )}`,
                                },
                              });
                            }
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
                      const finalNote = note
                        ? `${ghiChuBaoLuu}${ghiChuBaoLuu ? " | " : ""}${note}`
                        : ghiChuBaoLuu;

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
                          ghiChu: finalNote,
                        },
                      });
                    }

                    success++;
                    results.push({
                      row: rowNumber,
                      maDk,
                      status: "success",
                      message: preview
                        ? "Dữ liệu hợp lệ, sẵn sàng import sát hạch."
                        : "Đã import sát hạch thành công.",
                    });
                  }
                }
              }
            }
          } catch (error) {
            failed++;
            results.push({
              row: rowNumber,
              maDk: "",
              status: "error",
              message:
                error instanceof Error ? error.message : "Lỗi không xác định khi xử lý dòng.",
            });
          }

          const processed = i + 1;
          const progress = Math.round((processed / total) * 100);
          const lastResult = results[results.length - 1];

          controller.enqueue(
            encoder.encode(
              sseLine({
                type: "progress",
                rowResult: lastResult,
                summary: {
                  total,
                  processed,
                  success,
                  failed,
                  progress,
                },
              })
            )
          );
        }

        controller.enqueue(
          encoder.encode(
            sseLine({
              type: "done",
              ok: failed === 0,
              message: preview ? "Kiểm tra file sát hạch hoàn tất." : "Import sát hạch hoàn tất.",
              summary: {
                total,
                processed: total,
                success,
                failed,
                progress: 100,
              },
              results,
            })
          )
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      encoder.encode(
        sseLine({
          type: "done",
          ok: false,
          message: error instanceof Error ? error.message : "Lỗi import sát hạch.",
          summary: { total: 0, processed: 0, success: 0, failed: 1, progress: 100 },
          results: [],
        })
      ),
      {
        status: 500,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  }
}