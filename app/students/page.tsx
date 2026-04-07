"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";
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

type StudentDetail = {
  id: string;
  maDk: string;
  hoVaTen: string;
  ngaySinh: string | null;
  soCmt: string;
  soDienThoai: string;
  giaoVien: string;
  ctv: string;
  ghiChu: string;
  course: {
    id: string;
    maKhoaHoc: string;
    tenKhoaHoc: string;
  } | null;
  sucKhoe: {
    ngayKham: string | null;
    ngayHetHan: string | null;
    trangThai: string;
  };
  totNghiep: {
    ngayThi: string | null;
    lyThuyet: string;
    moPhong: string;
    hinh: string;
    duong: string;
    ketQua: string;
    noiDungRot: string;
  } | null;
  satHach: {
    ngayThi: string | null;
    ngayDat: string | null;
    ketQua: string;
    noiDungRot: string;
    ghiChu: string;
  } | null;
  cacNoiDungDat: Array<{
    id: string;
    tenNoiDung: string;
    ngayDat: string | null;
    baoLuuDenNgay: string | null;
    conHieuLuc: boolean;
    ghiChu: string;
  }>;
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

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function getStatusColor(status?: string | null) {
  const normalized = (status || "").toLowerCase();

  if (
    normalized.includes("đạt") ||
    normalized.includes("dat") ||
    normalized.includes("còn hạn") ||
    normalized.includes("con han") ||
    normalized.includes("hiệu lực") ||
    normalized.includes("hieu luc")
  ) {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #86efac",
    };
  }

  if (
    normalized.includes("hết hạn") ||
    normalized.includes("het han") ||
    normalized.includes("không đạt") ||
    normalized.includes("khong dat") ||
    normalized.includes("rớt") ||
    normalized.includes("rot") ||
    normalized.includes("vắng") ||
    normalized.includes("vang")
  ) {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fca5a5",
    };
  }

  return {
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #cbd5e1",
  };
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

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [editSaving, setEditSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [detailStudent, setDetailStudent] = useState<StudentDetail | null>(null);

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

  function openEditModal(student: StudentItem) {
    setSelectedStudent({ ...student });
    setShowEditModal(true);
  }

  async function openDetailModal(studentId: string) {
    try {
      setDetailLoading(true);
      setDetailStudent(null);
      setShowDetailModal(true);

      const res = await fetch(`/api/students/${studentId}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Lỗi lấy chi tiết học viên");
      }

      setDetailStudent(data);
    } catch (err: any) {
      alert(err?.message || "Có lỗi khi tải chi tiết");
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSaveEdit() {
    if (!selectedStudent) return;

    try {
      setEditSaving(true);

      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hoVaTen: selectedStudent.hoVaTen,
          ngaySinh: selectedStudent.ngaySinh,
          soCmt: selectedStudent.soCmt,
          soDienThoai: selectedStudent.soDienThoai,
          giaoVien: selectedStudent.giaoVien,
          ctv: selectedStudent.ctv,
          ghiChu: selectedStudent.ghiChu,
          courseId: selectedStudent.courseId,
          ngayKhamSucKhoe: selectedStudent.ngayKhamSucKhoe,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Lỗi cập nhật học viên");
      }

      setShowEditModal(false);
      setSelectedStudent(null);
      await loadStudents();
      alert("Cập nhật học viên thành công");
    } catch (err: any) {
      alert(err?.message || "Có lỗi xảy ra khi lưu");
    } finally {
      setEditSaving(false);
    }
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
            <table className="table" style={{ minWidth: 1850 }}>
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
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => openDetailModal(student.id)}
                          >
                            Chi tiết
                          </button>

                          <button
                            className="btn btn-primary"
                            onClick={() => openEditModal(student)}
                          >
                            Sửa
                          </button>
                        </div>
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

      {showEditModal && selectedStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => {
            if (!editSaving) {
              setShowEditModal(false);
              setSelectedStudent(null);
            }
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 900,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h2 style={{ margin: 0, fontSize: 20 }}>Sửa thông tin học viên</h2>
              <p className="page-subtitle">
                Cập nhật trực tiếp thông tin học viên trong danh sách.
              </p>
            </div>

            <div className="card-body">
              <div className="form-grid">
                <div>
                  <label className="label">MA_DK</label>
                  <input className="input" value={selectedStudent.maDk || ""} disabled />
                </div>

                <div>
                  <label className="label">Họ và tên</label>
                  <input
                    className="input"
                    value={selectedStudent.hoVaTen || ""}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        hoVaTen: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">Ngày sinh</label>
                  <input
                    type="date"
                    className="input"
                    value={toDateInputValue(selectedStudent.ngaySinh)}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        ngaySinh: e.target.value || null,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">CCCD / Số CMT</label>
                  <input
                    className="input"
                    value={selectedStudent.soCmt || ""}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        soCmt: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">Số điện thoại</label>
                  <input
                    className="input"
                    value={selectedStudent.soDienThoai || ""}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        soDienThoai: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">Giáo viên</label>
                  <input
                    className="input"
                    value={selectedStudent.giaoVien || ""}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        giaoVien: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">CTV</label>
                  <input
                    className="input"
                    value={selectedStudent.ctv || ""}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        ctv: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="label">Khóa học</label>
                  <select
                    className="select"
                    value={selectedStudent.courseId || ""}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        courseId: e.target.value || null,
                        course:
                          courses.find((c) => c.id === e.target.value)
                            ? {
                                id: e.target.value,
                                maKhoaHoc:
                                  courses.find((c) => c.id === e.target.value)?.maKhoaHoc ||
                                  "",
                                tenKhoaHoc:
                                  courses.find((c) => c.id === e.target.value)?.tenKhoaHoc ||
                                  "",
                              }
                            : null,
                      })
                    }
                  >
                    <option value="">Chưa chọn khóa học</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.maKhoaHoc}
                        {course.tenKhoaHoc ? ` - ${course.tenKhoaHoc}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Ngày khám sức khỏe</label>
                  <input
                    type="date"
                    className="input"
                    value={toDateInputValue(selectedStudent.ngayKhamSucKhoe)}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        ngayKhamSucKhoe: e.target.value || null,
                      })
                    }
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Ghi chú</label>
                  <textarea
                    className="input"
                    rows={4}
                    value={selectedStudent.ghiChu || ""}
                    onChange={(e) =>
                      setSelectedStudent({
                        ...selectedStudent,
                        ghiChu: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    if (!editSaving) {
                      setShowEditModal(false);
                      setSelectedStudent(null);
                    }
                  }}
                  disabled={editSaving}
                >
                  Hủy
                </button>

                <button
                  className="btn btn-primary"
                  onClick={handleSaveEdit}
                  disabled={editSaving}
                >
                  {editSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => {
            if (!detailLoading) {
              setShowDetailModal(false);
              setDetailStudent(null);
            }
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 1100,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h2 style={{ margin: 0, fontSize: 20 }}>Chi tiết tình trạng học viên</h2>
              <p className="page-subtitle">
                Xem học viên đã đạt tới đâu, còn thiếu nội dung nào.
              </p>
            </div>

            <div className="card-body">
              {detailLoading ? (
                <div style={{ padding: 16 }}>Đang tải chi tiết...</div>
              ) : !detailStudent ? (
                <div style={{ padding: 16 }}>Không có dữ liệu chi tiết.</div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    <div className="card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>MA_DK</div>
                      <div style={{ fontWeight: 700 }}>{detailStudent.maDk || "-"}</div>
                    </div>

                    <div className="card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Họ và tên</div>
                      <div style={{ fontWeight: 700 }}>{detailStudent.hoVaTen || "-"}</div>
                    </div>

                    <div className="card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Ngày sinh</div>
                      <div style={{ fontWeight: 700 }}>
                        {formatDate(detailStudent.ngaySinh)}
                      </div>
                    </div>

                    <div className="card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>CCCD / Số CMT</div>
                      <div style={{ fontWeight: 700 }}>{detailStudent.soCmt || "-"}</div>
                    </div>

                    <div className="card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Số điện thoại</div>
                      <div style={{ fontWeight: 700 }}>
                        {detailStudent.soDienThoai || "-"}
                      </div>
                    </div>

                    <div className="card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Khóa học</div>
                      <div style={{ fontWeight: 700 }}>
                        {detailStudent.course?.maKhoaHoc || "-"}
                      </div>
                      <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                        {detailStudent.course?.tenKhoaHoc || "-"}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: 16,
                    }}
                  >
                    <div className="card" style={{ padding: 16 }}>
                      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Sức khỏe</h3>

                      <div style={{ display: "grid", gap: 10 }}>
                        <div>
                          <strong>Ngày khám:</strong>{" "}
                          {formatDate(detailStudent.sucKhoe?.ngayKham)}
                        </div>

                        <div>
                          <strong>Ngày hết hạn:</strong>{" "}
                          {formatDate(detailStudent.sucKhoe?.ngayHetHan)}
                        </div>

                        <div>
                          <strong>Trạng thái:</strong>{" "}
                          <span
                            style={{
                              ...getStatusColor(detailStudent.sucKhoe?.trangThai),
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              display: "inline-block",
                            }}
                          >
                            {detailStudent.sucKhoe?.trangThai || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="card" style={{ padding: 16 }}>
                      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Tốt nghiệp</h3>

                      {!detailStudent.totNghiep ? (
                        <div>Chưa có dữ liệu tốt nghiệp</div>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          <div>
                            <strong>Ngày thi:</strong>{" "}
                            {formatDate(detailStudent.totNghiep.ngayThi)}
                          </div>

                          <div>
                            <strong>Lý thuyết:</strong> {detailStudent.totNghiep.lyThuyet}
                          </div>

                          <div>
                            <strong>Mô phỏng:</strong> {detailStudent.totNghiep.moPhong}
                          </div>

                          <div>
                            <strong>Hình:</strong> {detailStudent.totNghiep.hinh}
                          </div>

                          <div>
                            <strong>Đường:</strong> {detailStudent.totNghiep.duong}
                          </div>

                          <div>
                            <strong>Kết quả:</strong>{" "}
                            <span
                              style={{
                                ...getStatusColor(detailStudent.totNghiep.ketQua),
                                padding: "4px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                display: "inline-block",
                              }}
                            >
                              {detailStudent.totNghiep.ketQua || "-"}
                            </span>
                          </div>

                          <div>
                            <strong>Nội dung rớt:</strong>{" "}
                            {detailStudent.totNghiep.noiDungRot || "-"}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="card" style={{ padding: 16 }}>
                      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Sát hạch</h3>

                      {!detailStudent.satHach ? (
                        <div>Chưa có dữ liệu sát hạch</div>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          <div>
                            <strong>Ngày thi:</strong>{" "}
                            {formatDate(detailStudent.satHach.ngayThi)}
                          </div>

                          <div>
                            <strong>Ngày đạt:</strong>{" "}
                            {formatDate(detailStudent.satHach.ngayDat)}
                          </div>

                          <div>
                            <strong>Kết quả:</strong>{" "}
                            <span
                              style={{
                                ...getStatusColor(detailStudent.satHach.ketQua),
                                padding: "4px 10px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                display: "inline-block",
                              }}
                            >
                              {detailStudent.satHach.ketQua || "-"}
                            </span>
                          </div>

                          <div>
                            <strong>Nội dung rớt:</strong>{" "}
                            {detailStudent.satHach.noiDungRot || "-"}
                          </div>

                          <div>
                            <strong>Ghi chú:</strong>{" "}
                            {detailStudent.satHach.ghiChu || "-"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div className="card" style={{ padding: 16 }}>
                      <h3 style={{ marginTop: 0, marginBottom: 12 }}>
                        Các nội dung đã đạt / bảo lưu
                      </h3>

                      {detailStudent.cacNoiDungDat.length === 0 ? (
                        <div>Chưa có dữ liệu nội dung đạt</div>
                      ) : (
                        <div className="table-wrap">
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Nội dung</th>
                                <th>Ngày đạt</th>
                                <th>Bảo lưu đến</th>
                                <th>Hiệu lực</th>
                                <th>Ghi chú</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailStudent.cacNoiDungDat.map((item) => (
                                <tr key={item.id}>
                                  <td>{item.tenNoiDung || "-"}</td>
                                  <td>{formatDate(item.ngayDat)}</td>
                                  <td>{formatDate(item.baoLuuDenNgay)}</td>
                                  <td>
                                    <span
                                      style={{
                                        ...getStatusColor(
                                          item.conHieuLuc ? "Hiệu lực" : "Hết hiệu lực"
                                        ),
                                        padding: "4px 10px",
                                        borderRadius: 999,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        display: "inline-block",
                                      }}
                                    >
                                      {item.conHieuLuc ? "Hiệu lực" : "Hết hiệu lực"}
                                    </span>
                                  </td>
                                  <td>{item.ghiChu || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div className="card" style={{ padding: 16 }}>
                      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Ghi chú chung</h3>
                      <div>{detailStudent.ghiChu || "-"}</div>
                    </div>
                  </div>
                </>
              )}

              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    if (!detailLoading) {
                      setShowDetailModal(false);
                      setDetailStudent(null);
                    }
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}