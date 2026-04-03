import DashboardShell from "../../components/dashboard-shell";
import Header from "../../components/header";

export default function ImportPracticalPage() {
  return (
    <DashboardShell>
      <Header
        title="Import sát hạch"
        subtitle="Cập nhật dữ liệu thi sát hạch thực hành của học viên."
      />

      <section className="card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Tải file sát hạch</h2>
        </div>

        <div className="card-body">
          <div className="form-grid">
            <div>
              <label className="label">File dữ liệu</label>
              <input type="file" className="input" />
            </div>
            <div>
              <label className="label">Ngày sát hạch</label>
              <input type="date" className="input" />
            </div>
          </div>

          <div className="section-spacing">
            <label className="label">Ghi chú</label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="Nhập ghi chú cho đợt import sát hạch thực hành..."
            />
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button className="btn btn-primary">Import sát hạch</button>
            <button className="btn btn-secondary">Xóa chọn</button>
          </div>
        </div>
      </section>

      <section className="section-spacing card">
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: 18 }}>Lưu ý</h2>
        </div>
        <div className="card-body">
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Chỉ dùng file đúng định dạng của dữ liệu sát hạch thực hành.</li>
            <li>Nên import sau khi đã có dữ liệu học viên từ XML.</li>
            <li>Kiểm tra ngày sát hạch để tránh ghi đè nhầm đợt thi.</li>
          </ul>
        </div>
      </section>
    </DashboardShell>
  );
}