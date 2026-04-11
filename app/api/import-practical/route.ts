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

function normalizeExamStatus(value: unknown): ComponentState {
  const v = normalizeValue(value).toLowerCase();

  if (!v) return null;
  if (v === "đạt" || v === "dat") return "DAT";

  if (
    v === "không đạt" ||
    v === "khong dat" ||
    v === "rớt" ||
    v === "rot" ||
    v === "trượt" ||
    v === "truot"
  ) {
    return "ROT";
  }

  if (v === "vắng" || v === "vang") return "VANG";
  return null;
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
  examDate: Date
) {
  if (!component.ngayDat || !component.baoLuuDenNgay) return false;
  if (component.conHieuLuc === false) return false;
  return examDate.getTime() <= component.baoLuuDenNgay.getTime();
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
    return { ketQua: "Đạt", noiDungRot: "" };
  }

  if (failedCodes.length > 0) {
    return { ketQua: "Không đạt", noiDungRot: failedCodes.join("-") };
  }

  return { ketQua: "Không đạt", noiDungRot: "" };
}

function getValidPracticalCarry(
  components: Array<{
    tenNoiDung: string;
    ngayDat: Date | null;
    baoLuuDenNgay: Date | null;
    conHieuLuc: boolean;
  }>,
  examDate: Date
): ResultStateMap {
  const result: ResultStateMap = {
    lyThuyet: null,
    moPhong: null,
    hinh: null,
    duong: null,
  };

  for (const item of components) {
    if (!isComponentStillValid(item, examDate)) continue;

    const key = item.tenNoiDung.toLowerCase();
    if (key === "lý thuyết") result.lyThuyet = "DAT";
    if (key === "mô phỏng") result.moPhong = "DAT";
    if (key === "hình") result.hinh = "DAT";
    if (key === "đường") result.duong = "DAT";
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

function buildProtectionNote(
  componentMap: Map<string, { ngayDat: Date | null; baoLuuDenNgay: Date | null; conHieuLuc: boolean }>
) {
  const order = [
    { key: "lý thuyết", code: "L" },
    { key: "mô phỏng", code: "M" },
    { key: "hình", code: "H" },
    { key: "đường", code: "Đ" },
  ];

  const notes: string[] = [];

  for (const item of order) {
    const comp = componentMap.get(item.key);

    if (!comp?.ngayDat || !comp.baoLuuDenNgay || comp.conHieuLuc === false) {
      notes.push(`${item.code}: chưa đạt`);
      continue;
    }

    notes.push(`${item.code}: còn hạn ${formatDateVN(comp.baoLuuDenNgay)}`);
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
    const force = formData.get("force") === "1";

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

            const incomingState: ResultStateMap = {
              lyThuyet: normalizeExamStatus(getCell(row, ["ly_thuyet", "ly thuyet", "lý thuyết"])),
              moPhong: normalizeExamStatus(getCell(row, ["mo_phong", "mo phong", "mô phỏng"])),
              hinh: normalizeExamStatus(getCell(row, ["hinh", "hình"])),
              duong: normalizeExamStatus(getCell(row, ["duong", "đường"])),
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

                if (!examDate) {
                  failed++;
                  results.push({
                    row: rowNumber,
                    maDk,
                    status: "error",
                    message: "Thiếu ngày thi sát hạch hợp lệ trong file và cũng không có ngày dự phòng.",
                  });
                } else {
                  const carry = getValidPracticalCarry(student.examComponents, examDate);
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
                    if (!preview) {
                      const componentMap = new Map(
                        student.examComponents.map((item) => [item.tenNoiDung.toLowerCase(), item])
                      );

                      const componentDefs = [
                        { key: "lý thuyết", state: effective.lyThuyet, incoming: incomingState.lyThuyet, label: "Lý thuyết" },
                        { key: "mô phỏng", state: effective.moPhong, incoming: incomingState.moPhong, label: "Mô phỏng" },
                        { key: "hình", state: effective.hinh, incoming: incomingState.hinh, label: "Hình" },
                        { key: "đường", state: effective.duong, incoming: incomingState.duong, label: "Đường" },
                      ] as const;

                      for (const item of componentDefs) {
                        const oldComp = componentMap.get(item.key);

                        if (item.state === "DAT") {
                          if (item.incoming === "DAT") {
                            const ngayDat = examDate;
                            const baoLuuDenNgay = addOneYear(ngayDat);

                            if (oldComp) {
                              await prisma.examComponent.update({
                                where: { id: oldComp.id },
                                data: {
                                  tenNoiDung: item.label,
                                  ngayDat,
                                  baoLuuDenNgay,
                                  conHieuLuc: true,
                                  ghiChu: `Đạt ngày ${formatDateVN(ngayDat)}, bảo lưu đến ${formatDateVN(baoLuuDenNgay)}`,
                                },
                              });
                              componentMap.set(item.key, {
                                ...oldComp,
                                ngayDat,
                                baoLuuDenNgay,
                                conHieuLuc: true,
                              });
                            } else {
                              const created = await prisma.examComponent.create({
                                data: {
                                  studentId: student.id,
                                  tenNoiDung: item.label,
                                  ngayDat,
                                  baoLuuDenNgay,
                                  conHieuLuc: true,
                                  ghiChu: `Đạt ngày ${formatDateVN(ngayDat)}, bảo lưu đến ${formatDateVN(baoLuuDenNgay)}`,
                                },
                              });
                              componentMap.set(item.key, created);
                            }
                          }
                        } else {
                          if (oldComp && oldComp.baoLuuDenNgay && examDate.getTime() > oldComp.baoLuuDenNgay.getTime()) {
                            if (oldComp.conHieuLuc !== false) {
                              await prisma.examComponent.update({
                                where: { id: oldComp.id },
                                data: {
                                  conHieuLuc: false,
                                  ghiChu: `Hết hiệu lực bảo lưu ngày ${formatDateVN(oldComp.baoLuuDenNgay)}`,
                                },
                              });
                            }

                            componentMap.set(item.key, {
                              ...oldComp,
                              conHieuLuc: false,
                            });
                          }
                        }
                      }

                      const noteBaoLuu = buildProtectionNote(
                        new Map(
                          Array.from(componentMap.entries()).map(([k, v]) => [
                            k,
                            {
                              ngayDat: v.ngayDat,
                              baoLuuDenNgay: v.baoLuuDenNgay,
                              conHieuLuc: v.conHieuLuc,
                            },
                          ])
                        )
                      );

                      const finalNote = note
                        ? `${noteBaoLuu}${noteBaoLuu ? " | " : ""}${note}`
                        : noteBaoLuu;

                      const validDates = Array.from(componentMap.values())
                        .filter((x) => x.ngayDat && x.baoLuuDenNgay && x.conHieuLuc)
                        .map((x) => new Date(x.ngayDat as Date));

                      const latestNgayDat =
                        validDates.length > 0
                          ? new Date(Math.max(...validDates.map((d) => d.getTime())))
                          : null;

                      const { ketQua, noiDungRot } = calcKetQua(effective);

                      await prisma.practicalExamResult.create({
                        data: {
                          studentId: student.id,
                          ngayThi: examDate,
                          ngayDat: ketQua === "Đạt" ? latestNgayDat : null,
                          ketQua,
                          noiDungRot,
                          ghiChu: finalNote,
                        },
                      });
                    }

                    success++;
                    results.push({
                      row: rowNumber,
                      maDk,
                      status: "success",
                      message: preview ? compare.message : "Đã xử lý dữ liệu sát hạch thành công.",
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