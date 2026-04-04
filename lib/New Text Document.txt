import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    user,
  };
}