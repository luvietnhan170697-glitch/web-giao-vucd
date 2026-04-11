"use client";

import { useMemo, useState } from "react";
import DashboardShell from "@/components/dashboard-shell";
import Header from "@/components/header";

type ImportResult = {
  ok: boolean;
  message: string;
  summary?: {
    total?: number;
    success?: number;
    failed?: number;
  };
  errors?: string[];
};

export default function ImportGraduationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [examDate, setExamDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);

  const canSubmit = useMemo(() => {
    return !!file && !loading;
  }, [file, loading]);

  const canPreview = useMemo(() => {
    return !!file && !previewLoading;
  }, [file, previewLoading]);

  async function handleImport() {
    if (!file) {
      setResult({
        ok: false,
        message: "Vui lòng chọn file Excel.",
      });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      // Không bắt buộc truyền ngày thi.
      // Chỉ truyền nếu người dùng có chọn tay để làm fallback.
      if (examDate) {
        formData.append("examDate", examDate);
      }

      if (note.trim()) {
        formData.append("note", note.trim());
      }

      const res = await fetch("/api/import-graduation", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({
        ok: false,
        message: "Import kết quả tốt nghiệp thất bại.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    if (!file) {
      setPreviewResult({
        ok: false,
        message: "Vui lòng chọn file Excel để kiểm tra trước.",
      });
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewResult(null);

      const formData = new FormData();
      formData.append("file", file);

      if (examDate) {
        formData.append("examDate", examDate);
      }

      if (note.trim()) {
        formData.append("note", note.trim());
      }

      const res = await fetch("/api/import-graduation?preview=1", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setPreviewResult(data);
    } catch (error) {
      console.error(error);
      setPreviewResult({
        ok: false,
        message: "Kiểm tra trước thất bại.",
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <DashboardShell>
      <Header
        title="Import tốt nghiệp"
        subtitle="Cập nhật kết quả tốt nghiệp theo từng nội dung thi."
      />

      <div
        className="card"
        style={{
          padding: 20,
          borderRadius: 16,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          Tải file kết quả tốt nghiệp
        </div>

        <div style={{ color: "#64748b", marginBottom: 20 }}>
          Ngày thi sẽ ưu tiên lấy từ cột <b>ngay_thi_tot_nghiep</b> trong file Excel.
          Ô ngày thi bên dưới chỉ là tùy chọn dự phòng nếu file không có ngày.
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
            <label
              htmlFor="graduation-file"
              style={{ display: "block", fontWeight: 700, marginBottom: 8 }}
            >
              File dữ liệu
            </label>
            <input
              id="graduation-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
                setResult(null);
                setPreviewResult(null);
              }}
              style={{
                width: "100%",
                height: 40,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="exam-date"
              style={{ display: "block", fontWeight: 700, marginBottom: 8 }}
            >
              Ngày thi (tùy chọn)
            </label>
            <input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                padding: "0 12px",
                background: "#fff",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="note"
            style={{ display: "block", fontWeight: 700, marginBottom: 8 }}
          >
            Ghi chú
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Hệ thống hỗ trợ cập nhật đơn kết quả theo từng lần thi..."
            rows={4}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              padding: 12,
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button
            type="button"
            onClick={handleImport}
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
            onClick={handlePreview}
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
            marginTop: 12,
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

        {previewResult && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              border: previewResult.ok ? "1px solid #86efac" : "1px solid #fca5a5",
              background: previewResult.ok ? "#f0fdf4" : "#fef2f2",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Kết quả kiểm tra trước</div>
            <div style={{ marginBottom: 8 }}>{previewResult.message}</div>

            {previewResult.summary && (
              <div style={{ lineHeight: 1.7 }}>
                <div>Tổng dòng: {previewResult.summary.total ?? 0}</div>
                <div>Hợp lệ: {previewResult.summary.success ?? 0}</div>
                <div>Lỗi: {previewResult.summary.failed ?? 0}</div>
              </div>
            )}

            {!!previewResult.errors?.length && (
              <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                {previewResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {result && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              border: result.ok ? "1px solid #86efac" : "1px solid #fca5a5",
              background: result.ok ? "#f0fdf4" : "#fef2f2",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Kết quả import</div>
            <div style={{ marginBottom: 8 }}>{result.message}</div>

            {result.summary && (
              <div style={{ lineHeight: 1.7 }}>
                <div>Tổng dòng: {result.summary.total ?? 0}</div>
                <div>Thành công: {result.summary.success ?? 0}</div>
                <div>Thất bại: {result.summary.failed ?? 0}</div>
              </div>
            )}

            {!!result.errors?.length && (
              <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}