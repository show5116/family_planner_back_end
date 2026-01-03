import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

/**
 * 테스트 데이터베이스 초기화
 * 모든 테이블 데이터를 삭제하고 초기 상태로 리셋
 */
export async function resetTestDatabase() {
  try {
    // 외래 키 제약 조건 비활성화
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

    // 모든 테이블 데이터 삭제 (순서 중요)
    await prisma.groupJoinRequest.deleteMany();
    await prisma.groupMember.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();

    // 외래 키 제약 조건 활성화
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('✅ Test database reset completed');
  } catch (error) {
    console.error('❌ Failed to reset test database:', error);
    throw error;
  }
}

/**
 * 테스트 데이터베이스 시드
 * 기본 역할(Roles) 등 필수 데이터 생성
 */
export async function seedTestDatabase() {
  try {
    // 기본 역할 생성 (OWNER, ADMIN, MEMBER)
    const roles = [
      {
        name: 'OWNER',
        groupId: null,
        isDefaultRole: false,
        permissions: [
          'READ_GROUP',
          'UPDATE_GROUP',
          'DELETE_GROUP',
          'INVITE_MEMBER',
          'REMOVE_MEMBER',
          'ASSIGN_ROLE',
          'MANAGE_ROLE',
          'REGENERATE_INVITE_CODE',
        ],
      },
      {
        name: 'ADMIN',
        groupId: null,
        isDefaultRole: false,
        permissions: [
          'READ_GROUP',
          'UPDATE_GROUP',
          'INVITE_MEMBER',
          'REMOVE_MEMBER',
          'ASSIGN_ROLE',
        ],
      },
      {
        name: 'MEMBER',
        groupId: null,
        isDefaultRole: true,
        permissions: ['READ_GROUP'],
      },
    ];

    for (const role of roles) {
      await prisma.role.upsert({
        where: { name_groupId: { name: role.name, groupId: null } },
        update: {},
        create: role,
      });
    }

    console.log('✅ Test database seeded with default roles');
  } catch (error) {
    console.error('❌ Failed to seed test database:', error);
    throw error;
  }
}

/**
 * 테스트 데이터베이스 마이그레이션 실행
 */
export function runTestMigrations() {
  try {
    console.log('🔄 Running test database migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env },
    });
    console.log('✅ Test database migrations completed');
  } catch (error) {
    console.error('❌ Failed to run migrations:', error);
    throw error;
  }
}

/**
 * 테스트 데이터베이스 연결 종료
 */
export async function disconnectTestDatabase() {
  await prisma.$disconnect();
}

/**
 * 전체 테스트 데이터베이스 설정
 * 마이그레이션 → 리셋 → 시드
 */
export async function setupTestDatabase() {
  try {
    runTestMigrations();
    await resetTestDatabase();
    await seedTestDatabase();
    console.log('✅ Test database setup completed\n');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
}
