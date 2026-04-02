"use client";

import { useState } from "react";

export default function ImportXmlPage() {
  const [xmlText, setXmlText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setXmlText(text);
  }

  async function handleSubmit() {
    try {
      setLoading(true);
      setResult(null);

      const res = await fetch("/api/import-xml", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: xmlText,
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
      <h1>Import XML</h1>

      <input type="file" accept=".xml" onChange={handleFileChange} />

      <div style={{ marginTop: 16 }}>
        <button onClick={handleSubmit} disabled={!xmlText || loading}>
          {loading ? "Đang xử lý..." : "Gửi XML"}
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