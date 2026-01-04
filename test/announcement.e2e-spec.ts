import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { AnnouncementCategory } from '@prisma/client';

describe('AnnouncementController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 테스트 사용자 및 데이터
  let adminUser: any;
  let normalUser: any;
  let adminToken: string;
  let normalToken: string;
  let createdAnnouncementId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // 테스트 사용자 생성
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: '관리자',
        isAdmin: true,
      },
    });

    normalUser = await prisma.user.create({
      data: {
        email: 'user@test.com',
        name: '일반사용자',
        isAdmin: false,
      },
    });

    // 실제 환경에서는 JWT 토큰 발급 필요
    // 여기서는 간단히 userId를 토큰으로 사용
    adminToken = `Bearer ${adminUser.id}`;
    normalToken = `Bearer ${normalUser.id}`;
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.announcementRead.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ['admin@test.com', 'user@test.com'] } },
    });

    await app.close();
  });

  describe('POST /announcements (공지사항 작성)', () => {
    it('ADMIN이 공지사항 작성 성공', async () => {
      const createDto = {
        title: '중요 공지사항',
        content: '시스템 점검 안내',
        isPinned: true,
        attachments: [
          {
            url: 'https://example.com/file.pdf',
            name: 'notice.pdf',
            size: 1024,
          },
        ],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', adminToken)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: createDto.title,
        content: createDto.content,
        isPinned: true,
        authorId: adminUser.id,
      });

      createdAnnouncementId = response.body.id;
    });

    it('일반 사용자는 공지사항 작성 불가 (403)', async () => {
      const createDto = {
        title: '일반 사용자 공지',
        content: '내용',
      };

      await request
        .default(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', normalToken)
        .send(createDto)
        .expect(403);
    });

    it('제목 누락 시 400 에러', async () => {
      const invalidDto = {
        content: '내용만 있음',
      };

      await request
        .default(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', adminToken)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /announcements (공지사항 목록 조회)', () => {
    beforeAll(async () => {
      // 추가 테스트 데이터 생성
      await prisma.announcement.createMany({
        data: [
          {
            authorId: adminUser.id,
            title: '일반 공지 1',
            content: '내용 1',
            category: AnnouncementCategory.ANNOUNCEMENT,
            isPinned: false,
          },
          {
            authorId: adminUser.id,
            title: '일반 공지 2',
            content: '내용 2',
            category: AnnouncementCategory.ANNOUNCEMENT,
            isPinned: false,
          },
        ],
      });
    });

    it('공지사항 목록 조회 성공', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/announcements')
        .set('Authorization', normalToken)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        meta: expect.objectContaining({
          page: 1,
          limit: 20,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        }),
      });

      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('고정 공지만 조회 (pinnedOnly=true)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/announcements')
        .set('Authorization', normalToken)
        .query({ page: 1, limit: 20, pinnedOnly: true })
        .expect(200);

      expect(response.body.data.every((item: any) => item.isPinned)).toBe(true);
    });

    it('고정 공지가 우선 정렬', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/announcements')
        .set('Authorization', normalToken)
        .query({ page: 1, limit: 20 })
        .expect(200);

      const pinnedItems = response.body.data.filter(
        (item: any) => item.isPinned,
      );
      const nonPinnedItems = response.body.data.filter(
        (item: any) => !item.isPinned,
      );

      // 고정 공지가 먼저 나와야 함
      if (pinnedItems.length > 0 && nonPinnedItems.length > 0) {
        const lastPinnedIndex = response.body.data.indexOf(
          pinnedItems[pinnedItems.length - 1],
        );
        const firstNonPinnedIndex = response.body.data.indexOf(
          nonPinnedItems[0],
        );
        expect(lastPinnedIndex).toBeLessThan(firstNonPinnedIndex);
      }
    });
  });

  describe('GET /announcements/:id (공지사항 상세 조회)', () => {
    it('공지사항 상세 조회 성공 및 자동 읽음 처리', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', normalToken)
        .expect(200);

      expect(response.body).toMatchObject({
        id: createdAnnouncementId,
        title: expect.any(String),
        content: expect.any(String),
        readCount: expect.any(Number),
      });

      // 읽음 기록 확인
      const readRecord = await prisma.announcementRead.findFirst({
        where: {
          announcementId: createdAnnouncementId,
          userId: normalUser.id,
        },
      });

      expect(readRecord).toBeDefined();
    });

    it('존재하지 않는 공지사항 조회 시 404', async () => {
      await request
        .default(app.getHttpServer())
        .get('/announcements/non-existent-id')
        .set('Authorization', normalToken)
        .expect(404);
    });

    it('중복 읽음 처리 시 upsert로 하나만 생성', async () => {
      // 첫 번째 조회
      await request
        .default(app.getHttpServer())
        .get(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', normalToken)
        .expect(200);

      // 두 번째 조회
      await request
        .default(app.getHttpServer())
        .get(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', normalToken)
        .expect(200);

      // 읽음 기록이 하나만 있는지 확인
      const readRecords = await prisma.announcementRead.findMany({
        where: {
          announcementId: createdAnnouncementId,
          userId: normalUser.id,
        },
      });

      expect(readRecords).toHaveLength(1);
    });
  });

  describe('PUT /announcements/:id (공지사항 수정)', () => {
    it('ADMIN이 공지사항 수정 성공', async () => {
      const updateDto = {
        title: '수정된 제목',
        content: '수정된 내용',
        isPinned: false,
      };

      const response = await request
        .default(app.getHttpServer())
        .put(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: createdAnnouncementId,
        title: updateDto.title,
        content: updateDto.content,
        isPinned: false,
      });
    });

    it('일반 사용자는 공지사항 수정 불가 (403)', async () => {
      const updateDto = {
        title: '일반 사용자 수정 시도',
      };

      await request
        .default(app.getHttpServer())
        .put(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', normalToken)
        .send(updateDto)
        .expect(403);
    });

    it('존재하지 않는 공지사항 수정 시 404', async () => {
      const updateDto = {
        title: '수정 시도',
      };

      await request
        .default(app.getHttpServer())
        .put('/announcements/non-existent-id')
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('PATCH /announcements/:id/pin (공지사항 고정/해제)', () => {
    it('ADMIN이 공지사항 고정 성공', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/announcements/${createdAnnouncementId}/pin`)
        .set('Authorization', adminToken)
        .send({ isPinned: true })
        .expect(200);

      expect(response.body.isPinned).toBe(true);
    });

    it('ADMIN이 공지사항 고정 해제 성공', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/announcements/${createdAnnouncementId}/pin`)
        .set('Authorization', adminToken)
        .send({ isPinned: false })
        .expect(200);

      expect(response.body.isPinned).toBe(false);
    });

    it('일반 사용자는 고정/해제 불가 (403)', async () => {
      await request
        .default(app.getHttpServer())
        .patch(`/announcements/${createdAnnouncementId}/pin`)
        .set('Authorization', normalToken)
        .send({ isPinned: true })
        .expect(403);
    });
  });

  describe('DELETE /announcements/:id (공지사항 삭제)', () => {
    let deletableAnnouncementId: string;

    beforeAll(async () => {
      // 삭제용 공지사항 생성
      const announcement = await prisma.announcement.create({
        data: {
          authorId: adminUser.id,
          title: '삭제 테스트 공지',
          content: '삭제될 공지사항',
          category: AnnouncementCategory.ANNOUNCEMENT,
        },
      });
      deletableAnnouncementId = announcement.id;
    });

    it('ADMIN이 공지사항 삭제 성공 (soft delete)', async () => {
      await request
        .default(app.getHttpServer())
        .delete(`/announcements/${deletableAnnouncementId}`)
        .set('Authorization', adminToken)
        .expect(200);

      // Soft delete 확인
      const deletedAnnouncement = await prisma.announcement.findUnique({
        where: { id: deletableAnnouncementId },
      });

      expect(deletedAnnouncement?.deletedAt).toBeDefined();
    });

    it('삭제된 공지사항은 목록에 노출되지 않음', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/announcements')
        .set('Authorization', normalToken)
        .query({ page: 1, limit: 100 })
        .expect(200);

      const found = response.body.data.find(
        (item: any) => item.id === deletableAnnouncementId,
      );

      expect(found).toBeUndefined();
    });

    it('일반 사용자는 공지사항 삭제 불가 (403)', async () => {
      await request
        .default(app.getHttpServer())
        .delete(`/announcements/${createdAnnouncementId}`)
        .set('Authorization', normalToken)
        .expect(403);
    });

    it('존재하지 않는 공지사항 삭제 시 404', async () => {
      await request
        .default(app.getHttpServer())
        .delete('/announcements/non-existent-id')
        .set('Authorization', adminToken)
        .expect(404);
    });
  });
});
