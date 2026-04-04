"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DownloadIcon,
  FileIcon,
  HomeIcon,
  UploadIcon,
  UsersIcon,
} from "./icons";

type CurrentUser = {
  id: string;
  username: string;
  fullName?: string | null;
  role: string;
};

const menus = [
  { href: "/", label: "Dashboard", icon: HomeIcon, roles: ["admin", "staff", "viewer"] },
  { href: "/students", label: "Danh sách học viên", icon: UsersIcon, roles: ["admin", "staff", "viewer"] },
  { href: "/import-xml", label: "Import XML", icon: UploadIcon, roles: ["admin", "staff"] },
  { href: "/import-graduation", label: "Import tốt nghiệp", icon: FileIcon, roles: ["admin", "staff"] },
  { href: "/import-practical", label: "Import sát hạch", icon: FileIcon, roles: ["admin", "staff"] },
  { href: "/export-ma-dk", label: "Export MA_DK", icon: DownloadIcon, roles: ["admin", "staff"] },
  { href: "/import-update", label: "Import cập nhật thông tin", icon: FileIcon, roles: ["admin", "staff"] },
  { href: "/users", label: "Quản lý tài khoản", icon: UsersIcon, roles: ["admin"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          setUser(null);
          return;
        }

        const data = await res.json();
        setUser(data.user || null);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    }

    loadMe();
  }, []);

  const filteredMenus = useMemo(() => {
    if (!user?.role) return [];
    return menus.filter((item) => item.roles.includes(user.role));
  }, [user]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <aside
      style={{
        width: 260,
        background: "var(--sidebar)",
        color: "var(--sidebar-foreground)",
        minHeight: "100vh",
        padding: 20,
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "linear-gradient(135deg, #14b8a6, #0f766e)",
            display: "grid",
            placeItems: "center",
            fontSize: 20,
            fontWeight: 800,
            color: "white",
            marginBottom: 12,
          }}
        >
          GV
        </div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Hệ thống Giáo vụ</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
          Quản lý học viên và dữ liệu đào tạo
        </div>
      </div>

      <nav style={{ display: "grid", gap: 8 }}>
        {!loadingUser &&
          filteredMenus.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: active ? "#1e293b" : "transparent",
                  color: active ? "white" : "#cbd5e1",
                  border: active ? "1px solid #334155" : "1px solid transparent",
                  transition: "0.2s ease",
                  textDecoration: "none",
                }}
              >
                <Icon className="h-5 w-5" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
              </Link>
            );
          })}
      </nav>

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <div
          style={{
            borderTop: "1px solid rgba(148, 163, 184, 0.2)",
            paddingTop: 16,
          }}
        >
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>
            Đăng nhập bằng
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
            {user?.fullName || user?.username || "Chưa xác định"}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, marginBottom: 12 }}>
            Quyền: {user?.role || "unknown"}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: "100%",
              height: 40,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
}