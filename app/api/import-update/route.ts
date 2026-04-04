import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

function parseExcelDate(value: any): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return null;
    return new Date(date.y, date.m - 1, date.d);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parts = trimmed.split("/");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function add12Months(date: Date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 12);
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Không có file upload" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      return NextResponse.json({ error: "File không có sheet dữ liệu" }, { status: 400 });
    }

    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    let success = 0;
    let failed = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const maDk = row["ma_dk"]?.toString().trim();

        if (!maDk) {
          failed++;
          errors.push({ row: i + 2, error: "Thiếu MA_DK" });
          continue;
        }

        const student = await prisma.student.findUnique({
          where: { maDk },
        });

        if (!student) {
          failed++;
          errors.push({ row: i + 2, error: `Không tìm thấy học viên với MA_DK: ${maDk}` });
          continue;
        }

        const updateData: any = {};

        if (row["so_dien_thoai"] !== undefined && row["so_dien_thoai"] !== null && row["so_dien_thoai"] !== "") {
          updateData.soDienThoai = String(row["so_dien_thoai"]).trim();
        }

        if (row["giao_vien"] !== undefined && row["giao_vien"] !== null && row["giao_vien"] !== "") {
          updateData.giaoVien = String(row["giao_vien"]).trim();
        }

        if (row["ctv"] !== undefined && row["ctv"] !== null && row["ctv"] !== "") {
          updateData.ctv = String(row["ctv"]).trim();
        }

        if (row["ghi_chu"] !== undefined && row["ghi_chu"] !== null && row["ghi_chu"] !== "") {
          updateData.ghiChu = String(row["ghi_chu"]).trim();
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.student.update({
            where: { id: student.id },
            data: updateData,
          });
        }

        const ngayKham = parseExcelDate(row["ngay_kham_suc_khoe"]);

        if (ngayKham) {
          const ngayHetHan = add12Months(ngayKham);

          await prisma.medicalCheck.create({
            data: {
              studentId: student.id,
              ngayKham,
              ngayHetHan,
            },
          });
        }

        success++;
      } catch (err: any) {
        failed++;
        errors.push({
          row: i + 2,
          error: err?.message || "Lỗi không xác định",
        });
      }
    }

    return NextResponse.json({
      message: "Import update hoàn tất",
      total: rows.length,
      success,
      failed,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Lỗi import update" },
      { status: 500 }
    );
  }
}