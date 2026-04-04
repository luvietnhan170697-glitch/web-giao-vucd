"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Đăng nhập thất bại");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8fafc",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          border: "1px solid #e2e8f0",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>Đăng nhập hệ thống</h1>
        <p style={{ color: "#64748b", marginTop: 8 }}>
          Nhập tài khoản để truy cập dữ liệu học viên.
        </p>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 14, marginTop: 20 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              Tên đăng nhập
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập username"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                padding: "0 12px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                padding: "0 12px",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                color: "#b91c1c",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: 10,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 44,
              borderRadius: 10,
              border: "none",
              background: "#0f766e",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </main>
  );
}