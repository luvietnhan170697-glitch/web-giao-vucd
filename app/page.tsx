import DashboardShell from "../components/dashboard-shell";
import Header from "../components/header";

export default function HomePage() {
  return (
    <DashboardShell>
      <Header
        title="Dashboard"
        subtitle="Tổng quan hệ thống quản lý học viên, import và export dữ liệu."
      />

      <section className="stats-grid">
        <div className="card stat-card">
          <div className="stat-label">Tổng học viên</div>
          <div className="stat-value">0</div>
          <div className="stat-note">Sẽ tự tăng khi import dữ liệu XML</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Khóa học</div>
          <div className="stat-value">0</div>
          <div className="stat-note">Quản lý theo mã khóa và ngày khai giảng</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Tốt nghiệp chờ cập nhật</div>
          <div className="stat-value">0</div>
          <div className="stat-note">Theo dữ liệu import tốt nghiệp</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Sát hạch chờ cập nhật</div>
          <div className="stat-value">0</div>
          <div className="stat-note">Theo dữ liệu import sát hạch thực hành</div>
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Truy cập nhanh</h2>
          <p className="page-subtitle">
            Chọn nghiệp vụ cần thao tác trong ngày.
          </p>
        </div>

        <div className="card-body">
          <div className="stats-grid">
            <a
              href="/students"
              className="card stat-card"
              style={{ display: "block" }}
            >
              <div className="stat-label">Danh sách học viên</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                Xem và tra cứu dữ liệu
              </div>
              <div className="stat-note">Tìm theo MA_DK, họ tên, CMT...</div>
            </a>

            <a
              href="/import-xml"
              className="card stat-card"
              style={{ display: "block" }}
            >
              <div className="stat-label">Import XML</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                Nạp dữ liệu đầu vào
              </div>
              <div className="stat-note">
                Tạo học viên, khóa học, hồ sơ liên quan
              </div>
            </a>

            <a
              href="/import-graduation"
              className="card stat-card"
              style={{ display: "block" }}
            >
              <div className="stat-label">Import tốt nghiệp</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                Cập nhật kết quả thi
              </div>
              <div className="stat-note">Lý thuyết, mô phỏng, hình, đường</div>
            </a>

            <a
              href="/import-practical"
              className="card stat-card"
              style={{ display: "block" }}
            >
              <div className="stat-label">Import sát hạch</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                Cập nhật trạng thái cuối
              </div>
              <div className="stat-note">
                Theo dữ liệu import sát hạch thực hành
              </div>
            </a>

            <a
              href="/export-madk"
              className="card stat-card"
              style={{ display: "block" }}
            >
              <div className="stat-label">Export MA_DK</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                Xuất dữ liệu truy vấn
              </div>
              <div className="stat-note">
                Xuất theo MA_DK hoặc mapping
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Hướng xử lý khuyến nghị</h2>
        </div>
        <div className="card-body">
          <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Import XML để tạo dữ liệu nền.</li>
            <li>Import tốt nghiệp để cập nhật kết quả từng nội dung.</li>
            <li>Import sát hạch thực hành để cập nhật trạng thái cuối.</li>
            <li>Export theo MA_DK để đối chiếu và truy vấn.</li>
          </ol>
        </div>
      </section>
    </DashboardShell>
  );
}