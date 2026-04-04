"use client";

import { useEffect, useState } from "react";
import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";

type CourseItem = {
  id: string;
  maKhoaHoc: string | null;
  tenKhoaHoc: string | null;
};

type StudentItem = {
  id: string;
  maDk: string;
  hoVaTen: string;
  ngaySinh: string | null;
  soCmt: string;
  soDienThoai: string;
  giaoVien: string;
  ctv: string;
  ghiChu: string;
  ngayKhamSucKhoe: string | null;
  courseId: string;
  course: {
    id: string;
    maKhoaHoc: string;
    tenKhoaHoc: string;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function StudentsPage() {
  const [q, setQ] = useState("");
  const [courseId, setCourseId] = useState("");
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchStudents(nextQ = q, nextCourseId = courseId) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (nextCourseId) params.set("courseId", nextCourseId);

      const query = params.toString();
      const url = query ? `/api/students?${query}` : "/api/students";

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Không tải được danh sách học viên");
      }

      setStudents(data.students || []);
      setCourses(data.courses || []);
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents("", "");
  }, []);

  function handleSearch() {
    fetchStudents(q, courseId);
  }

  function handleReset() {
    setQ("");
    setCourseId("");
    fetchStudents("", "");
  }

  return (
    <DashboardShell>
      <Header
        title="Danh sách học viên"
        subtitle="Tra cứu, rà soát và quản lý thông tin học viên."
      />

      <section className="card">
        <div className="card-body">
          <div className="form-grid">
            <div>
              <label className="label">
                Tìm theo MA_DK / Họ tên / CCCD / SĐT / Giáo viên / CTV
              </label>
              <input
                className="input"
                placeholder="Nhập từ khóa..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
            </div>

            <div>
              <label className="label">Khóa học</label>
              <select
                className="select"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">Tất cả khóa học</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.tenKhoaHoc || ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "Đang tải..." : "Tìm kiếm"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={loading}
            >
              Làm mới
            </button>
          </div>

          {error ? (
            <div style={{ marginTop: 12, color: "#b91c1c", fontSize: 14 }}>
              {error}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Danh sách hiện có</h2>
          <p className="page-subtitle">
            {loading
              ? "Đang tải dữ liệu..."
              : `Tổng số học viên hiển thị: ${students.length}`}
          </p>
        </div>

        <div className="card-body table-wrap">
          <table className="table" style={{ minWidth: 1700 }}>
            <thead>
              <tr>
                <th>MA_DK</th>
                <th>Họ tên</th>
                <th>Ngày sinh</th>
                <th>CCCD</th>
                <th>Khóa học</th>
                <th>SĐT</th>
                <th>Ngày khám sức khỏe</th>
                <th>Giáo viên</th>
                <th>CTV</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {!loading && students.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 24 }}>
                    Chưa có dữ liệu học viên
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.maDk}</td>
                    <td>{student.hoVaTen}</td>
                    <td>{formatDate(student.ngaySinh)}</td>
                    <td>{student.soCmt}</td>
                    <td>{student.course?.tenKhoaHoc || ""}</td>
                    <td>{student.soDienThoai}</td>
                    <td>{formatDate(student.ngayKhamSucKhoe)}</td>
                    <td>{student.giaoVien || "-"}</td>
                    <td>{student.ctv || "-"}</td>
                    <td>{student.ghiChu}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}