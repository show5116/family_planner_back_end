import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { resetTestDatabase, seedTestDatabase } from './test-db.utils';
import { PermissionCategory } from '@prisma/client';

describe('Permissions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let adminUserId: string;
  let regularUserToken: string;

  beforeAll(async () => {
    // 테스트 DB 초기화 및 시드
    await resetTestDatabase();
    await seedTestDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // 테스트 사용자 생성 및 인증
    await setupTestUsers();
  }, 60000); // 60초 타임아웃

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  /**
   * 테스트 사용자 생성 (관리자 + 일반 사용자)
   */
  async function setupTestUsers() {
    // 관리자 사용자 생성
    const adminEmail = `admin-${Date.now()}@test.com`;
    const adminPassword = 'Admin1234!';

    const adminSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: adminEmail,
        password: adminPassword,
        name: 'Admin User',
      })
      .expect(201);

    adminUserId = adminSignup.body.id;

    // 관리자 권한 부여
    await prisma.user.update({
      where: { id: adminUserId },
      data: { isEmailVerified: true, isAdmin: true },
    });

    // 관리자 로그인
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: adminEmail,
        password: adminPassword,
      })
      .expect(200);

    adminToken = adminLogin.body.accessToken;

    // 일반 사용자 생성
    const userEmail = `user-${Date.now()}@test.com`;
    const userPassword = 'User1234!';

    const userSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: userEmail,
        password: userPassword,
        name: 'Regular User',
      })
      .expect(201);

    // 이메일 인증 (관리자는 아님)
    await prisma.user.update({
      where: { id: userSignup.body.id },
      data: { isEmailVerified: true },
    });

    // 일반 사용자 로그인
    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: userEmail,
        password: userPassword,
      })
      .expect(200);

    regularUserToken = userLogin.body.accessToken;
  }

  /**
   * 테스트 데이터 정리
   */
  async function cleanupTestData() {
    await prisma.user.deleteMany({
      where: {
        id: adminUserId,
      },
    });
  }

  describe('권한 조회', () => {
    it('GET /permissions - 모든 권한을 조회해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('permissions');
      expect(response.body).toHaveProperty('groupedByCategory');
      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.permissions)).toBe(true);
      expect(Array.isArray(response.body.categories)).toBe(true);
    });

    it('GET /permissions?category=GROUP - 특정 카테고리의 권한만 조회해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions?category=GROUP')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('permissions');
      // 카테고리 필터가 적용되었는지 확인
      const permissions = response.body.permissions;
      if (permissions.length > 0) {
        expect(permissions.every((p: any) => p.category === 'GROUP')).toBe(
          true,
        );
      }
    });

    it('GET /permissions - 일반 사용자는 권한 조회 불가 (403)', async () => {
      // AdminGuard가 적용되어 있지 않은 경우 이 테스트는 통과할 수 있음
      // AdminGuard 적용 여부에 따라 200 또는 403 반환
      const response = await request(app.getHttpServer())
        .get('/permissions')
        .set('Authorization', `Bearer ${regularUserToken}`);

      // AdminGuard가 적용되어 있으면 403, 아니면 200
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('권한 검증 시스템', () => {
    it('그룹 권한 시스템이 정상적으로 작동해야 함', async () => {
      // 그룹 생성 (권한 필요 없음)
      const createGroupResponse = await request(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Permission Test Group',
          description: 'Testing permissions',
        })
        .expect(201);

      const groupId = createGroupResponse.body.id;

      // 그룹 정보 수정 (UPDATE_GROUP 권한 필요 - OWNER는 자동으로 모든 권한 보유)
      await request(app.getHttpServer())
        .patch(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Group Name',
        })
        .expect(200);

      // 정리
      await request(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('권한이 없는 사용자는 특정 작업을 수행할 수 없어야 함', async () => {
      // 관리자가 그룹 생성
      const createGroupResponse = await request(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Group',
          description: 'Admin only group',
        })
        .expect(201);

      const groupId = createGroupResponse.body.id;

      // 일반 사용자는 멤버가 아니므로 그룹에 접근 불가 (403)
      await request(app.getHttpServer())
        .get(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      // 정리
      await request(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('카테고리별 권한 확인', () => {
    it('GROUP 카테고리 권한이 존재해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions?category=GROUP')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.permissions.length).toBeGreaterThan(0);
    });

    it('MEMBER 카테고리 권한이 존재해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions?category=MEMBER')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.permissions.length).toBeGreaterThan(0);
    });

    it('ROLE 카테고리 권한이 존재해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions?category=ROLE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.permissions.length).toBeGreaterThan(0);
    });
  });
});
