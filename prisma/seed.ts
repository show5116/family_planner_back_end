import { PrismaClient, PermissionCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. 권한 정의 생성
  const permissions = [
    // BASIC 카테고리
    {
      code: 'VIEW',
      name: '조회',
      description: '그룹 정보 및 컨텐츠 조회',
      category: PermissionCategory.BASIC,
      isActive: true,
    },
    {
      code: 'CREATE',
      name: '생성',
      description: '새로운 컨텐츠 생성',
      category: PermissionCategory.BASIC,
      isActive: true,
    },
    {
      code: 'UPDATE',
      name: '수정',
      description: '기존 컨텐츠 수정',
      category: PermissionCategory.BASIC,
      isActive: true,
    },
    {
      code: 'DELETE',
      name: '삭제',
      description: '컨텐츠 삭제',
      category: PermissionCategory.BASIC,
      isActive: true,
    },
    // INVITE 카테고리
    {
      code: 'INVITE',
      name: '초대',
      description: '그룹에 새 멤버 초대',
      category: PermissionCategory.INVITE,
      isActive: true,
    },
    {
      code: 'REGENERATE_INVITE_CODE',
      name: '초대 코드 재생성',
      description: '그룹 초대 코드 재발급',
      category: PermissionCategory.INVITE,
      isActive: true,
    },
    // MEMBER 카테고리
    {
      code: 'MANAGE_MEMBER',
      name: '멤버 관리',
      description: '멤버 추가, 삭제 및 역할 변경',
      category: PermissionCategory.MEMBER,
      isActive: true,
    },
    {
      code: 'REMOVE_MEMBER',
      name: '멤버 삭제',
      description: '그룹에서 멤버 제거',
      category: PermissionCategory.MEMBER,
      isActive: true,
    },
    // ROLE 카테고리
    {
      code: 'MANAGE_ROLE',
      name: '역할 관리',
      description: '커스텀 역할 생성 및 권한 설정',
      category: PermissionCategory.ROLE,
      isActive: true,
    },
    {
      code: 'ASSIGN_ROLE',
      name: '역할 할당',
      description: '멤버에게 역할 할당',
      category: PermissionCategory.ROLE,
      isActive: true,
    },
  ];

  for (const permission of permissions) {
    const existingPermission = await prisma.permission.findUnique({
      where: { code: permission.code },
    });

    if (!existingPermission) {
      await prisma.permission.create({
        data: permission,
      });
      console.log(`Created permission: ${permission.code}`);
    } else {
      console.log(`Permission already exists: ${permission.code}`);
    }
  }

  // 2. 기본 역할(공통 역할) 생성 - groupId가 null
  const roles: Array<{
    name: string;
    groupId: string | null;
    isDefaultRole: boolean;
    isImmutable: boolean;
    permissions: string;
  }> = [
    {
      name: 'OWNER',
      groupId: null,
      isDefaultRole: false, // OWNER는 그룹 생성 시에만 자동 부여
      isImmutable: true, // 수정 불가능한 역할
      permissions: JSON.stringify([
        'VIEW',
        'CREATE',
        'UPDATE',
        'DELETE',
        'INVITE',
        'MANAGE_MEMBER',
        'MANAGE_ROLE',
      ]),
    },
    {
      name: 'ADMIN',
      groupId: null,
      isDefaultRole: false,
      isImmutable: true, // 수정 불가능한 역할
      permissions: JSON.stringify([
        'VIEW',
        'CREATE',
        'UPDATE',
        'INVITE',
        'MANAGE_MEMBER',
      ]),
    },
    {
      name: 'MEMBER',
      groupId: null,
      isDefaultRole: true, // 기본 초대 시 MEMBER 역할 자동 부여
      isImmutable: true, // 수정 불가능한 역할
      permissions: JSON.stringify(['VIEW']),
    },
  ];

  for (const role of roles) {
    const existingRole = await prisma.role.findFirst({
      where: {
        name: role.name,
        groupId: role.groupId,
      },
    });

    if (!existingRole) {
      await prisma.role.create({
        data: role,
      });
      console.log(`Created role: ${role.name}`);
    } else {
      console.log(`Role already exists: ${role.name}`);
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
