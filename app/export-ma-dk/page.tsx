import DashboardShell from "@/components/dashboard-shell";
import Header from "@/components/header";

export default function ExportMaDkPage() {
  return (
    <DashboardShell>
      <Header
        title="Export MA_DK"
        subtitle="Xuất dữ liệu theo danh sách MA_DK hoặc theo mapping."
      />

      <section className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Bộ lọc xuất dữ liệu</h2>
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div>
              <label className="label">Chế độ xuất</label>
              <select className="select" defaultValue="ma_dk">
                <option value="ma_dk">Xuất theo MA_DK</option>
                <option value="mapping">Xuất theo mapping CMT + Khóa học</option>
              </select>
            </div>

            <div>
              <label className="label">Định dạng</label>
              <select className="select" defaultValue="xlsx">
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
              </select>
            </div>
          </div>

          <div className="section-spacing">
            <label className="label">Danh sách MA_DK / dữ liệu mapping</label>
            <textarea
              className="textarea"
              rows={8}
              placeholder={`VD:
DK001
DK002
DK003

hoặc nhập mapping:
079201000001 | B2-K01
079201000002 | C-K03`}
            />
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button className="btn btn-primary">Xuất dữ liệu</button>
            <button className="btn btn-secondary">Làm trống</button>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}