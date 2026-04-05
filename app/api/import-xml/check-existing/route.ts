import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const maDkList = Array.isArray(body?.maDkList) ? body.maDkList : [];

    const cleaned = maDkList
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (cleaned.length === 0) {
      return NextResponse.json({
        ok: true,
        existingMaDkList: [],
      });
    }

    const students = await prisma.student.findMany({
      where: {
        maDk: {
          in: cleaned,
        },
      },
      select: {
        maDk: true,
      },
    });

    return NextResponse.json({
      ok: true,
      existingMaDkList: students
        .map((student) => student.maDk)
        .filter(Boolean),
    });
  } catch (error: any) {
    console.error("POST /api/import-xml/check-existing error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Không kiểm tra được MA_DK hiện có.",
      },
      { status: 500 }
    );
  }
}