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

function normalizeResult(value: unknown): string | null {
  const raw = cleanString(value).toLowerCase();
  if (!raw) return null;

  if (["đạt", "dat", "pass", "passed"].includes(raw)) return "DAT";
  if (
    ["rớt", "rot", "trượt", "truot", "fail", "failed", "không đạt", "khong dat"].includes(raw)
  ) {
    return "ROT";
  }
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
    return { ketQua: "DAT", noiDungRot: null as string | null };
  }

  if (failed.length > 0) {
    return { ketQua: "KHONG_DAT", noiDungRot: failed.join("-") };
  }

  return { ketQua: null as string | null, noiDungRot: null as string | null };
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

    if (!(file instanceof File)) {
      return new Response(
        encoder.encode(
          sseLine({
            type: "done",
            ok: false,
            message: "Chưa chọn file Excel.",
            summary: { total: 0, success: 0, failed: 1, progress: 100 },
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
            summary: { total: 0, success: 0, failed: 1, progress: 100 },
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
            summary: { total: 0, success: 0, failed: 1, progress: 100 },
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

            const lyThuyet = normalizeResult(
              getCell(row, ["ly thuyet", "ly_thuyet", "lý thuyết"])
            );

            const moPhong = normalizeResult(
              getCell(row, ["mo phong", "mo_phong", "mô phỏng"])
            );

            const hinh = normalizeResult(getCell(row, ["hinh", "hình"]));
            const duong = normalizeResult(getCell(row, ["duong", "đường"]));

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
                  results.push({
                    row: rowNumber,
                    maDk,
                    status: "success",
                    message: preview
                      ? "Dữ liệu hợp lệ, sẵn sàng import."
                      : "Đã import thành công.",
                  });
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
          summary: { total: 0, success: 0, failed: 1, progress: 100 },
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