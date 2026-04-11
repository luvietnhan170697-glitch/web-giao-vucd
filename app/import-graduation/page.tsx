"use client";

import { useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import Header from "@/components/header";

type CompareStatus = "new" | "same" | "update" | "conflict" | "warning";

type RowResult = {
  row: number;
  maDk: string;
  status: "success" | "error";
  message: string;
  oldResult?: string | null;
  newResult?: string | null;
  compareStatus?: CompareStatus;
};

type Summary = {
  total: number;
  processed: number;
  success: number;
  failed: number;
  progress: number;
};

type StreamDone = {
  type: "done";
  ok: boolean;
  message: string;
  summary: Summary;
  results: RowResult[];
};

type StreamProgress = {
  type: "progress";
  rowResult: RowResult;
  summary: Summary;
};

type StreamStart = {
  type: "start";
  message: string;
  summary: Summary;
};

type StreamEvent = StreamDone | StreamProgress | StreamStart;

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

function compareBadge(status?: CompareStatus) {
  if (status === "new") return "Mới";
  if (status === "same") return "Trùng";
  if (status === "update") return "Cập nhật";
  if (status === "conflict") return "Xung đột";
  if (status === "warning") return "Cảnh báo";
  return "-";
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

export default function ImportGraduationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [examDate, setExamDate] = useState("");
  const [note, setNote] = useState("");
  const [forceImport, setForceImport] = useState(false);

  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"preview" | "import" | null>(null);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    progress: 0,
  });
  const [results, setResults] = useState<RowResult[]>([]);
  const [doneOk, setDoneOk] = useState<boolean | null>(null);

  const canRun = useMemo(() => !!file && !running, [file, running]);

  async function run(preview: boolean) {
    if (!file) return;

    setRunning(true);
    setMode(preview ? "preview" : "import");
    setMessage(preview ? "Đang kiểm tra file..." : "Đang import dữ liệu...");
    setSummary({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      progress: 0,
    });
    setResults([]);
    setDoneOk(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (examDate) {
        formData.append("examDate", examDate);
      }

      if (note.trim()) {
        formData.append("note", note.trim());
      }

      formData.append("force", forceImport ? "1" : "0");

      const res = await fetch(
        preview ? "/api/import-graduation?preview=1" : "/api/import-graduation",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.body) {
        throw new Error("Không đọc được dữ liệu stream từ server.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk
            .split("\n")
            .find((item) => item.startsWith("data: "));
          if (!line) continue;

          const payload = JSON.parse(line.slice(6)) as StreamEvent;

          if (payload.type === "start") {
            setMessage(payload.message);
            setSummary(payload.summary);
          }

          if (payload.type === "progress") {
            setSummary(payload.summary);
            setResults((prev) => [...prev, payload.rowResult]);
            setMessage(
              `Đang xử lý ${payload.summary.processed}/${payload.summary.total} dòng...`
            );
          }

          if (payload.type === "done") {
            setSummary(payload.summary);
            setResults(payload.results);
            setMessage(payload.message);
            setDoneOk(payload.ok);
          }
        }
      }
    } catch (error) {
      setDoneOk(false);
      setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra khi import.");
    } finally {
      setRunning(false);
    }
  }

  const successRows = results.filter((x) => x.status === "success");
  const errorRows = results.filter((x) => x.status === "error");
  const conflictRows = results.filter((x) => x.compareStatus === "conflict");

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
          Ô ngày thi chỉ là tùy chọn dự phòng nếu file không có ngày.
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
                setResults([]);
                setDoneOk(null);
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>
              Ngày thi (tùy chọn)
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
            placeholder="Ví dụ: Cập nhật theo danh sách thi lại..."
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              padding: 12,
              resize: "vertical",
            }}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          <input
            type="checkbox"
            checked={forceImport}
            onChange={(e) => setForceImport(e.target.checked)}
          />
          Tôi xác nhận import kể cả khi có xung đột
        </label>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => run(false)}
            disabled={!canRun}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 10,
              border: "none",
              background: canRun ? "#0f766e" : "#94a3b8",
              color: "#fff",
              fontWeight: 700,
              cursor: canRun ? "pointer" : "not-allowed",
            }}
          >
            {running && mode === "import" ? "Đang import..." : "Import kết quả"}
          </button>

          <button
            type="button"
            onClick={() => run(true)}
            disabled={!canRun}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#e2e8f0",
              color: "#0f172a",
              fontWeight: 700,
              cursor: canRun ? "pointer" : "not-allowed",
            }}
          >
            {running && mode === "preview" ? "Đang kiểm tra..." : "Kiểm tra trước"}
          </button>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            <span>{message || "Chưa bắt đầu"}</span>
            <span>{summary.progress}%</span>
          </div>

          <div
            style={{
              width: "100%",
              height: 12,
              background: "#e2e8f0",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${summary.progress}%`,
                height: "100%",
                background: "#0f766e",
                transition: "width 0.2s ease",
              }}
            />
          </div>

          <div style={{ marginTop: 10, color: "#475569", fontSize: 14 }}>
            Đã xử lý: {summary.processed}/{summary.total} dòng
          </div>
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
          <div style={{ fontWeight: 700, marginBottom: 8 }}>File Excel hỗ trợ các cột:</div>
          <div>ma_dk</div>
          <div>ngay_thi_tot_nghiep</div>
          <div>ly_thuyet</div>
          <div>mo_phong</div>
          <div>hinh</div>
          <div>duong</div>
        </div>

        {(summary.total > 0 || results.length > 0) && (
          <>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                marginBottom: 16,
                border:
                  doneOk === null
                    ? "1px solid #cbd5e1"
                    : doneOk
                    ? "1px solid #86efac"
                    : "1px solid #fca5a5",
                background:
                  doneOk === null ? "#f8fafc" : doneOk ? "#f0fdf4" : "#fef2f2",
                fontWeight: 600,
              }}
            >
              {message}
            </div>

            {!!conflictRows.length && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  marginBottom: 16,
                  border: "1px solid #fca5a5",
                  background: "#fff7ed",
                  color: "#9a3412",
                  fontWeight: 700,
                }}
              >
                Có {conflictRows.length} dòng xung đột với dữ liệu cũ.
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <SummaryCard title="Tổng số dòng" value={summary.total} background="#f8fafc" />
              <SummaryCard title="Thành công" value={summary.success} background="#f0fdf4" />
              <SummaryCard title="Lỗi" value={summary.failed} background="#fef2f2" />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
                Bảng đối chiếu cũ - mới
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
                      <th style={thStyle}>KQ cũ</th>
                      <th style={thStyle}>KQ mới</th>
                      <th style={thStyle}>So sánh</th>
                      <th style={thStyle}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((item, index) => (
                      <tr key={`${item.row}-${index}`}>
                        <td style={tdStyle}>{item.row}</td>
                        <td style={tdStyle}>{item.maDk || "-"}</td>
                        <td style={tdStyle}>{item.oldResult || "-"}</td>
                        <td style={tdStyle}>{item.newResult || "-"}</td>
                        <td style={tdStyle}>{compareBadge(item.compareStatus)}</td>
                        <td style={tdStyle}>{item.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                        <th style={thStyle}>KQ cũ</th>
                        <th style={thStyle}>KQ mới</th>
                        <th style={thStyle}>So sánh</th>
                        <th style={thStyle}>Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorRows.map((item, index) => (
                        <tr key={`${item.row}-${index}`}>
                          <td style={tdStyle}>{item.row}</td>
                          <td style={tdStyle}>{item.maDk || "-"}</td>
                          <td style={tdStyle}>{item.oldResult || "-"}</td>
                          <td style={tdStyle}>{item.newResult || "-"}</td>
                          <td style={tdStyle}>{compareBadge(item.compareStatus)}</td>
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
                        <th style={thStyle}>KQ cũ</th>
                        <th style={thStyle}>KQ mới</th>
                        <th style={thStyle}>So sánh</th>
                        <th style={thStyle}>Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {successRows.map((item, index) => (
                        <tr key={`${item.row}-${index}`}>
                          <td style={tdStyle}>{item.row}</td>
                          <td style={tdStyle}>{item.maDk || "-"}</td>
                          <td style={tdStyle}>{item.oldResult || "-"}</td>
                          <td style={tdStyle}>{item.newResult || "-"}</td>
                          <td style={tdStyle}>{compareBadge(item.compareStatus)}</td>
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