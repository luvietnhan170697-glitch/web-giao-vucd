import DashboardShell from "@/components/dashboard-shell";
import Header from "@/components/header";

const demoStudents = [
  {
    maDk: "DK001",
    hoTen: "Nguyễn Văn A",
    cccd: "079201000001",
    khoaHoc: "B2-K01",
    soDienThoai: "0900000001",
    trangThai: "Đang học",
  },
  {
    maDk: "DK002",
    hoTen: "Trần Thị B",
    cccd: "079201000002",
    khoaHoc: "B2-K01",
    soDienThoai: "0900000002",
    trangThai: "Chờ thi",
  },
  {
    maDk: "DK003",
    hoTen: "Lê Văn C",
    cccd: "079201000003",
    khoaHoc: "C-K03",
    soDienThoai: "0900000003",
    trangThai: "Hoàn thành",
  },
];

export default function StudentsPage() {
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
                <option>B2-K01</option>
                <option>C-K03</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button className="btn btn-primary">Tìm kiếm</button>
            <button className="btn btn-secondary">Làm mới</button>
          </div>
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Danh sách hiện có</h2>
        </div>
        <div className="card-body table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>MA_DK</th>
                <th>Họ tên</th>
                <th>CCCD</th>
                <th>Khóa học</th>
                <th>Số điện thoại</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {demoStudents.map((student) => (
                <tr key={student.maDk}>
                  <td>{student.maDk}</td>
                  <td>{student.hoTen}</td>
                  <td>{student.cccd}</td>
                  <td>{student.khoaHoc}</td>
                  <td>{student.soDienThoai}</td>
                  <td>
                    {student.trangThai === "Hoàn thành" ? (
                      <span className="badge badge-success">{student.trangThai}</span>
                    ) : student.trangThai === "Chờ thi" ? (
                      <span className="badge badge-warning">{student.trangThai}</span>
                    ) : (
                      <span className="badge badge-neutral">{student.trangThai}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}