"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type ExportMode = "ma_dk" | "mapping" | "file";
type ExportTarget = "students" | "graduation" | "sat_hach";

const ACCEPTED_FILE_TYPES = ".xlsx,.xls,.csv";

export default function ExportMaDkPage() {
  const [mode, setMode] = useState<ExportMode>("file");
  const [target, setTarget] = useState<ExportTarget>("sat_hach");

  const [maDkText, setMaDkText] = useState("");
  const [mappingText, setMappingText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const helperText = useMemo(() => {
    if (mode === "ma_dk") {
      return "Mỗi dòng nhập 1 MA_DK. Ví dụ: DK001";
    }
    if (mode === "mapping") {
      return "Mỗi dòng nhập theo dạng: CCCD | Khóa học";
    }
    return "Tải lên file Excel/CSV. Hệ thống sẽ tự đọc MA_DK hoặc mapping.";
  }, [mode]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
  }

  function handleReset() {
    setMaDkText("");
    setMappingText("");
    setFile(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("target", target);

      if (mode === "ma_dk") {
        formData.append("maDkText", maDkText);
      } else if (mode === "mapping") {
        formData.append("mappingText", mappingText);
      } else {
        if (!file) {
          alert("Vui lòng chọn file tải lên");
          return;
        }
        formData.append("file", file);
      }

      const response = await fetch("/api/export-ma-dk", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Xuất dữ liệu thất bại");
        }

        const text = await response.text();
        console.error("HTML error response:", text);
        throw new Error("API export không tồn tại hoặc deploy chưa đúng.");
      }

      const blob = await response.blob();

      let filename = "export.xlsx";
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/i);
      if (match?.[1]) {
        filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Xuất dữ liệu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Export MA_DK</h1>
        <p className="mt-2 text-sm text-slate-500">
          Xuất dữ liệu theo danh sách MA_DK, mapping hoặc file tải lên.
        </p>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-semibold text-slate-900">
          Bộ lọc xuất dữ liệu
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Loại dữ liệu xuất
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as ExportTarget)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="students">Thông tin học viên</option>
              <option value="graduation">Kết quả tốt nghiệp</option>
              <option value="sat_hach">Kết quả sát hạch</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Chế độ xuất
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ExportMode)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="file">Xuất theo file tải lên</option>
              <option value="ma_dk">Xuất theo MA_DK</option>
              <option value="mapping">Xuất theo Mapping CCCD | Khóa học</option>
            </select>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            {helperText}
          </div>

          {mode === "ma_dk" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Danh sách MA_DK
              </label>
              <textarea
                value={maDkText}
                onChange={(e) => setMaDkText(e.target.value)}
                rows={10}
                placeholder={`DK001\nDK002\nDK003`}
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          )}

          {mode === "mapping" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Danh sách Mapping
              </label>
              <textarea
                value={mappingText}
                onChange={(e) => setMappingText(e.target.value)}
                rows={10}
                placeholder={`079123456789 | K01BSS/25ĐL2\n012345678901 | K02B2/25`}
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>
          )}

          {mode === "file" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Chọn file danh sách để xuất
              </label>
              <input
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileChange}
                className="block w-full rounded-xl border px-4 py-3"
              />
              <div className="mt-2 text-sm text-slate-500">
                {file ? `Đã chọn: ${file.name}` : "Chưa chọn file"}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Đang xuất..." : "Xuất dữ liệu"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={submitting}
              className="rounded-xl border px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Làm trống
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Hướng dẫn nhập liệu
        </h2>

        <div className="space-y-3 text-sm text-slate-700">
          <p>
            <strong>Chế độ Xuất theo MA_DK:</strong> mỗi dòng nhập 1 MA_DK.
          </p>
          <p>
            <strong>Chế độ Mapping:</strong> mỗi dòng nhập theo dạng{" "}
            <strong>CCCD | Khóa học</strong>.
          </p>
          <p>
            <strong>Chế độ Xuất theo file tải lên:</strong> upload file Excel hoặc
            CSV chứa danh sách cần truy vấn.
          </p>
          <p>
            File tải lên có thể chứa cột: <strong>MA_DK</strong> hoặc{" "}
            <strong>CCCD</strong> + <strong>Khóa học</strong>.
          </p>
          <p>
            Có thể xuất 3 nhóm dữ liệu: <strong>Thông tin học viên</strong>,{" "}
            <strong>Tốt nghiệp</strong>, <strong>Sát hạch</strong>.
          </p>
        </div>
      </section>
    </main>
  );
}