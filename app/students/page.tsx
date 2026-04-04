import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

export default async function StudentsPage() {
  const students = await prisma.student.findMany({
    include: {
      course: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 500,
  });

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
              <label className="label">Tìm theo MA_DK / Họ tên / CCCD</label>
              <input className="input" placeholder="Nhập từ khóa..." />
            </div>

            <div>
              <label className="label">Khóa học</label>
              <select className="select" defaultValue="">
                <option value="">Tất cả khóa học</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button className="btn btn-primary" disabled>
              Tìm kiếm
            </button>
            <button className="btn btn-secondary" disabled>
              Làm mới
            </button>
          </div>
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Danh sách hiện có</h2>
          <p className="page-subtitle">
            Đang hiển thị {students.length} học viên mới nhất.
          </p>
        </div>

        <div className="card-body table-wrap">
          <table className="table" style={{ minWidth: 1550 }}>
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
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student: any) => (
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
                  <td>{student.ghiChu || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}