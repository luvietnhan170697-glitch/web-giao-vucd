"use client";

import { useState } from "react";

export default function ExportMADKPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleExport = async () => {
    if (!file) {
      setMessage("Vui lòng chọn file Excel");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/export-madk", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMessage(data?.detail || data?.error || "Export thất bại");
        console.log("EXPORT ERROR:", data);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "export-ma-dk.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
      setMessage("Export thành công");
    } catch (error) {
      console.error(error);
      setMessage("Có lỗi xảy ra khi export");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Export theo MA_DK</h1>

      <p>
        File đầu vào phải có cột: <b>ma_dk</b>
      </p>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <div style={{ marginTop: 16 }}>
        <button onClick={handleExport} disabled={loading}>
          {loading ? "Đang export..." : "Export Excel"}
        </button>
      </div>

      {message && <p style={{ marginTop: 16 }}>{message}</p>}
    </div>
  );
}