import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";

const demoStudents = [
  {
    maDk: "77008-20260128-092912",
    hoTen: "Nguyễn Văn A",
    ngaySinh: "12/03/2001",
    cccd: "079201000001",
    khoaHoc: "B2-K01",
    soDienThoai: "0794423444",
    giaoVien: "Thầy Minh",
    ctv: "CTV Lan",
    trangThai: "Đang học",
  },
  {
    maDk: "77008-20260127-161459",
    hoTen: "Trần Thị B",
    ngaySinh: "25/08/2000",
    cccd: "079201000002",
    khoaHoc: "B2-K01",
    soDienThoai: "0656562454",
    giaoVien: "Thầy Hải",
    ctv: "CTV Hương",
    trangThai: "Chờ thi",
  },
  {
    maDk: "77008-20260126-101010",
    hoTen: "Lê Văn C",
    ngaySinh: "03/11/1999",
    cccd: "079201000003",
    khoaHoc: "C-K03",
    soDienThoai: "0900000003",
    giaoVien: "Thầy Nam",
    ctv: "CTV Phúc",
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
          <table className="table" style={{ minWidth: 1250 }}>
            <thead>
              <tr>
                <th>MA_DK</th>
                <th>Họ tên</th>
                <th>Ngày sinh</th>
                <th>CCCD</th>
                <th>Khóa học</th>
                <th>Số điện thoại</th>
                <th>Giáo viên</th>
                <th>CTV</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {demoStudents.map((student) => (
                <tr key={student.maDk}>
                  <td>{student.maDk}</td>
                  <td>{student.hoTen}</td>
                  <td>{student.ngaySinh}</td>
                  <td>{student.cccd}</td>
                  <td>{student.khoaHoc}</td>
                  <td>{student.soDienThoai}</td>
                  <td>{student.giaoVien}</td>
                  <td>{student.ctv}</td>
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