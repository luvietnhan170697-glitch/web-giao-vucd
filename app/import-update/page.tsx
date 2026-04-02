"use client";

import { useState } from "react";

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
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Import Excel cập nhật</h1>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <div style={{ marginTop: 16 }}>
        <button onClick={handleSubmit} disabled={!file || loading}>
          {loading ? "Đang xử lý..." : "Upload file cập nhật"}
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h2>Kết quả</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {result ? JSON.stringify(result, null, 2) : "Chưa có dữ liệu"}
        </pre>
      </div>
    </div>
  );
}