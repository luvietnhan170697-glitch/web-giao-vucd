import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const students = await prisma.student.findMany({
    include: {
      course: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(students);
}