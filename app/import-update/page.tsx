"use client";

import { useState } from "react";
import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";

type ImportResult = {
  message?: string;
  total?: number;
  success?: number;
  failed?: number;
  errors?: { row: number; error: string }[];
  error?: string;
};

export default function ImportUpdatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
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
        </div>

        <div className="card-body">
          {!result && (
            <div style={{ color: "#64748b", fontSize: 14 }}>
              Chưa có dữ liệu xử lý.
            </div>
          )}

          {result?.error && (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontSize: 14,
              }}
            >
              {result.error}
            </div>
          )}

          {result && !result.error && (
            <div style={{ display: "grid", gap: 16 }}>
              <div className="form-grid">
                <div className="card" style={{ padding: 16 }}>
                  <div className="label">Tổng dòng</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    {result.total ?? 0}
                  </div>
                </div>

                <div className="card" style={{ padding: 16 }}>
                  <div className="label">Thành công</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#166534" }}>
                    {result.success ?? 0}
                  </div>
                </div>

                <div className="card" style={{ padding: 16 }}>
                  <div className="label">Thất bại</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#b91c1c" }}>
                    {result.failed ?? 0}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: 14,
                  color: "#334155",
                }}
              >
                {result.message || "Đã xử lý xong file cập nhật."}
              </div>

              {result.errors && result.errors.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>
                    Danh sách lỗi
                  </div>

                  <div
                    style={{
                      maxHeight: 320,
                      overflow: "auto",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th
                            style={{
                              textAlign: "left",
                              padding: 10,
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Dòng
                          </th>
                          <th
                            style={{
                              textAlign: "left",
                              padding: 10,
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Nội dung lỗi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((item, index) => (
                          <tr key={`${item.row}-${index}`}>
                            <td
                              style={{
                                padding: 10,
                                borderBottom: "1px solid #f1f5f9",
                                width: 100,
                              }}
                            >
                              {item.row}
                            </td>
                            <td
                              style={{
                                padding: 10,
                                borderBottom: "1px solid #f1f5f9",
                              }}
                            >
                              {item.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}