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

function getCell(row: Record<string, unknown>, acceptedKeys: string[]) {
  for (const key of Object.keys(row)) {
    const normalizedKey = key.trim().toLowerCase();
    if (acceptedKeys.includes(normalizedKey)) {
      return row[key];
    }
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json(
        { error: "Vui lòng upload file Excel" },
        { status: 400 }
      );
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
      return Response.json(
        { error: "File Excel trống" },
        { status: 400 }
      );
    }

    const maDKList = rows
      .map((row) => normalizeMaDK(getCell(row, ["ma_dk", "madk", "ma dk"])))
      .filter(Boolean);

    if (!maDKList.length) {
      return Response.json(
        {
          error: "File phải có cột ma_dk",
          debug_columns: Object.keys(rows[0] || {}),
        },
        { status: 400 }
      );
    }

    const uniqueMaDKList = [...new Set(maDKList)];

    const students = await prisma.student.findMany({
      where: {
        maDk: {
          in: uniqueMaDKList,
        },
      },
      include: {
        course: true,
        medicalChecks: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        graduationResults: {
          orderBy: { ngayThi: "desc" },
          take: 1,
        },
        practicalExams: {
          orderBy: { ngayThi: "desc" },
          take: 1,
        },
      },
    });

    const studentMap = new Map(
      students.map((student) => [normalizeMaDK(student.maDk), student])
    );

    const exportRows = maDKList.map((maDK) => {
      const student = studentMap.get(maDK);

      if (!student) {
        return {
          ma_dk: maDK,
          ho_ten: "",
          cccd: "",
          so_dien_thoai: "",
          khoa_hoc: "",
          ngay_kham_suc_khoe: "",
          ghi_chu_suc_khoe: "",
          ngay_thi_tot_nghiep: "",
          ket_qua_tot_nghiep: "",
          noi_dung_rot_tot_nghiep: "",
          ngay_thi_sat_hach: "",
          ket_qua_sat_hach: "",
          noi_dung_rot_sat_hach: "",
          ghi_chu: "Không tìm thấy học viên",
        };
      }

      const medical = student.medicalChecks?.[0];
      const graduation = student.graduationResults?.[0];
      const practical = student.practicalExams?.[0];

      return {
        ma_dk: student.maDk ?? "",
        ho_ten: student.hoVaTen ?? "",
        cccd: student.soCmt ?? "",
        so_dien_thoai: student.soDienThoai ?? "",
        khoa_hoc: student.course?.tenKhoaHoc ?? "",
        ngay_kham_suc_khoe: medical?.ngayKham
          ? new Date(medical.ngayKham).toLocaleDateString("vi-VN")
          : "",
        ghi_chu_suc_khoe: medical?.ghiChu ?? "",
        ngay_thi_tot_nghiep: graduation?.ngayThi
          ? new Date(graduation.ngayThi).toLocaleDateString("vi-VN")
          : "",
        ket_qua_tot_nghiep: graduation?.ketQua ?? "",
        noi_dung_rot_tot_nghiep: graduation?.noiDungRot ?? "",
        ngay_thi_sat_hach: practical?.ngayThi
          ? new Date(practical.ngayThi).toLocaleDateString("vi-VN")
          : "",
        ket_qua_sat_hach: practical?.ketQua ?? "",
        noi_dung_rot_sat_hach: practical?.noiDungRot ?? "",
        ghi_chu: student.ghiChu ?? "",
      };
    });

    const outWorkbook = XLSX.utils.book_new();
    const outSheet = XLSX.utils.json_to_sheet(exportRows);

    XLSX.utils.book_append_sheet(outWorkbook, outSheet, "Export_MADK");

    const outputBuffer = XLSX.write(outWorkbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new Response(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="export-ma-dk.xlsx"',
      },
    });
  } catch (error) {
    console.error("EXPORT_MADK_ERROR:", error);

    return Response.json(
      {
        error: "Lỗi export theo MA_DK",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}