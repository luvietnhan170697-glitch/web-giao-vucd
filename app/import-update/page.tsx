"use client";

import { useState } from "react";
import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";

export default function ImportUpdatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!file) {
      alert("Vui lòng chọn file Excel trước.");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import-update", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const err = await res.json();
          throw new Error(err.error || "Import update thất bại");
        } else {
          const text = await res.text();
          throw new Error(text || "Import update thất bại");
        }
      }

      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        error: error?.message || "Có lỗi xảy ra",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setFile(null);
    setResult(null);

    const input = document.getElementById("update-file-input") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  return (
    <DashboardShell>
      <Header
        title="Import cập nhật thông tin"
        subtitle="Upload file Excel để cập nhật số điện thoại, ngày khám sức khỏe, giáo viên, CTV và ghi chú."
      />

      <section className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Tải file cập nhật</h2>
          <p className="page-subtitle">
            File mẫu gồm các cột: ma_dk, so_dien_thoai, ngay_kham_suc_khoe, giao_vien, ctv, ghi_chu
          </p>
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div>
              <label className="label">Chọn file Excel</label>
              <input
                id="update-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
                {file ? `Đã chọn: ${file.name}` : "Chưa chọn file"}
              </div>
            </div>

            <div>
              <label className="label">Quy tắc xử lý</label>
              <div
                className="card"
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "#f8fafc",
                  fontSize: 14,
                  color: "#475569",
                  lineHeight: 1.7,
                }}
              >
                <div>- Tìm học viên theo MA_DK</div>
                <div>- Ô trống sẽ bỏ qua, không ghi đè</div>
                <div>- Ngày khám sức khỏe sẽ tạo MedicalCheck mới</div>
                <div>- Ngày hết hạn = ngày khám + 12 tháng</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!file || loading}
            >
              {loading ? "Đang xử lý..." : "Upload file cập nhật"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClear}
              disabled={loading}
            >
              Xóa chọn
            </button>
          </div>
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Kết quả xử lý</h2>
        </div