import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { XMLParser } from "fast-xml-parser";

function parseDate(value?: string | null): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  if (/^\d{8}$/.test(v)) {
    const yyyy = v.slice(0, 4);
    const mm = v.slice(4, 6);
    const dd = v.slice(6, 8);
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = String(body?.url || "");
    const fileName = String(body?.fileName || "");

    if (!url) {
      return NextResponse.json(
        { error: "Thiếu URL Blob." },
        { status: 400 }
      );
    }

    const fileRes = await fetch(url, {
      cache: "no-store",
    });

    if (!fileRes.ok) {
      return NextResponse.json(
        { error: "Không đọc được file XML từ Blob." },
        { status: 400 }
      );
    }

    const xmlText = await fileRes.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false,
      trimValues: true,
    });

    const parsed = parser.parse(xmlText);
    const root = parsed?.BAO_CAO1;

    if (!root) {
      return NextResponse.json(
        { error: "Không tìm thấy BAO_CAO1 trong XML." },
        { status: 400 }
      );
    }

    const khoaHoc = root?.DATA?.KHOA_HOC;
    const nguoiLxList = toArray(root?.DATA?.NGUOI_LXS?.NGUOI_LX);

    if (!khoaHoc) {
      return NextResponse.json(
        { error: "Không tìm thấy KHOA_HOC trong XML." },
        { status: 400 }
      );
    }

    const maKhoaHoc = String(khoaHoc?.MA_KHOA_HOC || "").trim();
    const tenKhoaHoc = String(khoaHoc?.TEN_KHOA_HOC || "").trim();

    if (!maKhoaHoc) {
      return NextResponse.json(
        { error: "Thiếu MA_KHOA_HOC trong XML." },
        { status: 400 }
      );
    }

    const maDkList = nguoiLxList
      .map((item) => String(item?.MA_DK || "").trim())
      .filter(Boolean);

    const existingStudents = maDkList.length
      ? await prisma.student.findMany({
          where: {
            maDk: {
              in: maDkList,
            },
          },
          select: {
            maDk: true,
          },
        })
      : [];

    const existingSet = new Set(
      existingStudents.map((student) => student.maDk).filter(Boolean)
    );

    let missingMaDk = 0;
    let willCreate = 0;
    let willUpdate = 0;
    const previewErrors: string[] = [];

    const previewRows = nguoiLxList.slice(0, 20).map((item) => {
      const maDk = String(item?.MA_DK || "").trim();
      const hoVaTen = String(item?.HO_VA_TEN || "").trim();
      const soCmt = String(item?.SO_CMT || "").trim();
      const ngaySinh = parseDate(item?.NGAY_SINH);

      let status: "create" | "update" | "invalid" = "create";

      if (!maDk) {
        status = "invalid";
        missingMaDk++;
      } else if (existingSet.has(maDk)) {
        status = "update";
        willUpdate++;
      } else {
        status = "create";
        willCreate++;
      }

      return {
        maDk: maDk || "-",
        hoVaTen: hoVaTen || "-",
        soCmt: soCmt || "-",
        ngaySinh: ngaySinh ? ngaySinh.toISOString().slice(0, 10) : "-",
        status,
      };
    });

    if (nguoiLxList.length > 20) {
      for (const item of nguoiLxList.slice(20)) {
        const maDk = String(item?.MA_DK || "").trim();
        if (!maDk) {
          missingMaDk++;
          continue;
        }
        if (existingSet.has(maDk)) {
          willUpdate++;
        } else {
          willCreate++;
        }
      }
    }

    if (missingMaDk > 0) {
      previewErrors.push(`Có ${missingMaDk} học viên thiếu MA_DK.`);
    }

    return NextResponse.json({
      ok: true,
      fileName,
      course: {
        maKhoaHoc,
        tenKhoaHoc,
        hangDaoTao: khoaHoc?.MA_HANG_DAO_TAO || khoaHoc?.HANG_GPLX || null,
        ngayKhaiGiang: parseDate(khoaHoc?.NGAY_KHAI_GIANG),
        ngayBeGiang: parseDate(khoaHoc?.NGAY_BE_GIANG),
      },
      summary: {
        total: nguoiLxList.length,
        willCreate,
        willUpdate,
        invalid: missingMaDk,
      },
      previewRows,
      errors: previewErrors,
    });
  } catch (error: any) {
    console.error("POST /api/import-xml/preview error:", error);

    return NextResponse.json(
      { error: error?.message || "Không preview được file XML." },
      { status: 500 }
    );
  }
}