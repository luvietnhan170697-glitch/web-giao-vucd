import DashboardShell from "@/components/dashboard-shell";
import Header from "@/components/header";

export default function ImportGraduationPage() {
  return (
    <DashboardShell>
      <Header
        title="Import tốt nghiệp"
        subtitle="Cập nhật kết quả tốt nghiệp theo từng nội dung thi."
      />

      <section className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Tải file kết quả tốt nghiệp</h2>
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div>
              <label className="label">File dữ liệu</label>
              <input type="file" className="input" />
            </div>
            <div>
              <label className="label">Ngày thi</label>
              <input type="date" className="input" />
            </div>
          </div>

          <div className="section-spacing">
            <label className="label">Ghi chú</label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="Hệ thống hỗ trợ cập nhật dồn kết quả theo từng lần thi..."
            />
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button className="btn btn-primary">Import kết quả</button>
            <button className="btn btn-secondary">Kiểm tra trước</button>
          </div>
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Quy ước trạng thái</h2>
        </div>
        <div className="card-body">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="badge badge-success">Đạt</span>
            <span className="badge badge-danger">Rớt</span>
            <span className="badge badge-warning">Vắng</span>
            <span className="badge badge-neutral">Chưa có</span>
          </div>
          <p style={{ marginTop: 16, color: "#64748b" }}>
            Có thể cập nhật nối tiếp từng nội dung: Lý thuyết, Mô phỏng, Hình, Đường.
          </p>
        </div>
      </section>
    </DashboardShell>
  );
}