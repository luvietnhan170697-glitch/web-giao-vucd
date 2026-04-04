"use client";

type Props = {
  studentId: string;
  maDk: string;
  hoVaTen: string;
};

export default function DeleteStudentButton({
  studentId,
  maDk,
  hoVaTen,
}: Props) {
  async function handleDelete() {
    const confirmValue = window.prompt(
      `Xóa học viên: ${hoVaTen}\nNhập lại MA_DK để xác nhận:\n${maDk}`
    );

    if (!confirmValue) return;

    try {
      const res = await fetch(`/api/students/${studentId}/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmMaDk: confirmValue,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Xóa học viên thất bại");
        return;
      }

      alert("Đã xóa học viên");
      window.location.reload();
    } catch {
      alert("Có lỗi xảy ra khi xóa học viên");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      style={{
        background: "#dc2626",
        color: "#fff",
        padding: "6px 10px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      Xóa HV
    </button>
  );
}