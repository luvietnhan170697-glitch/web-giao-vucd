"use client";

import { useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import Header from "@/components/header";

type RowResult = {
  row: number;
  maDk: string;
  status: "success" | "error";
  message: string;
};

type ImportResult = {
  ok: boolean;
  message: string;
  summary?: {
    total?: number;
    success?: number;
    failed?: number;
  };
  results?: RowResult[];
};

function SummaryCard({
  title,
  value,
  background,
}: {
  title: string;
  value: number;
  background: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background,
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

export default function ImportGraduationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [examDate, setExamDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);

  const canSubmit = useMemo(() => !!file && !loading, [file, loading]);
  const canPreview = useMemo(() => !!file && !previewLoading, [file, previewLoading]);

  async function submit(preview = false) {
    if (!file) return;

    try {
      if (preview) {
        setPreviewLoading(true);
        setPreviewResult(null);
      } else {
        setLoading(true);
        setResult(null);
      }

      const formData = new FormData();
      formData.append("file", file);

      if (examDate) {
        formData.append("examDate", examDate);
      }

      if (note.trim()) {
        formData.append("note", note.trim());
      }

      const res = await fetch(
        preview ? "/api/import-graduation?preview=1" : "/api/import-graduation",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (preview) {
        setPreviewResult(data);
      } else {
        setResult(data);
      }
    } catch (error) {
      console.error(error);
      const fallback = {
        ok: false,
        message: preview ? "Kiểm tra trước thất bại." : "Import thất bại.",
      };

      if (preview) {
        setPreviewResult(fallback);
      } else {
        setResult(fallback);
      }
    } finally {
      if (preview) {
        setPreviewLoading(false);
      } else {
        setLoading(false);
      }
    }
  }

  const activeResult = result || previewResult;
  const successRows = activeResult?.results?.filter((x) => x.status === "success") ?? [];
  const errorRows = activeResult?.results?.filter((x) => x.status === "error") ?? [];

  return (
    <DashboardShell>
      <Header
        title="Import tốt nghiệp"
        subtitle="Cập nhật kết quả tốt nghiệp theo từng nội dung thi."
      />

      <div className="card" style={{ padding: 20, borderRadius: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          Tải file kết quả tốt nghiệp
        </div>

        <div style={{ color: "#64748b", marginBottom: 20 }}>
          Hệ thống ưu tiên lấy ngày thi từ cột <b>ngay_thi_tot_nghiep</b> trong file.
          Ô ngày thi chỉ là phương án dự phòng.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
              File dữ liệu
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
                setPreviewResult(null);
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
              Ngày thi dự phòng
            </label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                padding: "0 12px",
                background: "#fff",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
            Ghi chú
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Ví dụ: Cập nhật theo danh sách thi lại đợt 2..."
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              padding: 12,
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={!canSubmit}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 10,
              border: "none",
              background: canSubmit ? "#0f766e" : "#94a3b8",
              color: "#fff",
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Đang import..." : "Import kết quả"}
          </button>

          <button
            type="button"
            onClick={() => submit(true)}
            disabled={!canPreview}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#e2e8f0",
              color: "#0f172a",
              fontWeight: 700,
              cursor: canPreview ? "pointer" : "not-allowed",
            }}
          >
            {previewLoading ? "Đang kiểm tra..." : "Kiểm tra trước"}
          </button>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            lineHeight: 1.7,
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Cột Excel hỗ trợ:</div>
          <div>ma_dk</div>
          <div>ngay_thi_tot_nghiep</div>
          <div>ly_thuyet</div>
          <div>mo_phong</div>
          <div>hinh</div>
          <div>duong</div>
        </div>

        {activeResult && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
              {result ? "Kết quả import" : "Kết quả kiểm tra"}
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                marginBottom: 16,
                border: activeResult.ok ? "1px solid #86efac" : "1px solid #fca5a5",
                background: activeResult.ok ? "#f0fdf4" : "#fef2f2",
                fontWeight: 600,
              }}
            >
              {activeResult.message}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <SummaryCard
                title="Tổng số dòng"
                value={activeResult.summary?.total ?? 0}
                background="#f8fafc"
              />
              <SummaryCard
                title="Thành công"
                value={activeResult.summary?.success ?? 0}
                background="#f0fdf4"
              />
              <SummaryCard
                title="Lỗi"
                value={activeResult.summary?.failed ?? 0}
                background="#fef2f2"
              />
            </div>

            {!!errorRows.length && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
                  Danh sách lỗi
                </div>

                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    background: "#fff",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={thStyle}>Dòng</th>
                        <th style={thStyle}>MA_DK</th>
                        <th style={thStyle}>Trạng thái</th>
                        <th style={thStyle}>Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorRows.map((item, index) => (
                        <tr key={`${item.row}-${index}`}>
                          <td style={tdStyle}>{item.row}</td>
                          <td style={tdStyle}>{item.maDk || "-"}</td>
                          <td style={tdStyle}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: "#fee2e2",
                                color: "#991b1b",
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              Lỗi
                            </span>
                          </td>
                          <td style={tdStyle}>{item.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!!successRows.length && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
                  Danh sách thành công
                </div>

                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    background: "#fff",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={thStyle}>Dòng</th>
                        <th style={thStyle}>MA_DK</th>
                        <th style={thStyle}>Trạng thái</th>
                        <th style={thStyle}>Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {successRows.map((item, index) => (
                        <tr key={`${item.row}-${index}`}>
                          <td style={tdStyle}>{item.row}</td>
                          <td style={tdStyle}>{item.maDk || "-"}</td>
                          <td style={tdStyle}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: "#dcfce7",
                                color: "#166534",
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              Thành công
                            </span>
                          </td>
                          <td style={tdStyle}>{item.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 13,
  color: "#334155",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 14,
  verticalAlign: "top",
};