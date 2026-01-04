import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { resetTestDatabase, seedTestDatabase } from './test-db.utils';

describe('Groups (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let secondUserId: string;
  let secondAuthToken: string;

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
    // 테스트 데이터 정리
    await cleanupTestData();
    await app.close();
  });

  /**
   * 테스트 사용자 생성 및 JWT 토큰 획득
   */
  async function setupTestUsers() {
    // 첫 번째 사용자 회원가입
    const email1 = `test-${Date.now()}@test.com`;
    const password1 = 'Test1234!';

    const signupRes1 = await request
      .default(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: email1,
        password: password1,
        name: 'Test User 1',
      })
      .expect(201);

    userId = signupRes1.body.id;

    // 이메일 인증 건너뛰기 (테스트용) - 직접 DB 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });

    // 로그인하여 토큰 획득
    const loginRes1 = await request
      .default(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: email1,
        password: password1,
      })
      .expect(200);

    authToken = loginRes1.body.accessToken;

    // 두 번째 사용자 회원가입 및 로그인
    const email2 = `test2-${Date.now()}@test.com`;
    const password2 = 'Test1234!';

    const signupRes2 = await request
      .default(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: email2,
        password: password2,
        name: 'Test User 2',
      })
      .expect(201);

    secondUserId = signupRes2.body.id;

    // 이메일 인증 건너뛰기 (테스트용)
    await prisma.user.update({
      where: { id: secondUserId },
      data: { isEmailVerified: true },
    });

    const loginRes2 = await request
      .default(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: email2,
        password: password2,
      })
      .expect(200);

    secondAuthToken = loginRes2.body.accessToken;
  }

  /**
   * 테스트 데이터 정리
   */
  async function cleanupTestData() {
    // 테스트 중 생성된 그룹 및 관련 데이터 삭제
    await prisma.groupMember.deleteMany({
      where: {
        OR: [{ userId }, { userId: secondUserId }],
      },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [{ id: userId }, { id: secondUserId }],
      },
    });
  }

  describe('그룹 생성 및 조회', () => {
    let groupId: string;

    it('POST /groups - 그룹을 생성해야 함', async () => {
      const createGroupDto = {
        name: 'E2E Test Family',
        description: 'E2E test group',
        defaultColor: '#FF5733',
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createGroupDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createGroupDto.name);
      expect(response.body.description).toBe(createGroupDto.description);
      expect(response.body.defaultColor).toBe(createGroupDto.defaultColor);
      expect(response.body.inviteCode).toHaveLength(8);
      expect(response.body.members).toHaveLength(1);
      expect(response.body.members[0].role.name).toBe('OWNER');

      groupId = response.body.id;
    });

    it('GET /groups - 내가 속한 그룹 목록을 조회해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('myColor');
      expect(response.body[0]).toHaveProperty('myRole');
    });

    it('GET /groups/:id - 그룹 상세 정보를 조회해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(groupId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('members');
      expect(response.body.members).toHaveLength(1);
    });

    it('GET /groups/:id - 멤버가 아니면 403을 반환해야 함', async () => {
      await request
        .default(app.getHttpServer())
        .get(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .expect(403);
    });

    it('PATCH /groups/:id - 그룹 정보를 수정해야 함 (UPDATE_GROUP 권한 필요)', async () => {
      const updateGroupDto = {
        name: 'Updated E2E Test Family',
        description: 'Updated description',
        defaultColor: '#00FF00',
      };

      const response = await request
        .default(app.getHttpServer())
        .patch(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateGroupDto)
        .expect(200);

      expect(response.body.name).toBe(updateGroupDto.name);
      expect(response.body.description).toBe(updateGroupDto.description);
      expect(response.body.defaultColor).toBe(updateGroupDto.defaultColor);
    });

    it('DELETE /groups/:id - 그룹을 삭제해야 함 (DELETE_GROUP 권한 필요)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('그룹이 삭제되었습니다');

      // 삭제된 그룹 조회 시 404
      await request
        .default(app.getHttpServer())
        .get(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('초대 코드 가입 플로우', () => {
    let groupId: string;
    let inviteCode: string;

    beforeAll(async () => {
      // 그룹 생성
      const response = await request
        .default(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invite Test Group',
          description: 'Test group for invite flow',
        })
        .expect(201);

      groupId = response.body.id;
      inviteCode = response.body.inviteCode;
    });

    afterAll(async () => {
      // 그룹 삭제
      await request
        .default(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('POST /groups/join - 초대 코드로 가입 요청을 생성해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/groups/join')
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .send({ inviteCode })
        .expect(201);

      expect(response.body.message).toBe(
        '그룹 가입 요청이 전송되었습니다. 관리자 승인을 기다려주세요.',
      );
      expect(response.body).toHaveProperty('joinRequestId');
    });

    it('POST /groups/join - 이미 가입 요청이 있으면 409를 반환해야 함', async () => {
      await request
        .default(app.getHttpServer())
        .post('/groups/join')
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .send({ inviteCode })
        .expect(409);
    });

    it('GET /groups/:id/join-requests - 가입 요청 목록을 조회해야 함 (INVITE_MEMBER 권한 필요)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/groups/${groupId}/join-requests`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].type).toBe('REQUEST');
      expect(response.body[0].status).toBe('PENDING');
    });

    it('POST /groups/:id/join-requests/:requestId/accept - 가입 요청을 승인해야 함', async () => {
      // 가입 요청 목록 조회
      const requestsResponse = await request
        .default(app.getHttpServer())
        .get(`/groups/${groupId}/join-requests`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const requestId = requestsResponse.body[0].id;

      // 가입 요청 승인
      const response = await request
        .default(app.getHttpServer())
        .post(`/groups/${groupId}/join-requests/${requestId}/accept`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.message).toBe('가입 요청이 승인되었습니다');
      expect(response.body.member).toBeDefined();

      // 두 번째 사용자가 그룹 멤버로 추가되었는지 확인
      const groupResponse = await request
        .default(app.getHttpServer())
        .get(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .expect(200);

      expect(groupResponse.body.members).toHaveLength(2);
    });

    it('POST /groups/:id/regenerate-code - 초대 코드를 재생성해야 함 (REGENERATE_INVITE_CODE 권한 필요)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post(`/groups/${groupId}/regenerate-code`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.inviteCode).toHaveLength(8);
      expect(response.body.inviteCode).not.toBe(inviteCode);
      expect(response.body).toHaveProperty('inviteCodeExpiresAt');
    });
  });

  describe('이메일 초대 플로우', () => {
    let groupId: string;
    let inviteCode: string;

    beforeAll(async () => {
      // 그룹 생성
      const response = await request
        .default(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Email Invite Test Group',
          description: 'Test group for email invite flow',
        })
        .expect(201);

      groupId = response.body.id;
      inviteCode = response.body.inviteCode;
    });

    afterAll(async () => {
      // 그룹 삭제
      await request
        .default(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('POST /groups/:id/invite-by-email - 이메일로 초대를 보내야 함 (INVITE_MEMBER 권한 필요)', async () => {
      // 두 번째 사용자의 이메일 조회
      const user = await prisma.user.findUnique({
        where: { id: secondUserId },
      });

      const response = await request
        .default(app.getHttpServer())
        .post(`/groups/${groupId}/invite-by-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: user.email })
        .expect(201);

      expect(response.body.message).toBe('초대 이메일이 발송되었습니다');
      expect(response.body.email).toBe(user.email);
      expect(response.body).toHaveProperty('joinRequestId');
    });

    it('POST /groups/join - 이메일로 초대받은 사용자는 즉시 가입되어야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .post('/groups/join')
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .send({ inviteCode })
        .expect(201);

      expect(response.body.message).toBe('그룹 가입이 완료되었습니다');
      expect(response.body.member).toBeDefined();
    });

    it('GET /groups/:id/join-requests - 초대 요청 목록을 조회해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/groups/${groupId}/join-requests`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // 이미 승인된 초대가 있어야 함
      const acceptedInvite = response.body.find(
        (req: any) => req.type === 'INVITE' && req.status === 'ACCEPTED',
      );
      expect(acceptedInvite).toBeDefined();
    });
  });

  describe('멤버 관리 플로우', () => {
    let groupId: string;

    beforeAll(async () => {
      // 그룹 생성
      const response = await request
        .default(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Member Management Test Group',
          description: 'Test group for member management',
        })
        .expect(201);

      groupId = response.body.id;

      // 두 번째 사용자를 멤버로 추가
      const user = await prisma.user.findUnique({
        where: { id: secondUserId },
      });

      await request
        .default(app.getHttpServer())
        .post(`/groups/${groupId}/invite-by-email`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: user.email })
        .expect(201);

      await request
        .default(app.getHttpServer())
        .post('/groups/join')
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .send({ inviteCode: response.body.inviteCode })
        .expect(201);
    });

    afterAll(async () => {
      // 그룹 삭제
      await request
        .default(app.getHttpServer())
        .delete(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('GET /groups/:id/members - 그룹 멤버 목록을 조회해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('user');
      expect(response.body[0]).toHaveProperty('role');
    });

    it('PATCH /groups/:id/my-color - 개인 그룹 색상을 설정해야 함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/groups/${groupId}/my-color`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .send({ customColor: '#123456' })
        .expect(200);

      expect(response.body.customColor).toBe('#123456');
    });

    it('DELETE /groups/:id/members/:userId - 멤버를 삭제해야 함 (REMOVE_MEMBER 권한 필요)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/groups/${groupId}/members/${secondUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('멤버가 삭제되었습니다');

      // 삭제된 멤버는 그룹에 접근할 수 없음
      await request
        .default(app.getHttpServer())
        .get(`/groups/${groupId}`)
        .set('Authorization', `Bearer ${secondAuthToken}`)
        .expect(403);
    });
  });
});
