"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        width: "100%",
        height: 40,
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.15)",
        background: "transparent",
        color: "#fff",
        cursor: "pointer",
      }}
    >
      Đăng xuất
    </button>
  );
}