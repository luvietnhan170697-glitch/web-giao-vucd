"use client";

import { useState } from "react";
import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";

export default function ExportMaDkPage() {
  const [mode, setMode] = useState("ma_dk");
  const [format, setFormat] = useState("xlsx");
  const [textValue, setTextValue] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function handleClear() {
    setTextValue("");
    setFile(null);
    setMode("ma_dk");
    setFormat("xlsx");
  }

  async function handleExport() {
    try {
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("format", format);
      formData.append("textValue", textValue);

      if (file) {
        formData.append("file", file);
      }

      const res = await fetch("/api/export-ma-dk", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        alert(`Xuất dữ liệu thất bại: ${err}`);
        return;
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = format === "csv" ? "export-ma-dk.csv" : "export-ma-dk.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      alert(error?.message || "Có lỗi khi xuất dữ liệu");
    }
  }

  return (
    <DashboardShell>
      <Header
        title="Export MA_DK"
        subtitle="Xuất dữ liệu theo danh sách MA_DK, mapping hoặc file tải lên."
      />

      <section className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Bộ lọc xuất dữ liệu</h2>
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div>
              <label className="label">Chế độ xuất</label>
              <select
                className="select"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="ma_dk">Xuất theo MA_DK</option>
                <option value="mapping">Xuất theo mapping CMT + Khóa học</option>
                <option value="file">Xuất theo file tải lên</option>
              </select>
            </div>

            <div>
              <label className="label">Định dạng</label>
              <select
                className="select"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
              </select>
            </div>
          </div>

          {(mode === "ma_dk" || mode === "mapping") && (
            <div className="section-spacing">
              <label className="label">Danh sách MA_DK / dữ liệu mapping</label>
              <textarea
                className="textarea"
                rows={10}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder={`VD:
DK001
DK002
DK003

hoặc nhập mapping:
079201000001 | B2-K01
079201000002 | C-K03`}
              />
            </div>
          )}

          {mode === "file" && (
            <div className="section-spacing">
              <label className="label">Chọn file danh sách để xuất</label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div style={{ marginTop: 10, color: "#64748b", fontSize: 14 }}>
                {file ? `Đã chọn: ${file.name}` : "Chưa chọn file"}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={handleExport}>
              Xuất dữ liệu
            </button>
            <button className="btn btn-secondary" onClick={handleClear}>
              Làm trống
            </button>
          </div>
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Hướng dẫn nhập liệu</h2>
        </div>

        <div className="card-body">
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Chế độ <b>Xuất theo MA_DK</b>: mỗi dòng nhập 1 MA_DK.</li>
            <li>
              Chế độ <b>Mapping</b>: mỗi dòng nhập theo dạng
              {" "}
              <b>CCCD | Khóa học</b>.
            </li>
            <li>
              Chế độ <b>Xuất theo file tải lên</b>: upload file Excel hoặc CSV
              chứa danh sách cần truy vấn.
            </li>
            <li>Có thể xuất ra Excel hoặc CSV.</li>
          </ul>
        </div>
      </section>
    </DashboardShell>
  );
}