export default function Home() {
  return (
    <div style={{ padding: 20 }}>
      <h1>🚀 Hệ thống Giáo vụ</h1>

      <ul>
        <li><a href="/students">Danh sách học viên</a></li>
        <li><a href="/import-xml">Import XML</a></li>
        <li><a href="/import-graduation">Import tốt nghiệp</a></li>
        <li><a href="/import-practical">Import sát hạch</a></li>
        <li><a href="/export-madk">Export MA_DK</a></li>
      </ul>
    </div>
  );
}