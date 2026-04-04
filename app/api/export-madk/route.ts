import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

function formatDate(value: Date | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const mode = String(formData.get("mode") || "");
    const format = String(formData.get("format") || "xlsx");
    const textValue = String(formData.get("textValue") || "");
    const file = formData.get("file") as File | null;

    let maDkList: string[] = [];

    if (mode === "ma_dk" && textValue) {
      maDkList = textValue
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
    }

    if (mode === "file" && file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

      maDkList = json
        .map((row) => String(row.ma_dk || row.MA_DK || row.maDk || "").trim())
        .filter(Boolean);
    }

    if (maDkList.length === 0) {
      return new Response("Không có dữ liệu MA_DK", { status: 400 });
    }

    const students = await prisma.student.findMany({
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const exportRows = students.map((s) => {
      const latestMedical = s.medicalChecks[0];

      return {
        ma_dk: s.maDk || "",
        so_ho_so: s.soHoSo || "",
        so_cmt: s.soCmt || "",
        ho_va_ten: s.hoVaTen || "",
        ngay_sinh: formatDate(s.ngaySinh),
        so_dien_thoai: s.soDienThoai || "",
        ghi_chu: s.ghiChu || "",
        hang_gplx: s.hangGplx || "",
        hang_dao_tao: s.hangDaoTao || "",
        ngay_nhan_ho_so: formatDate(s.ngayNhanHoSo),
        ma_khoa_hoc: s.course?.maKhoaHoc || "",
        ten_khoa_hoc: s.course?.tenKhoaHoc || "",
        ngay_kham_suc_khoe: formatDate(latestMedical?.ngayKham),
        ngay_het_han_suc_khoe: formatDate(latestMedical?.ngayHetHan),
      };
    });

    if (exportRows.length === 0) {
      return new Response("Không tìm thấy học viên phù hợp", { status: 404 });
    }

    if (format === "csv") {
      const header = Object.keys(exportRows[0]).join(",");
      const rows = exportRows.map((row) =>
        Object.values(row)
          .map((value) => {
            const str = String(value ?? "");
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      );

      const csv = [header, ...rows].join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="export-ma-dk.csv"',
        },
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DATA");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="export-ma-dk.xlsx"',
      },
    });
  } catch (error: any) {
    return new Response(error?.message || "Lỗi server", { status: 500 });
  }
}