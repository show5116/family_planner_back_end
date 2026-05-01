import {
  PrismaClient,
  PermissionCategory,
  PermissionCode,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.permission.upsert({
    where: { code: PermissionCode.MANAGE_CHILDCARE },
    update: {},
    create: {
      code: PermissionCode.MANAGE_CHILDCARE,
      name: '자녀 관리',
      description: '육아 포인트 계정 및 자녀 프로필을 관리합니다',
      category: PermissionCategory.CHILDCARE,
      sortOrder: 20,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
