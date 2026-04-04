"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";

type ProcessResult = {
  ok?: boolean;
  message?: string;
  total?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  error?: string;
};

export default function ImportXmlPage() {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessResult | null>(null);

  async function handleImport() {
    if (!file) {
      alert("Vui lòng chọn file XML trước.");
      return;
    }

    try {
      setUploading(true);
      setProcessing(false);
      setProgress(0);
      setResult(null);

      const safeName = file.name.replace(/\s+/g, "-");
      const pathname = `imports/xml/${Date.now()}-${safeName}`;

      const blob = await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload-xml",
        multipart: true,
        clientPayload: JSON.stringify({
          originalName: file.name,
          note,
        }),
        onUploadProgress: ({ percentage }) => {
          setProgress(Math.round(percentage));
        },
      });

      setUploading(false);
      setProcessing(true);

      const res = await fetch("/api/import-xml/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pathname: blob.pathname,
          note,
          originalName: file.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Xử lý XML thất bại");
      }

      setResult(data);
    } catch (error: any) {
      setResult({
        error: error?.message || "Có lỗi xảy ra khi import XML",
      });
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  }

  function handleClear() {
    setFile(null);
    setNote("");
    setProgress(0);
    setResult(null);

    const input = document.getElementById("xml-file-input") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  const busy = uploading || processing;

  return (
    <DashboardShell>
      <Header
        title="Import XML"
        subtitle="Upload file XML lớn qua Blob rồi xử lý trên server."
      />

      <section className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Tải file XML</h2>
          <p className="page-subtitle">
            File sẽ được upload trực tiếp lên Blob để tránh lỗi giới hạn dung lượng.
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
              className="btn btn-primary"
              onClick={handleImport}
              disabled={busy || !file}
            >
              {uploading
                ? `Đang upload ${progress}%...`
                : processing
                ? "Đang xử lý XML..."
                : "Bắt đầu import"}
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleClear}
              disabled={busy}
            >
              Xóa chọn
            </button>
          </div>

          {(uploading || processing) && (
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  height: 10,
                  background: "#e2e8f0",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${uploading ? progress : 100}%`,
                    height: "100%",
                    background: "var(--primary)",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
              <div style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
                {uploading
                  ? `Đang upload file lên Blob: ${progress}%`
                  : "Upload xong, đang xử lý dữ liệu XML..."}
              </div>
            </div>
          )}
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