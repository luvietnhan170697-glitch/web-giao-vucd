"use client";

import { useState } from "react";
import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";

export default function ImportUpdatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!file) return;

    try {
      setLoading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import-update", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message || "Có lỗi xảy ra" });
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setFile(null);
    setResult(null);
  }

  return (
    <DashboardShell>
      <Header
        title="Import cập nhật"
        subtitle="Upload file Excel để cập nhật số điện thoại, ngày khám sức khỏe, giáo viên, CTV, ghi chú..."
      />

      <section className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Tải file cập nhật</h2>
          <p className="page-subtitle">
            File hỗ trợ các cột như: ma_dk, so_dien_thoai, ngay_kham_suc_khoe,
            GIAO VIEN, CTV, ghi_chu.
          </p>
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div>
              <label className="label">Chọn file Excel</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div>
              <label className="label">Tên file đang chọn</label>
              <input
                className="input"
                value={file ? file.name : ""}
                placeholder="Chưa chọn file"
                readOnly
              />
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!file || loading}
            >
              {loading ? "Đang xử lý..." : "Upload file cập nhật"}
            </button>

            <button
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
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {result ? JSON.stringify(result, null, 2) : "Chưa có dữ liệu"}
          </pre>
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Gợi ý định dạng file</h2>
        </div>

        <div className="card-body">
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Cột bắt buộc nên có: <b>ma_dk</b>.</li>
            <li>Các cột có thể cập nhật: <b>so_dien_thoai</b>, <b>ngay_kham_suc_khoe</b>, <b>GIAO VIEN</b>, <b>CTV</b>, <b>ghi_chu</b>.</li>
            <li>Ngày nên nhập theo dạng ngày Excel chuẩn hoặc dd/mm/yyyy.</li>
            <li>Mỗi dòng tương ứng một học viên theo MA_DK.</li>
          </ul>
        </div>
      </section>
    </DashboardShell>
  );
}