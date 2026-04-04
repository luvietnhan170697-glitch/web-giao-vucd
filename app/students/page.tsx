"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";
import DeleteStudentButton from "../../components/delete-student-button";
import DeleteInvalidStudentsCard from "../../components/delete-invalid-students-card";

type CourseOption = {
  id: string;
  maKhoaHoc: string;
  tenKhoaHoc: string;
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
  courseId: string | null;
  course: {
    id: string;
    maKhoaHoc: string;
    tenKhoaHoc: string;
  } | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type CurrentUser = {
  id: string;
  username: string;
  fullName?: string | null;
  role: string;
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
  });

  const [user, setUser] = useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [queryInput, setQueryInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [courseIdInput, setCourseIdInput] = useState("");
  const [courseId, setCourseId] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  async function loadCurrentUser() {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    }
  }

  async function loadStudents() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (courseId) params.set("courseId", courseId);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/students?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Lỗi lấy danh sách học viên");
      }

      setStudents(data.students || []);
      setCourses(data.courses || []);
      setPagination(
        data.pagination || {
          page: 1,
          pageSize: 50,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (err: any) {
      setError(err?.message || "Có lỗi xảy ra");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [searchQuery, courseId, page, pageSize]);

  function handleSearch() {
    setPage(1);
    setSearchQuery(queryInput.trim());
    setCourseId(courseIdInput);
  }

  function handleReset() {
    setQueryInput("");
    setSearchQuery("");
    setCourseIdInput("");
    setCourseId("");
    setPage(1);
    setPageSize(50);
  }

  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  const startRow =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;

  const endRow = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total
  );

  return (
    <DashboardShell>
      <Header
        title="Danh sách học viên"
        subtitle="Tra cứu, rà soát và quản lý thông tin học viên."
      />

      {isAdmin && <DeleteInvalidStudentsCard />}

      <section className="card">
        <div className="card-body">
          <div className="form-grid">
            <div>
              <label className="label">Tìm theo MA_DK / Họ tên / CCCD / SĐT</label>
              <input
                className="input"
                placeholder="Nhập từ khóa..."
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
              />
            </div>

            <div>
              <label className="label">Khóa học</label>
              <select
                className="select"
                value={courseIdInput}
                onChange={(e) => setCourseIdInput(e.target.value)}
              >
                <option value="">Tất cả khóa học</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.maKhoaHoc}
                    {course.tenKhoaHoc ? ` - ${course.tenKhoaHoc}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Số dòng mỗi trang</label>
              <select
                className="select"
                value={pageSize}
                onChange={(e) => {
                  const next = Number(e.target.value) || 50;
                  setPage(1);
                  setPageSize(next);
                }}
              >
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
              {loading ? "Đang tải..." : "Tìm kiếm"}
            </button>

            <button className="btn btn-secondary" onClick={handleReset} disabled={loading}>
              Làm mới
            </button>
          </div>
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Danh sách hiện có</h2>
          <p className="page-subtitle">
            Hiển thị {startRow}-{endRow} / {pagination.total} học viên.
          </p>
        </div>

        <div className="card-body">
          {error && (
            <div
              style={{
                marginBottom: 16,
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

          <div className="table-wrap">
            <table className="table" style={{ minWidth: 1750 }}>
              <thead>
                <tr>
                  <th>MA_DK</th>
                  <th>Họ và tên</th>
                  <th>Ngày sinh</th>
                  <th>CCCD / Số CMT</th>
                  <th>Số điện thoại</th>
                  <th>Khóa học</th>
                  <th>Tên khóa học</th>
                  <th>Giáo viên</th>
                  <th>CTV</th>
                  <th>Ngày KSK</th>
                  <th>Ghi chú</th>
                  <th>Hành động</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: "center", padding: 16 }}>
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: "center", padding: 16 }}>
                      Không có học viên nào
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.maDk || "-"}</td>
                      <td>{student.hoVaTen || "-"}</td>
                      <td>{formatDate(student.ngaySinh)}</td>
                      <td>{student.soCmt || "-"}</td>
                      <td>{student.soDienThoai || "-"}</td>
                      <td>{student.course?.maKhoaHoc || "-"}</td>
                      <td>{student.course?.tenKhoaHoc || "-"}</td>
                      <td>{student.giaoVien || "-"}</td>
                      <td>{student.ctv || "-"}</td>
                      <td>{formatDate(student.ngayKhamSucKhoe)}</td>
                      <td>{student.ghiChu || "-"}</td>
                      <td>
                        {isAdmin ? (
                          <DeleteStudentButton
                            studentId={student.id}
                            maDk={student.maDk}
                            hoVaTen={student.hoVaTen}
                          />
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 13 }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 14, color: "#64748b" }}>
              Trang {pagination.page} / {pagination.totalPages}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setPage(1)}
                disabled={loading || pagination.page <= 1}
              >
                Trang đầu
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={loading || pagination.page <= 1}
              >
                Trang trước
              </button>

              <button
                className="btn btn-secondary"
                onClick={() =>
                  setPage((prev) => Math.min(pagination.totalPages, prev + 1))
                }
                disabled={loading || pagination.page >= pagination.totalPages}
              >
                Trang sau
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => setPage(pagination.totalPages)}
                disabled={loading || pagination.page >= pagination.totalPages}
              >
                Trang cuối
              </button>
            </div>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}