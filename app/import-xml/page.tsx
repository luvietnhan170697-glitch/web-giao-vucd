"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";

type PreviewRow = {
  maDk: string;
  hoVaTen: string;
  soCmt: string;
  ngaySinh: string;
  status: "create" | "update" | "invalid";
};

type PreviewResult = {
  ok?: boolean;
  error?: string;
  fileName?: string;
  course?: {
    maKhoaHoc?: string;
    tenKhoaHoc?: string;
    hangDaoTao?: string | null;
    ngayKhaiGiang?: string | null;
    ngayBeGiang?: string | null;
  };
  summary?: {
    total: number;
    willCreate: number;
    willUpdate: number;
    invalid: number;
  };
  previewRows?: PreviewRow[];
  errors?: string[];
};

type ProcessResult = {
  ok?: boolean;
  message?: string;
  total?: number;
  created?: number;
  updated?: number;
  failed?: number;
  errors?: string[];
  error?: string;
};

function statusLabel(status: PreviewRow["status"]) {
  if (status === "create") return "Mới";
  if (status === "update") return "Cập nhật";
  return "Lỗi";
}

export default function ImportXmlPage() {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");

  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  async function uploadToBlob(currentFile: File) {
    const safeName = currentFile.name.replace(/\s+/g, "-");
    const pathname = `imports/xml/${Date.now()}-${safeName}`;

    await upload(pathname, currentFile, {
      access: "private",
      handleUploadUrl: "/api/blob/upload-xml",
      multipart: true,
      clientPayload: JSON.stringify({
        originalName: currentFile.name,
        note,
      }),
      onUploadProgress: ({ percentage }) => {
        setProgress(Math.round(percentage));
      },
    });
  }

  async function handlePreview() {
    if (!file) {
      alert("Vui lòng chọn file XML trước.");
      return;
    }

    try {
      setUploading(true);
      setChecking(false);
      setProcessing(false);
      setProgress(0);
      setPreview(null);
      setResult(null);

      await uploadToBlob(file);

      setUploading(false);
      setChecking(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import-xml/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Kiểm tra XML thất bại");
      }

      setPreview(data);
    } catch (error: any) {
      setPreview({
        error: error?.message || "Có lỗi xảy ra khi kiểm tra XML",
      });
    } finally {
      setUploading(false);
      setChecking(false);
    }
  }

  async function handleImport() {
    if (!file) {
      alert("Vui lòng chọn file XML trước.");
      return;
    }

    if (!preview?.ok) {
      alert("Vui lòng kiểm tra file trước khi import.");
      return;
    }

    try {
      setProcessing(true);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("note", note);
      formData.append("originalName", file.name);

      const res = await fetch("/api/import-xml/process", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Import XML thất bại");
      }

      setResult(data);
    } catch (error: any) {
      setResult({
        error: error?.message || "Có lỗi xảy ra khi import XML",
      });
    } finally {
      setProcessing(false);
    }
  }

  function handleClear() {
    setFile(null);
    setNote("");
    setProgress(0);
    setPreview(null);
    setResult(null);

    const input = document.getElementById("xml-file-input") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  const busy = uploading || checking || processing;

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
            Kiểm tra file trước khi import chính thức để tránh lỗi dữ liệu.
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

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn btn-secondary"
              onClick={handlePreview}
              disabled={busy || !file}
            >
              {uploading
                ? `Đang upload ${progress}%...`
                : checking
                ? "Đang kiểm tra file..."
                : "Kiểm tra file"}
            </button>

            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={busy || !file || !preview?.ok}
            >
              {processing ? "Đang import..." : "Import chính thức"}
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleClear}
              disabled={busy}
            >
              Xóa chọn
            </button>
          </div>

          {(uploading || checking || processing) && (
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
                  : checking
                  ? "Upload xong, đang kiểm tra cấu trúc XML..."
                  : "Đang import dữ liệu vào database..."}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Preview trước khi import</h2>
        </div>

        <div className="card-body">
          {!preview ? (
            <div style={{ color: "#64748b" }}>Chưa có dữ liệu preview</div>
          ) : preview.error ? (
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 12,
                padding: 16,
                fontSize: 14,
                lineHeight: 1.6,
                color: "#b91c1c",
              }}
            >
              {JSON.stringify(preview, null, 2)}
            </pre>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div className="stat-card">
                  <div className="stat-title">Mã khóa</div>
                  <div className="stat-value">{preview.course?.maKhoaHoc || "-"}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Tên khóa</div>
                  <div className="stat-value">{preview.course?.tenKhoaHoc || "-"}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Tổng học viên</div>
                  <div className="stat-value">{preview.summary?.total || 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Sẽ tạo mới</div>
                  <div className="stat-value">{preview.summary?.willCreate || 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Sẽ cập nhật</div>
                  <div className="stat-value">{preview.summary?.willUpdate || 0}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">Dòng lỗi</div>
                  <div className="stat-value">{preview.summary?.invalid || 0}</div>
                </div>
              </div>

              {preview.errors && preview.errors.length > 0 && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 10,
                    background: "#fff7ed",
                    border: "1px solid #fdba74",
                    color: "#9a3412",
                    fontSize: 14,
                  }}
                >
                  {preview.errors.map((err, index) => (
                    <div key={index}>- {err}</div>
                  ))}
                </div>
              )}

              <div className="table-wrap">
                <table className="table" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th>MA_DK</th>
                      <th>Họ và tên</th>
                      <th>Ngày sinh</th>
                      <th>CCCD / Số CMT</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(preview.previewRows || []).map((row, index) => (
                      <tr key={`${row.maDk}-${index}`}>
                        <td>{row.maDk}</td>
                        <td>{row.hoVaTen}</td>
                        <td>{row.ngaySinh}</td>
                        <td>{row.soCmt}</td>
                        <td>{statusLabel(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Kết quả import chính thức</h2>
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