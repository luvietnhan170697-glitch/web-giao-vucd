"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DownloadIcon,
  FileIcon,
  HomeIcon,
  UploadIcon,
  UsersIcon,
} from "./icons";

const menus = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/students", label: "Danh sách học viên", icon: UsersIcon },
  { href: "/import-xml", label: "Import XML", icon: UploadIcon },
  { href: "/import-graduation", label: "Import tốt nghiệp", icon: FileIcon },
  { href: "/import-practical", label: "Import sát hạch", icon: FileIcon },
  { href: "/export-ma-dk", label: "Export MA_DK", icon: DownloadIcon },
{ href: "/import-update", label: "Import cập nhật thông tin", icon: FileIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

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
        {menus.map((item) => {
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
              }}
            >
              <Icon className="h-5 w-5" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}