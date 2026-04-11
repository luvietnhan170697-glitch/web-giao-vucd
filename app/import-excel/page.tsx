"use client";

import { useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import Header from "@/components/header";

type ImportResult = {
  ok: boolean;
  message: string;
  totalRows?: number;
  createdCount?: number;
  updatedCount?: number;
  skippedCount?: number;
  skipped?: string[];
};

export default function ImportExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!file) {
      setResult({
        ok: false,
        message: "Vui lòng chọn file Excel.",
      });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import-excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({
        ok: false,
        message: "Có lỗi xảy ra khi upload file Excel.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell>
      <Header
        title="Import Excel"
        subtitle="Nhập dữ liệu học viên từ file Excel (.xlsx, .xls)"
      />

      <div
        className="card"
        style={{
          padding: 20,
          borderRadius: 16,
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="excel-file"
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Chọn file Excel
            </label>

            <input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] || null;
                setFile(selectedFile);
              }}
            />
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              marginBottom: 16,
              lineHeight: 1.8,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Cột nên có trong file:
            </div>
            <div>MA_DK</div>
            <div>Họ và tên</div>
            <div>Ngày sinh</div>
            <div>CCCD / Số CMT</div>
            <div>Khóa học</div>
            <div>Tên khóa học</div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 10,
              border: "none",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Đang import..." : "Import Excel"}
          </button>
        </form>

        {result && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              border: result.ok
                ? "1px solid #86efac"
                : "1px solid #fca5a5",
              background: result.ok ? "#f0fdf4" : "#fef2f2",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>
              {result.message}
            </div>

            {result.ok && (
              <div style={{ lineHeight: 1.8 }}>
                <div>Tổng số dòng: {result.totalRows ?? 0}</div>
                <div>Thêm mới: {result.createdCount ?? 0}</div>
                <div>Cập nhật: {result.updatedCount ?? 0}</div>
                <div>Bỏ qua / lỗi: {result.skippedCount ?? 0}</div>
              </div>
            )}

            {!!result.skipped?.length && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  Chi tiết dòng lỗi:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {result.skipped.map((item, index) => (
                    <li key={index} style={{ marginBottom: 4 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}