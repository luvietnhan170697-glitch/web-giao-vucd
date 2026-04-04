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
          <div className="stat-label">Import gần nhất</div>
          <div className="stat-value">-</div>
          <div className="stat-note">Theo dõi lần cập nhật dữ liệu mới nhất</div>
        </div>
      </section>
    </DashboardShell>
  );
}