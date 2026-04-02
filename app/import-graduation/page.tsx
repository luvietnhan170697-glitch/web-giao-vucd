"use client";

import { useState } from "react";

export default function ImportGraduationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setMessage("Vui lòng chọn file Excel");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import-graduation", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(data?.detail || data?.error || "Import thất bại");
        console.log("IMPORT ERROR:", data);
        return;
      }

      setMessage(`Import thành công: ${data.updated} học viên`);
    } catch (error) {
      console.error(error);
      setMessage("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Import kết quả Tốt nghiệp</h1>

      <p>
        File Excel cần có các cột:
      </p>

      <ul>
        <li><b>ma_dk</b></li>
        <li>ngay_thi_tot_nghiep</li>
        <li>ly_thuyet</li>
        <li>mo_phong</li>
        <li>hinh</li>
        <li>duong</li>
      </ul>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <div style={{ marginTop: 16 }}>
        <button onClick={handleUpload} disabled={loading}>
          {loading ? "Đang import..." : "Import Excel"}
        </button>
      </div>

      {message && (
        <p style={{ marginTop: 16 }}>
          {message}
        </p>
      )}
    </div>
  );
}