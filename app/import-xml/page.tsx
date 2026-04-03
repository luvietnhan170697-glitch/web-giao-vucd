import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";

export default function ImportXmlPage() {
  return (
    <DashboardShell>
      <Header
        title="Import XML"
        subtitle="Tải file XML để thêm hoặc cập nhật dữ liệu học viên."
      />

      <section className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Tải file XML</h2>
          <p className="page-subtitle">
            Chọn file đúng định dạng để hệ thống xử lý dữ liệu.
          </p>
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div>
              <label className="label">Chọn file XML</label>
              <input type="file" className="input" />
            </div>
            <div>
              <label className="label">Ghi chú</label>
              <input className="input" placeholder="Ví dụ: Dữ liệu khóa tháng 4" />
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button className="btn btn-primary">Bắt đầu import</button>
            <button className="btn btn-secondary">Xóa chọn</button>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}