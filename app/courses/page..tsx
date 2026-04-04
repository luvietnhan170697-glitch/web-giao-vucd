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

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    include: {
      students: {
        select: { id: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <DashboardShell>
      <Header
        title="Danh sách khóa học"
        subtitle="Quản lý khóa học và xóa khóa bằng mật mã xác nhận."
      />

      <section className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Danh sách khóa</h2>
          <p className="page-subtitle">
            Chỉ admin mới được phép xóa khóa học.
          </p>
        </div>

        <div className="card-body table-wrap">
          <table className="table" style={{ minWidth: 1400 }}>
            <thead>
              <tr>
                <th>Mã khóa</th>
                <th>Tên khóa học</th>
                <th>Mã BCI</th>
                <th>Hạng đào tạo</th>
                <th>Ngày khai giảng</th>
                <th>Ngày bế giảng</th>
                <th>Ngày sát hạch</th>
                <th>Số học viên</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 16 }}>
                    Chưa có khóa học nào
                  </td>
                </tr>
              ) : (
                courses.map((course: any) => (
                  <tr key={course.id}>
                    <td>{course.maKhoaHoc || "-"}</td>
                    <td>{course.tenKhoaHoc || "-"}</td>
                    <td>{course.maBci || "-"}</td>
                    <td>{course.hangDaoTao || "-"}</td>
                    <td>{formatDate(course.ngayKhaiGiang)}</td>
                    <td>{formatDate(course.ngayBeGiang)}</td>
                    <td>{formatDate(course.ngaySatHach)}</td>
                    <td>{course.students?.length || 0}</td>
                    <td>-</td>
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