"use client";

import { useEffect, useMemo, useState } from "react";

type Student = {
  id: string;
  hoVaTen: string;
  maDk?: string | null;
  soCmt?: string | null;
  ngaySinh?: string | null;
  soDienThoai?: string | null;
  ghiChu?: string | null;
  course?: {
    tenKhoaHoc?: string | null;
  } | null;
};

const th = {
  border: "1px solid #ccc",
  padding: "10px",
  textAlign: "left" as const,
  background: "#f5f5f5",
};

const td = {
  border: "1px solid #ccc",
  padding: "10px",
  verticalAlign: "top" as const,
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => setStudents(data));
  }, []);

  const filteredStudents = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return students;

    return students.filter((s) => {
      return (
        s.hoVaTen?.toLowerCase().includes(q) ||
        s.maDk?.toLowerCase().includes(q) ||
        s.soCmt?.toLowerCase().includes(q) ||
        s.soDienThoai?.toLowerCase().includes(q) ||
        s.course?.tenKhoaHoc?.toLowerCase().includes(q)
      );
    });
  }, [students, keyword]);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 16 }}>Danh sách học viên</h1>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Tìm theo họ tên / CCCD / Mã ĐK / SĐT / khóa học"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 500,
            padding: "10px 12px",
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        Tổng số: <b>{filteredStudents.length}</b>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "Arial",
        }}
      >
        <thead>
          <tr>
            <th style={th}>Họ tên</th>
            <th style={th}>Mã ĐK</th>
            <th style={th}>CCCD</th>
            <th style={th}>Ngày sinh</th>
            <th style={th}>SĐT</th>
            <th style={th}>Khóa học</th>
            <th style={th}>Ghi chú</th>
          </tr>
        </thead>

        <tbody>
          {filteredStudents.map((s) => (
            <tr key={s.id}>
              <td style={td}>{s.hoVaTen}</td>
              <td style={td}>{s.maDk || ""}</td>
              <td style={td}>{s.soCmt || ""}</td>
              <td style={td}>{s.ngaySinh ? s.ngaySinh.slice(0, 10) : ""}</td>
              <td style={td}>{s.soDienThoai || ""}</td>
              <td style={td}>{s.course?.tenKhoaHoc || ""}</td>
              <td style={td}>{s.ghiChu || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}