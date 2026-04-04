"use client";

import { useState } from "react";
import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";

export default function ImportXmlPage() {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleImport() {
    if (!file) {
      alert("Vui lòng chọn file XML trước.");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("note", note);

      const res = await fetch("/api/import-xml", {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const err = await res.json();
          throw new Error(err.error || err.message || "Import XML thất bại");
        } else {
          const text = await res.text();
          throw new Error(text || "Import XML thất bại");
        }
      }

      if (contentType.includes("application/json")) {
        const data = await res.json();
        setResult(data);
      } else {
        const text = await res.text();
        setResult({ message: text || "Import XML thành công" });
      }
    } catch (error: any) {
      setResult({
        error: error?.message || "Có lỗi xảy ra khi import XML",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setFile(null);
    setNote("");
    setResult(null);

    const input = document.getElementById("xml-file-input") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  return (
    <DashboardShell>
      <Header
        title="Import XML"
        subtitle="Tải file XML để thêm hoặc cập nhật dữ liệu học viên."
      />

      <section className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Tải file XML</h2>
          <p className="page-subtitle">
            Chọn file đúng định dạng để hệ thống xử lý dữ liệu.
          </p>
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div>
              <label className="label">Chọn file XML</label>
              <input
                id="xml-file-input"
                type="file"
                accept=".xml,text/xml"
                className="input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
                {file ? `Đã chọn: ${file.name}` : "Chưa chọn file"}
              </div>
            </div>

            <div>
              <label className="label">Ghi chú</label>
              <input
                className="input"
                placeholder="Ví dụ: Dữ liệu khóa tháng 4"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={loading}
            >
              {loading ? "Đang import..." : "Bắt đầu import"}
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
    </DashboardShell>
  );
}