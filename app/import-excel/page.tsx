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

    setLoading(true);
    setResult(null);

    try {
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
        message: "Có lỗi xảy ra khi upload file.",
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

      <div className="card" style={{ padding: 20 }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="excel-file"
              style={{ display: "block", fontWeight: 600, marginBottom: 8 }}
            >
              Chọn file Excel
            </label>
            <input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
              }}
            />
          </div>

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              Cột bắt buộc nên có:
            </div>
            <div>
              MA_DK | Họ và tên | Ngày sinh | CCCD / Số CMT | Khóa học | Tên
              khóa học
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
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
              border: `1px solid ${result.ok ? "#86efac" : "#fca5a5"}`,
              background: result.ok ? "#f0fdf4" : "#fef2f2",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
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
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  Chi tiết dòng lỗi:
                </div>
                <ul style={{ paddingLeft: 18, margin: 0 }}>
                  {result.skipped.map((item, index) => (
                    <li key={index}>{item}</li>
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