import { SearchIcon } from "./icons";

type Props = {
  title: string;
  subtitle?: string;
};

export default function Header({ title, subtitle }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>

      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          minWidth: 280,
        }}
      >
        <SearchIcon className="h-5 w-5" />
        <input
          placeholder="Tìm kiếm nhanh..."
          style={{
            border: "none",
            outline: "none",
            width: "100%",
            background: "transparent",
          }}
        />
      </div>
    </div>
  );
}