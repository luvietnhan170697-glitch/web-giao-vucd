"use client";

import { useEffect, useState } from "react";

type PreviewStudent = {
  id: string;
  maDk: string | null;
  hoVaTen: string | null;
  soCmt: string | null;
  courseId: string | null;
  ngaySinh: string | null;
};

type ApiResponse = {
  ok: boolean;
  count?: number;
  deletedCount?: number;
  message?: string;
  preview?: PreviewStudent[];
};

export default function DeleteInvalidStudentsCard() {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [count, setCount] = useState(0);
  const [preview, setPreview] = useState<PreviewStudent[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/students/delete-invalid", {
        method: "GET",
        cache: "no-store",
      });

      const data: ApiResponse = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Không tải được dữ liệu học viên lỗi.");
      }

      setCount(data.count || 0);
      setPreview(data.preview || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
      setCount(0);
      setPreview([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete() {
    if (count <= 0) {
      alert("Không có học viên lỗi để xóa.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa ${count} học viên lỗi?\n\nĐiều kiện xóa:\n- Thiếu khóa học (courseId = null)\n- Thiếu ngày sinh (ngaySinh = null)\n\nHành động này không thể hoàn tác.`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/students/delete-invalid", {
        method: "DELETE",
      });

      const data: ApiResponse = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Xóa thất bại.");
      }

      setMessage(data.message || `Đã xóa ${data.deletedCount || 0} học viên lỗi.`);
      await loadData();
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Có lỗi khi xóa dữ liệu.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section
      className="card"
      style={{
        marginBottom: 20,
        border: "1px solid #fdba74",
        background: "#fff7ed",
      }}
    >
      <div className="card-header">
        <h2 style={{ margin: 0, fontSize: 18, color: "#9a3412" }}>
          Dọn dữ liệu import lỗi
        </h2>
        <p className="page-subtitle" style={{ color: "#9a3412" }}>
          Chỉ xóa học viên thiếu cả khóa học và ngày sinh.
        </p>
      </div>

      <div className="card-body">
        <div
          style={{
            fontSize: 14,
            color: "#7c2d12",
            lineHeight: 1.7,
            marginBottom: 14,
          }}
        >
          Điều kiện xóa:
          <br />- <strong>courseId = null</strong>
          <br />- <strong>ngaySinh = null</strong>
        </div>

        {loading ? (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 10,
              background: "#ffedd5",
              color: "#9a3412",
              fontSize: 14,
            }}
          >
            Đang kiểm tra dữ liệu lỗi...
          </div>
        ) : (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 10,
              background: "#ffedd5",
              color: "#9a3412",
              fontSize: 14,
            }}
          >
            Tìm thấy <strong>{count}</strong> học viên lỗi.
          </div>
        )}

        {message && (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 10,
              background: "#dcfce7",
              border: "1px solid #86efac",
              color: "#166534",
              fontSize: 14,
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {preview.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "#7c2d12",
                marginBottom: 8,
              }}
            >
              Xem trước 10 dòng đầu:
            </div>

            <div className="table-wrap">
              <table className="table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>MA_DK</th>
                    <th>Họ và tên</th>
                    <th>CCCD / Số CMT</th>
                    <th>Ngày sinh</th>
                    <th>Khóa</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((student) => (
                    <tr key={student.id}>
                      <td>{student.maDk || "-"}</td>
                      <td>{student.hoVaTen || "-"}</td>
                      <td>{student.soCmt || "-"}</td>
                      <td>{student.ngaySinh || "-"}</td>
                      <td>{student.courseId || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn"
          onClick={handleDelete}
          disabled={loading || deleting || count === 0}
          style={{
            background: loading || deleting || count === 0 ? "#94a3b8" : "#dc2626",
            color: "#fff",
            border: "none",
          }}
        >
          {deleting ? "Đang xóa..." : "Xóa học viên lỗi"}
        </button>
      </div>
    </section>
  );
}