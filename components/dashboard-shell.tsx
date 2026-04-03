import Sidebar from "./sidebar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        minHeight: "100vh",
      }}
    >
      <Sidebar />
      <main className="container-page">{children}</main>
    </div>
  );
}