"use client";

type ProgressData = {
  student: {
    id: string;
    maDk?: string | null;
    hoTen?: string | null;
    soCccd?: string | null;
    soDienThoai?: string | null;
    ghiChu?: string | null;
  };
  course: {
    maKhoaHoc?: string | null;
    tenKhoaHoc?: string | null;
    ngayKhaiGiang?: string | null;
    ngayBeGiang?: string | null;
    ngaySatHach?: string | null;
  } | null;
  medical: {
    ngayKhamSucKhoe?: string | null;
    ngayHetHan?: string | null;
    ketQua?: string | null;
    ghiChu?: string | null;
  } | null;
  graduation: {
    ngayThi?: string | null;
    lyThuyet?: string | null;
    moPhong?: string | null;
    saHinh?: string | null;
    duongTruong?: string | null;
    ketQua?: string | null;
    ghiChu?: string | null;
  } | null;
  exam: {
    ngayThi?: string | null;
    ketQua?: string | null;
    ghiChu?: string | null;
  } | null;
  summary: {
    medicalDone: boolean;
    graduationDone: boolean;
    examDone: boolean;
    completedLevel: string;
  };
};

function formatDate(date?: string | null) {
  if (!date) return "--";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("vi-VN");
}

function statusBadge(done: boolean, label: string) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        done
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {label}: {done ? "Đã có" : "Chưa có"}
    </span>
  );
}

export default function StudentProgressModal({
  open,
  loading,
  data,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  data: ProgressData | null;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Chi tiết tiến độ học viên
            </h2>
            <p className="text-sm text-slate-500">
              Theo dõi tình trạng hồ sơ, sức khỏe, tốt nghiệp, sát hạch
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">
              Đang tải dữ liệu...
            </div>
          ) : !data ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-red-500">
              Không có dữ liệu
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {statusBadge(data.summary.medicalDone, "Sức khỏe")}
                  {statusBadge(data.summary.graduationDone, "Tốt nghiệp")}
                  {statusBadge(data.summary.examDone, "Sát hạch")}
                  <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    Tổng quan: {data.summary.completedLevel}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-500">Mã đăng ký</div>
                    <div className="font-medium">{data.student.maDk || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Họ tên</div>
                    <div className="font-medium">{data.student.hoTen || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">CCCD</div>
                    <div className="font-medium">{data.student.soCccd || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Số điện thoại</div>
                    <div className="font-medium">
                      {data.student.soDienThoai || "--"}
                    </div>
                  </div>
                </div>
              </div>

              <section className="rounded-2xl border p-4">
                <h3 className="mb-3 text-lg font-semibold">Khóa học</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-500">Mã khóa</div>
                    <div>{data.course?.maKhoaHoc || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Tên khóa</div>
                    <div>{data.course?.tenKhoaHoc || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Khai giảng</div>
                    <div>{formatDate(data.course?.ngayKhaiGiang)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Bế giảng</div>
                    <div>{formatDate(data.course?.ngayBeGiang)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Ngày sát hạch</div>
                    <div>{formatDate(data.course?.ngaySatHach)}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border p-4">
                <h3 className="mb-3 text-lg font-semibold">Khám sức khỏe</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-500">Ngày khám</div>
                    <div>{formatDate(data.medical?.ngayKhamSucKhoe)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Ngày hết hạn</div>
                    <div>{formatDate(data.medical?.ngayHetHan)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Kết quả</div>
                    <div>{data.medical?.ketQua || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Ghi chú</div>
                    <div>{data.medical?.ghiChu || "--"}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border p-4">
                <h3 className="mb-3 text-lg font-semibold">Kết quả tốt nghiệp</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-500">Ngày thi</div>
                    <div>{formatDate(data.graduation?.ngayThi)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Tổng kết</div>
                    <div>{data.graduation?.ketQua || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Lý thuyết</div>
                    <div>{data.graduation?.lyThuyet || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Mô phỏng</div>
                    <div>{data.graduation?.moPhong || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Sa hình</div>
                    <div>{data.graduation?.saHinh || "--"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Đường trường</div>
                    <div>{data.graduation?.duongTruong || "--"}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-slate-500">Ghi chú</div>
                    <div>{data.graduation?.ghiChu || "--"}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border p-4">
                <h3 className="mb-3 text-lg font-semibold">Kết quả sát hạch</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-500">Ngày thi</div>
                    <div>{formatDate(data.exam?.ngayThi)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Kết quả</div>
                    <div>{data.exam?.ketQua || "--"}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-slate-500">Ghi chú</div>
                    <div>{data.exam?.ghiChu || "--"}</div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}