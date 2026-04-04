for (const item of studentsRaw) {
  const maDk = asText(
    pick(item, ["MA_DK", "ma_dk", "MaDK", "Mã_đk", "maDk"])
  );

  const soCmt = asText(
    pick(item, ["SO_CMT", "so_cmt", "SoCmt", "CCCD", "cccd"])
  );

  const hoVaTen = asText(
    pick(item, [
      "HO_VA_TEN",
      "ho_va_ten",
      "HoVaTen",
      "HO_TEN",
      "ho_ten",
      "HoTen",
    ])
  );

  if (!maDk || !hoVaTen) {
    skipped++;
    continue;
  }

  const ngaySinh = toDate(
    asText(
      pick(item, [
        "NGAY_SINH",
        "ngay_sinh",
        "NgaySinh",
        "NGAYSINH",
        "ngaysinh",
      ])
    )
  );

  const soDienThoai = asText(
    pick(item, [
      "SO_DIEN_THOAI",
      "so_dien_thoai",
      "SoDienThoai",
      "DIEN_THOAI",
      "dien_thoai",
    ])
  );

  const hangGplx = asText(
    pick(item, ["HANG_GPLX", "hang_gplx", "HangGPLX"])
  );

  const hangDaoTao = asText(
    pick(item, ["HANG_DAO_TAO", "hang_dao_tao", "HangDaoTao"])
  );

  const ngayNhanHoSo = toDate(
    asText(
      pick(item, [
        "NGAY_NHAN_HO_SO",
        "ngay_nhan_ho_so",
        "NgayNhanHoSo",
      ])
    )
  );

  // ====== KHÓA HỌC ======
  const maKhoaHoc = asText(
    pick(item, [
      "MA_KHOA_HOC",
      "ma_khoa_hoc",
      "MaKhoaHoc",
      "MA_LOP",
      "ma_lop",
      "MaLop",
      "KHOA",
      "khoa",
    ])
  );

  const tenKhoaHoc = asText(
    pick(item, [
      "TEN_KHOA_HOC",
      "ten_khoa_hoc",
      "TenKhoaHoc",
      "TEN_LOP",
      "ten_lop",
      "TenLop",
    ])
  );

  let courseId: string | null = null;

  if (maKhoaHoc || tenKhoaHoc) {
    const existingCourse = await prisma.course.findFirst({
      where: {
        OR: [
          ...(maKhoaHoc ? [{ maKhoaHoc }] : []),
          ...(tenKhoaHoc ? [{ tenKhoaHoc }] : []),
        ],
      },
    });

    if (existingCourse) {
      const updatedCourse = await prisma.course.update({
        where: { id: existingCourse.id },
        data: {
          maKhoaHoc: maKhoaHoc || existingCourse.maKhoaHoc,
          tenKhoaHoc: tenKhoaHoc || existingCourse.tenKhoaHoc,
          hangDaoTao: hangDaoTao || existingCourse.hangDaoTao,
        },
      });

      courseId = updatedCourse.id;
    } else if (maKhoaHoc) {
      const createdCourse = await prisma.course.create({
        data: {
          maKhoaHoc,
          tenKhoaHoc: tenKhoaHoc || null,
          hangDaoTao: hangDaoTao || null,
        },
      });

      courseId = createdCourse.id;
    }
  }

  const existing = await prisma.student.findFirst({
    where: {
      OR: [
        { maDk },
        ...(soCmt ? [{ soCmt }] : []),
      ],
    },
  });

  if (existing) {
    await prisma.student.update({
      where: { id: existing.id },
      data: {
        maDk,
        soCmt: soCmt || existing.soCmt,
        hoVaTen,
        ngaySinh: ngaySinh || existing.ngaySinh,
        soDienThoai: soDienThoai || existing.soDienThoai,
        hangGplx: hangGplx || existing.hangGplx,
        hangDaoTao: hangDaoTao || existing.hangDaoTao,
        ngayNhanHoSo: ngayNhanHoSo || existing.ngayNhanHoSo,
        ghiChu: note || existing.ghiChu,
        courseId: courseId || existing.courseId,
      },
    });
    updated++;
  } else {
    await prisma.student.create({
      data: {
        maDk,
        soCmt: soCmt || null,
        hoVaTen,
        ngaySinh,
        soDienThoai: soDienThoai || null,
        hangGplx: hangGplx || null,
        hangDaoTao: hangDaoTao || null,
        ngayNhanHoSo,
        ghiChu: note || null,
        courseId,
      },
    });
    created++;
  }
}