"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { XMLParser } from "fast-xml-parser";
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

function parseDateText(value?: string | null) {
  if (!value) return "-";

  const v = String(value).trim();
  if (!v) return "-";

  if (/^\d{8}$/.test(v)) {
    return `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`;
  }

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function statusLabel(status: PreviewRow["status"]) {
  if (status === "create") return "Mới";
  if (status === "update") return "Cập nhật";
  return "Lỗi";
}

function statusBadgeStyle(status: PreviewRow["status"]): React.CSSProperties {
  if (status === "create") {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #86efac",
    };
  }

  if (status === "update") {
    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fcd34d",
    };
  }

  return {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
  };
}

async function chunkCheckExisting(maDkList: string[]) {
  const chunkSize = 500;
  const existingSet = new Set<string>();

  for (let i = 0; i < maDkList.length; i += chunkSize) {
    const chunk = maDkList.slice(i, i + chunkSize);

    const res = await fetch("/api/import-xml/check-existing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ maDkList: chunk }),
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Không kiểm tra được MA_DK hiện có.");
    }

    for (const maDk of data.existingMaDkList || []) {
      existingSet.add(String(maDk));
    }
  }

  return existingSet;
}

export default function ImportXmlPage() {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");

  const [checking, setChecking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  async function handlePreview() {
    if (!file) {
      alert("Vui lòng chọn file XML trước.");
      return;
    }

    try {
      setChecking(true);
      setPreview(null);
      setResult(null);

      const text = await file.text();

      const parser = new XMLParser({
        ignoreAttributes: false,
        parseTagValue: false,
        trimValues: true,
      });

      const parsed = parser.parse(text);
      const root = parsed?.BAO_CAO1;
      const khoaHoc = root?.DATA?.KHOA_HOC;
      const nguoiLxList = toArray(root?.DATA?.NGUOI_LXS?.NGUOI_LX);

      if (!root) {
        throw new Error("Không tìm thấy BAO_CAO1 trong XML.");
      }

      if (!khoaHoc) {
        throw new Error("Không tìm thấy KHOA_HOC trong XML.");
      }

      const maKhoaHoc = String(khoaHoc?.MA_KHOA_HOC || "").trim();
      const tenKhoaHoc = String(khoaHoc?.TEN_KHOA_HOC || "").trim();

      if (!maKhoaHoc) {
        throw new Error("Thiếu MA_KHOA_HOC trong XML.");
      }

      const maDkList = nguoiLxList
        .map((item: any) => String(item?.MA_DK || "").trim())
        .filter(Boolean);

      const existingSet = await chunkCheckExisting(maDkList);

      let willCreate = 0;
      let willUpdate = 0;
      let invalid = 0;
      const errors: string[] = [];

      const previewRows: PreviewRow[] = nguoiLxList.slice(0, 20).map((item: any) => {
        const maDk = String(item?.MA_DK || "").trim();
        const hoVaTen = String(item?.HO_VA_TEN || "").trim();
        const soCmt = String(item?.SO_CMT || "").trim();
        const ngaySinh = parseDateText(item?.NGAY_SINH);

        let status: PreviewRow["status"] = "create";

        if (!maDk) {
          status = "invalid";
          invalid++;
        } else if (existingSet.has(maDk)) {
          status = "update";
          willUpdate++;
        } else {
          status = "create";
          willCreate++;
        }

        return {
          maDk: maDk || "-",
          hoVaTen: hoVaTen || "-",
          soCmt: soCmt || "-",
          ngaySinh,
          status,
        };
      });

      if (nguoiLxList.length > 20) {
        for (const item of nguoiLxList.slice(20)) {
          const maDk = String(item?.MA_DK || "").trim();

          if (!maDk) {
            invalid++;
            continue;
          }

          if (existingSet.has(maDk)) {
            willUpdate++;
          } else {
            willCreate++;
          }
        }
      }

      if (invalid > 0) {
        errors.push(`Có ${invalid} học viên thiếu MA_DK.`);
      }

      setPreview({
        ok: true,
        course: {
          maKhoaHoc,
          tenKhoaHoc,
          hangDaoTao: khoaHoc?.MA_HANG_DAO_TAO || khoaHoc?.HANG_GPLX || null,
          ngayKhaiGiang: khoaHoc?.NGAY_KHAI_GIANG || null,
          ngayBeGiang: khoaHoc?.NGAY_BE_GIANG || null,
        },
        summary: {
          total: nguoiLxList.length,
          willCreate,
          willUpdate,
          invalid,
        },
        previewRows,
        errors,
      });
    } catch (error: any) {
      setPreview({
        error: error?.message || "Có lỗi xảy ra khi kiểm tra XML.",
      });
    } finally {
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
      setUploading(true);
      setProgress(0);
      setResult(null);

      const safeName = file.name.replace(/\s+/g, "-");
      const pathname = `imports/xml/${Date.now()}-${safeName}`;

      const blob = await upload(pathname, file, {
        access: "public",
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

      const res = await fetch("/api/import-xml/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: blob.url,
          note,
          originalName: file.name,
        }),
      });

      const text = await res.text();
      let data: ProcessResult;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || "Import XML thất bại");
      }

      if (!res.ok) {
        throw new Error(data?.error || "Import XML thất bại");
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
    setPreview(null);
    setResult(null);
    setProgress(0);

    const input = document.getElementById("xml-file-input") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  const busy = checking || processing || uploading;

  return (
    <DashboardShell>
      <Header
        title="Import XML"
        subtitle="Kiểm tra file trước khi import chính thức để tránh lỗi dữ liệu."
      />

      <section className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Tải file XML</h2>
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div>
              <label className="label">Chọn file XML</label>
              <input
                id="xml-file-input"
                type="file"
                accept=".xml,text/xml,application/xml"
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
              {checking ? "Đang kiểm tra file..." : "Kiểm tra file"}
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

          {(checking || processing || uploading) && (
            <div style={{ marginTop: 16 }}>
              {uploading ? (
                <>
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
                        width: `${progress}%`,
                        height: "100%",
                        background: "var(--primary)",
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
                    Đang upload file XML lên Blob: {progress}%
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: "#64748b" }}>
                  {checking
                    ? "Đang phân tích XML và đối chiếu MA_DK..."
                    : "Upload xong, đang import dữ liệu vào database..."}
                </div>
              )}
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
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              ...statusBadgeStyle(row.status),
                            }}
                          >
                            {statusLabel(row.status)}
                          </span>
                        </td>
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