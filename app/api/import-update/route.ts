import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

function parseDate(value?: string | null): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function addOneYear(date: Date) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Chưa chọn file Excel" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    let success = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const maDk = row.ma_dk ? String(row.ma_dk).trim() : "";

        if (!maDk) {
          errors.push("Thiếu ma_dk");
          continue;
        }

        const student = await prisma.student.findUnique({
          where: { maDk },
        });

        if (!student) {
          errors.push(`Không tìm thấy học viên có MA_DK: ${maDk}`);
          continue;
        }

        const soDienThoai = row.so_dien_thoai
          ? String(row.so_dien_thoai).trim()
          : null;

        const ghiChu = row.ghi_chu
          ? String(row.ghi_chu).trim()
          : null;

        const ngayKham = row.ngay_kham_suc_khoe
          ? parseDate(String(row.ngay_kham_suc_khoe))
          : null;

        await prisma.student.update({
          where: { maDk },
          data: {
            soDienThoai,
            ghiChu,
          },
        });

        if (ngayKham) {
          await prisma.medicalCheck.create({
            data: {
              studentId: student.id,
              ngayKham,
              ngayHetHan: addOneYear(ngayKham),
              ghiChu: ghiChu || "Import từ Excel",
            },
          });
        }

        success++;
      } catch (e: any) {
        errors.push(e.message);
      }
    }

    await prisma.importLog.create({
      data: {
        loaiFile: "EXCEL_UPDATE",
        tenFile: file.name,
        tongSoDong: rows.length,
        thanhCong: success,
        thatBai: errors.length,
        ghiChu: errors.length ? errors.join(" | ").slice(0, 1000) : "OK",
      },
    });

    return NextResponse.json({
      message: "Import cập nhật thành công",
      total: rows.length,
      success,
      failed: errors.length,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Lỗi import Excel cập nhật" },
      { status: 500 }
    );
  }
}