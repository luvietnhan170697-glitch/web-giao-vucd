import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RawRow = Record<string, unknown>;
type CompareStatus = "new" | "same" | "update" | "conflict" | "warning";
type ComponentState = "DAT" | "ROT" | "VANG" | null;

type ResultStateMap = {
  lyThuyet: ComponentState;
  moPhong: ComponentState;
  hinh: ComponentState;
  duong: ComponentState;
};

type StreamRowResult = {
  row: number;
  maDk: string;
  status: "success" | "error";
  message: string;
  oldResult?: string | null;
  newResult?: string | null;
  compareStatus?: CompareStatus;
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
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

function normalizeResult(value: unknown): ComponentState {
  const raw = cleanString(value).toLowerCase();
  if (!raw) return null;

  if (["đạt", "dat", "pass", "passed"].includes(raw)) return "DAT";

  if (
    ["rớt", "rot", "trượt", "truot", "fail", "failed", "không đạt", "khong dat"].includes(raw)
  ) {
    return "ROT";
  }

  if (["vắng", "vang", "absent"].includes(raw)) return "VANG";

  return null;
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

function addOneYear(date: Date) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

function getExpiryDate(date?: Date | null) {
  if (!date) return null;
  return addOneYear(date);
}

function isStillValid(passDate: Date | null | undefined, examDate: Date) {
  if (!passDate) return false;
  return examDate.getTime() <= addOneYear(passDate).getTime();
}

function buildSummaryCode(state: ResultStateMap) {
  const parts: string[] = [];

  const allPassed =
    state.lyThuyet === "DAT" &&
    state.moPhong === "DAT" &&
    state.hinh === "DAT" &&
    state.duong === "DAT";

  if (allPassed) return "DAT";

  const pushCode = (value: ComponentState, pass: string, fail: string, absent: string) => {
    if (value === "DAT") parts.push(pass);
    if (value === "ROT") parts.push(fail);
    if (value === "VANG") parts.push(absent);
  };

  pushCode(state.lyThuyet, "ĐLT", "RLT", "VLT");
  pushCode(state.moPhong, "ĐMP", "RMP", "VMP");
  pushCode(state.hinh, "ĐH", "RH", "VH");
  pushCode(state.duong, "ĐĐ", "RĐ", "VĐ");

  if (parts.length === 0) return "CHUA_CO";
  return parts.join("+");
}

function countPassed(state: ResultStateMap) {
  return [state.lyThuyet, state.moPhong, state.hinh, state.duong].filter(
    (x) => x === "DAT"
  ).length;
}

function compareResult(
  oldState: ResultStateMap,
  newState: ResultStateMap,
  conflictKeys: string[]
): { status: CompareStatus; message: string } {
  const oldSummary = buildSummaryCode(oldState);
  const newSummary = buildSummaryCode(newState);

  if (conflictKeys.length > 0) {
    return {
      status: "conflict",
      message: `File mới xung đột với kết quả cũ còn hiệu lực ở: ${conflictKeys.join(", ")}.`,
    };
  }

  if (oldSummary === "CHUA_CO") {
    return { status: "new", message: "Chưa có dữ liệu trước đó." };
  }

  if (oldSummary === newSummary) {
    return { status: "same", message: "Trùng kết quả cũ." };
  }

  if (countPassed(newState) > countPassed(oldState)) {
    return { status: "update", message: "Bổ sung thêm nội dung đạt còn hiệu lực." };
  }

  return { status: "warning", message: "Kết quả thay đổi, cần kiểm tra lại." };
}

function calcKetQua(state: ResultStateMap) {
  const failedCodes: string[] = [];

  if (state.lyThuyet === "ROT" || state.lyThuyet === "VANG") failedCodes.push("L");
  if (state.moPhong === "ROT" || state.moPhong === "VANG") failedCodes.push("M");
  if (state.hinh === "ROT" || state.hinh === "VANG") failedCodes.push("H");
  if (state.duong === "ROT" || state.duong === "VANG") failedCodes.push("Đ");

  const allPassed =
    state.lyThuyet === "DAT" &&
    state.moPhong === "DAT" &&
    state.hinh === "DAT" &&
    state.duong === "DAT";

  if (allPassed) {
    return { ketQua: "DAT", noiDungRot: null as string | null };
  }

  if (failedCodes.length > 0) {
    return { ketQua: "KHONG_DAT", noiDungRot: failedCodes.join("-") };
  }

  return { ketQua: null as string | null, noiDungRot: null as string | null };
}

function getValidGraduationCarry(
  history: Array<{
    ngayThi: Date | null;
    lyThuyet: string | null;
    moPhong: string | null;
    hinh: string | null;
    duong: string | null;
  }>,
  examDate: Date
): ResultStateMap {
  const result: ResultStateMap = {
    lyThuyet: null,
    moPhong: null,
    hinh: null,
    duong: null,
  };

  for (const row of history) {
    if (!row.ngayThi) continue;

    if (result.lyThuyet === null && row.lyThuyet === "DAT" && isStillValid(row.ngayThi, examDate)) {
      result.lyThuyet = "DAT";
    }
    if (result.moPhong === null && row.moPhong === "DAT" && isStillValid(row.ngayThi, examDate)) {
      result.moPhong = "DAT";
    }
    if (result.hinh === null && row.hinh === "DAT" && isStillValid(row.ngayThi, examDate)) {
      result.hinh = "DAT";
    }
    if (result.duong === null && row.duong === "DAT" && isStillValid(row.ngayThi, examDate)) {
      result.duong = "DAT";
    }
  }

  return result;
}

function mergeWithCarry(
  carry: ResultStateMap,
  incoming: ResultStateMap
): { effective: ResultStateMap; conflicts: string[] } {
  const conflicts: string[] = [];
  const effective: ResultStateMap = {
    lyThuyet: null,
    moPhong: null,
    hinh: null,
    duong: null,
  };

  const apply = (
    key: keyof ResultStateMap,
    label: string
  ) => {
    const oldValue = carry[key];
    const newValue = incoming[key];

    if (oldValue === "DAT" && (newValue === "ROT" || newValue === "VANG")) {
      conflicts.push(label);
      effective[key] = "DAT";
      return;
    }

    if (oldValue === "DAT" && (newValue === null || newValue === "DAT")) {
      effective[key] = "DAT";
      return;
    }

    effective[key] = newValue;
  };

  apply("lyThuyet", "Lý thuyết");
  apply("moPhong", "Mô phỏng");
  apply("hinh", "Hình");
  apply("duong", "Đường");

  return { effective, conflicts };
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
    const file = formData.get("file");
    const examDateFallback = cleanString(formData.get("examDate"));
    const note = cleanString(formData.get("note"));
    const force = formData.get("force") === "1";

    if (!(file instanceof File)) {
      return new Response(
        encoder.encode(
          sseLine({
            type: "done",
            ok: false,
            message: "Chưa chọn file Excel.",
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return new Response(
        encoder.encode(
          sseLine({
            type: "done",
            ok: false,
            message: "File Excel không có sheet dữ liệu.",
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

    const sheet = workbook.Sheets[firstSheetName];
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
            message: "Không có dữ liệu trong file Excel.",
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
              message: preview ? "Bắt đầu kiểm tra file tốt nghiệp..." : "Bắt đầu import tốt nghiệp...",
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
            const maDk = cleanString(
              getCell(row, ["ma dk", "ma_dk", "mã dk", "mã đăng ký"])
            );

            const ngayThiRaw = getCell(row, [
              "ngay thi tot nghiep",
              "ngay_thi_tot_nghiep",
              "ngày thi tốt nghiệp",
              "ngay thi",
            ]);

            const incomingState: ResultStateMap = {
              lyThuyet: normalizeResult(getCell(row, ["ly thuyet", "ly_thuyet", "lý thuyết"])),
              moPhong: normalizeResult(getCell(row, ["mo phong", "mo_phong", "mô phỏng"])),
              hinh: normalizeResult(getCell(row, ["hinh", "hình"])),
              duong: normalizeResult(getCell(row, ["duong", "đường"])),
            };

            if (!maDk) {
              failed++;
              results.push({
                row: rowNumber,
                maDk: "",
                status: "error",
                message: "Thiếu MA_DK.",
              });
            } else {
              const student = await prisma.student.findUnique({
                where: { maDk },
                select: { id: true },
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
                const ngayThiFromFile = excelDateToDate(ngayThiRaw);
                const ngayThiFallback = examDateFallback ? excelDateToDate(examDateFallback) : null;
                const ngayThi = ngayThiFromFile || ngayThiFallback;

                if (!ngayThi) {
                  failed++;
                  results.push({
                    row: rowNumber,
                    maDk,
                    status: "error",
                    message: "Thiếu ngày thi hợp lệ trong file và cũng không có ngày dự phòng.",
                  });
                } else {
                  const history = await prisma.graduationResult.findMany({
                    where: { studentId: student.id },
                    orderBy: [{ ngayThi: "desc" }, { createdAt: "desc" }],
                    select: {
                      ngayThi: true,
                      lyThuyet: true,
                      moPhong: true,
                      hinh: true,
                      duong: true,
                    },
                  });

                  const carry = getValidGraduationCarry(history, ngayThi);
                  const { effective, conflicts } = mergeWithCarry(carry, incomingState);

                  const oldResult = buildSummaryCode(carry);
                  const newResult = buildSummaryCode(effective);
                  const compare = compareResult(carry, effective, conflicts);

                  if (!preview && compare.status === "conflict" && !force) {
                    failed++;
                    results.push({
                      row: rowNumber,
                      maDk,
                      status: "error",
                      message: "Xung đột với kết quả cũ còn hiệu lực. Cần tick xác nhận để import tiếp.",
                      oldResult,
                      newResult,
                      compareStatus: compare.status,
                    });
                  } else {
                    const { ketQua, noiDungRot } = calcKetQua(effective);

                    if (!preview) {
                      await prisma.graduationResult.create({
                        data: {
                          studentId: student.id,
                          ngayThi,
                          lyThuyet: effective.lyThuyet,
                          moPhong: effective.moPhong,
                          hinh: effective.hinh,
                          duong: effective.duong,
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
                    results.push({
                      row: rowNumber,
                      maDk,
                      status: "success",
                      message: preview ? compare.message : "Đã xử lý dữ liệu tốt nghiệp thành công.",
                      oldResult,
                      newResult,
                      compareStatus: compare.status,
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
              message: preview
                ? "Kiểm tra file tốt nghiệp hoàn tất."
                : "Import kết quả tốt nghiệp hoàn tất.",
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
          message: error instanceof Error ? error.message : "Import tốt nghiệp thất bại.",
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