import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/password";
import { setSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập và mật khẩu" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Sai tên đăng nhập hoặc mật khẩu" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Tài khoản đã bị khóa" },
        { status: 403 }
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Sai tên đăng nhập hoặc mật khẩu" },
        { status: 401 }
      );
    }

    await setSession({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });

    return NextResponse.json({
      message: "Đăng nhập thành công",
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Lỗi đăng nhập" },
      { status: 500 }
    );
  }
}