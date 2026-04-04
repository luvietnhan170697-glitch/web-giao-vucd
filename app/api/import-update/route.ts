import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

function parseExcelDate(value: any): Date | null {
  if (!value) return null;

  // Excel number date
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d);
  }

  // string dd/mm/yyyy
  if (typeof value === "string") {
    const parts = value.split("/");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }

    const d = new Date(value);
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
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Không có file upload" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    let success = 0;
    let failed = 0;
    const errors: any[] = [];

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
          errors.push({ row: i + 2, error: "Không tìm thấy học viên" });
          continue;
        }

        // ===== update student =====
        const updateData: any = {};

        if (row["so_dien_thoai"]) {
          updateData.soDienThoai = String(row["so_dien_thoai"]);
        }

        if (row["giao_vien"]) {
          updateData.giaoVien = String(row["giao_vien"]);
        }

        if (row["ctv"]) {
          updateData.ctv = String(row["ctv"]);
        }

        if (row["ghi_chu"]) {
          updateData.ghiChu = String(row["ghi_chu"]);
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.student.update({
            where: { id: student.id },
            data: updateData,
          });
        }

        // ===== medical check =====
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
          error: err.message,
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