import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "./lib/auth";
import { hasApiAccess, hasPageAccess } from "./lib/permissions";

const { pathname } = req.nextUrl;

// 🚀 BẮT BUỘC phải có đoạn này
if (pathname.startsWith("/api/blob/upload-xml")) {
  return NextResponse.next();
}
const publicPaths = ["/login", "/unauthorized"];
const publicApiPaths = ["/api/auth/login"];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Thiếu JWT_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (publicPaths.includes(pathname) || publicApiPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const role = String(payload.role || "");

    if (!role) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (pathname.startsWith("/api/")) {
      if (!hasApiAccess(role, pathname)) {
        return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
      }
      return NextResponse.next();
    }

    if (!hasPageAccess(role, pathname)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Phiên đăng nhập không hợp lệ" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};