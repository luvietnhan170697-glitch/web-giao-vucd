const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = "admin";
  const password = "17061997";
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    await prisma.user.update({
      where: { username },
      data: {
        passwordHash,
        fullName: "Quản trị viên",
        role: "admin",
        isActive: true,
      },
    });

    console.log("Đã cập nhật lại tài khoản admin");
    console.log("username: admin");
    console.log("password: 17061997");
    return;
  }

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      fullName: "Quản trị viên",
      role: "admin",
      isActive: true,
    },
  });

  console.log("Đã tạo tài khoản admin");
  console.log("username: admin");
  console.log("password: 17061997");
}

main()
  .catch((e) => {
    console.error("Lỗi tạo admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });