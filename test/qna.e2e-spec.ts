/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { QuestionCategory } from '@/qna/enums/question-category.enum';
import { QuestionVisibility } from '@/qna/enums/question-visibility.enum';
import { QuestionStatus } from '@/qna/enums/question-status.enum';

describe('QnaController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 테스트 사용자 및 데이터
  let adminUser: any;
  let user1: any;
  let user2: any;
  let adminToken: string;
  let user1Token: string;
  let user2Token: string;
  let publicQuestionId: string;
  let privateQuestionId: string;

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
        email: 'admin@qna-test.com',
        name: 'QNA관리자',
        isAdmin: true,
      },
    });

    user1 = await prisma.user.create({
      data: {
        email: 'user1@qna-test.com',
        name: '사용자1',
        isAdmin: false,
      },
    });

    user2 = await prisma.user.create({
      data: {
        email: 'user2@qna-test.com',
        name: '사용자2',
        isAdmin: false,
      },
    });

    adminToken = `Bearer ${adminUser.id}`;
    user1Token = `Bearer ${user1.id}`;
    user2Token = `Bearer ${user2.id}`;
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await prisma.answer.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin@qna-test.com',
            'user1@qna-test.com',
            'user2@qna-test.com',
          ],
        },
      },
    });

    await app.close();
  });

  describe('POST /qna/questions (질문 작성)', () => {
    it('공개 질문 작성 성공', async () => {
      const createDto = {
        title: '앱이 자꾸 종료돼요',
        content: '홈 화면에서 특정 버튼을 누르면 앱이 종료됩니다.',
        category: QuestionCategory.BUG,
        visibility: QuestionVisibility.PUBLIC,
        attachments: [
          {
            url: 'https://example.com/screenshot.png',
            name: 'screenshot.png',
            size: 2048,
          },
        ],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/qna/questions')
        .set('Authorization', user1Token)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: createDto.title,
        content: createDto.content,
        category: QuestionCategory.BUG,
        visibility: QuestionVisibility.PUBLIC,
        status: QuestionStatus.PENDING,
        userId: user1.id,
      });

      publicQuestionId = response.body.id;
    });

    it('비공개 질문 작성 성공', async () => {
      const createDto = {
        title: '개인정보 관련 문의',
        content: '비공개 내용',
        category: QuestionCategory.ACCOUNT,
        visibility: QuestionVisibility.PRIVATE,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/qna/questions')
        .set('Authorization', user1Token)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        visibility: QuestionVisibility.PRIVATE,
        status: QuestionStatus.PENDING,
      });

      privateQuestionId = response.body.id;
    });

    it('제목/내용 누락 시 400 에러', async () => {
      const invalidDto = {
        category: QuestionCategory.BUG,
      };

      await request
        .default(app.getHttpServer())
        .post('/qna/questions')
        .set('Authorization', user1Token)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /qna/public-questions (공개 질문 목록 조회)', () => {
    beforeAll(async () => {
      // 추가 공개 질문 생성
      await prisma.question.createMany({
        data: [
          {
            userId: user2.id,
            title: '공개 질문 1',
            content: '내용 1',
            category: QuestionCategory.FEATURE,
            visibility: QuestionVisibility.PUBLIC,
          },
          {
            userId: user2.id,
            title: '공개 질문 2',
            content: '내용 2',
            category: QuestionCategory.USAGE,
            visibility: QuestionVisibility.PUBLIC,
          },
        ],
      });
    });

    it('공개 질문만 조회됨', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/qna/public-questions')
        .set('Authorization', user1Token)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            visibility: QuestionVisibility.PUBLIC,
          }),
        ]),
      );

      // 비공개 질문이 포함되지 않았는지 확인
      const hasPrivate = response.body.data.some(
        (q: any) => q.visibility === QuestionVisibility.PRIVATE,
      );
      expect(hasPrivate).toBe(false);
    });

    it('검색어로 제목/내용 검색', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/qna/public-questions')
        .set('Authorization', user1Token)
        .query({ page: 1, limit: 20, search: '종료' })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].title).toContain('종료');
    });

    it('카테고리 필터링', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/qna/public-questions')
        .set('Authorization', user1Token)
        .query({ page: 1, limit: 20, category: QuestionCategory.BUG })
        .expect(200);

      expect(
        response.body.data.every(
          (q: any) => q.category === QuestionCategory.BUG,
        ),
      ).toBe(true);
    });

    it('상태 필터링', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/qna/public-questions')
        .set('Authorization', user1Token)
        .query({ page: 1, limit: 20, status: QuestionStatus.PENDING })
        .expect(200);

      expect(
        response.body.data.every(
          (q: any) => q.status === QuestionStatus.PENDING,
        ),
      ).toBe(true);
    });

    it('내용 미리보기 100자 제한', async () => {
      // 긴 내용의 질문 생성
      const longContent = 'a'.repeat(200);
      const question = await prisma.question.create({
        data: {
          userId: user1.id,
          title: '긴 내용 테스트',
          content: longContent,
          category: QuestionCategory.ETC,
          visibility: QuestionVisibility.PUBLIC,
        },
      });

      const response = await request
        .default(app.getHttpServer())
        .get('/qna/public-questions')
        .set('Authorization', user1Token)
        .query({ page: 1, limit: 20 })
        .expect(200);

      const found = response.body.data.find((q: any) => q.id === question.id);
      expect(found.content.length).toBe(100);
    });
  });

  describe('GET /qna/my-questions (내 질문 목록 조회)', () => {
    it('본인 질문만 조회됨', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/qna/my-questions')
        .set('Authorization', user1Token)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.data.every((q: any) => q.userId === user1.id)).toBe(
        true,
      );
    });

    it('공개/비공개 질문 모두 포함', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/qna/my-questions')
        .set('Authorization', user1Token)
        .query({ page: 1, limit: 20 })
        .expect(200);

      const publicCount = response.body.data.filter(
        (q: any) => q.visibility === QuestionVisibility.PUBLIC,
      ).length;
      const privateCount = response.body.data.filter(
        (q: any) => q.visibility === QuestionVisibility.PRIVATE,
      ).length;

      expect(publicCount).toBeGreaterThan(0);
      expect(privateCount).toBeGreaterThan(0);
    });
  });

  describe('GET /qna/questions/:id (질문 상세 조회)', () => {
    it('공개 질문은 누구나 조회 가능', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/qna/questions/${publicQuestionId}`)
        .set('Authorization', user2Token)
        .expect(200);

      expect(response.body).toMatchObject({
        id: publicQuestionId,
        visibility: QuestionVisibility.PUBLIC,
      });
    });

    it('비공개 질문은 작성자만 조회 가능', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/qna/questions/${privateQuestionId}`)
        .set('Authorization', user1Token)
        .expect(200);

      expect(response.body).toMatchObject({
        id: privateQuestionId,
        visibility: QuestionVisibility.PRIVATE,
      });
    });

    it('비공개 질문을 타인이 조회 시 403', async () => {
      await request
        .default(app.getHttpServer())
        .get(`/qna/questions/${privateQuestionId}`)
        .set('Authorization', user2Token)
        .expect(403);
    });

    it('ADMIN은 모든 질문 조회 가능', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/qna/questions/${privateQuestionId}`)
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body.id).toBe(privateQuestionId);
    });

    it('존재하지 않는 질문 조회 시 404', async () => {
      await request
        .default(app.getHttpServer())
        .get('/qna/questions/non-existent-id')
        .set('Authorization', user1Token)
        .expect(404);
    });
  });

  describe('PUT /qna/questions/:id (질문 수정)', () => {
    let editableQuestionId: string;

    beforeAll(async () => {
      // 수정 테스트용 질문 생성
      const question = await prisma.question.create({
        data: {
          userId: user1.id,
          title: '수정 테스트 질문',
          content: '원본 내용',
          category: QuestionCategory.BUG,
          visibility: QuestionVisibility.PUBLIC,
          status: QuestionStatus.PENDING,
        },
      });
      editableQuestionId = question.id;
    });

    it('PENDING 상태의 본인 질문 수정 성공', async () => {
      const updateDto = {
        title: '수정된 제목',
        content: '수정된 내용',
        category: QuestionCategory.FEATURE,
      };

      const response = await request
        .default(app.getHttpServer())
        .put(`/qna/questions/${editableQuestionId}`)
        .set('Authorization', user1Token)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: editableQuestionId,
        title: updateDto.title,
        content: updateDto.content,
        category: QuestionCategory.FEATURE,
      });
    });

    it('타인의 질문 수정 시 403', async () => {
      const updateDto = {
        title: '타인 수정 시도',
      };

      await request
        .default(app.getHttpServer())
        .put(`/qna/questions/${editableQuestionId}`)
        .set('Authorization', user2Token)
        .send(updateDto)
        .expect(403);
    });

    it('ANSWERED 상태에서는 수정 불가 (400)', async () => {
      // 질문을 ANSWERED 상태로 변경
      await prisma.question.update({
        where: { id: editableQuestionId },
        data: { status: QuestionStatus.ANSWERED },
      });

      const updateDto = {
        title: 'ANSWERED 상태 수정 시도',
      };

      await request
        .default(app.getHttpServer())
        .put(`/qna/questions/${editableQuestionId}`)
        .set('Authorization', user1Token)
        .send(updateDto)
        .expect(400);

      // 원상복구
      await prisma.question.update({
        where: { id: editableQuestionId },
        data: { status: QuestionStatus.PENDING },
      });
    });
  });

  describe('DELETE /qna/questions/:id (질문 삭제)', () => {
    let deletableQuestionId: string;

    beforeAll(async () => {
      // 삭제 테스트용 질문 생성
      const question = await prisma.question.create({
        data: {
          userId: user1.id,
          title: '삭제 테스트 질문',
          content: '삭제될 질문',
          category: QuestionCategory.ETC,
          visibility: QuestionVisibility.PUBLIC,
        },
      });
      deletableQuestionId = question.id;
    });

    it('본인 질문 삭제 성공 (soft delete)', async () => {
      await request
        .default(app.getHttpServer())
        .delete(`/qna/questions/${deletableQuestionId}`)
        .set('Authorization', user1Token)
        .expect(200);

      // Soft delete 확인
      const deletedQuestion = await prisma.question.findUnique({
        where: { id: deletableQuestionId },
      });

      expect(deletedQuestion?.deletedAt).toBeDefined();
    });

    it('삭제된 질문은 목록에 노출되지 않음', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/qna/public-questions')
        .set('Authorization', user1Token)
        .query({ page: 1, limit: 100 })
        .expect(200);

      const found = response.body.data.find(
        (q: any) => q.id === deletableQuestionId,
      );

      expect(found).toBeUndefined();
    });

    it('타인의 질문 삭제 시 403', async () => {
      await request
        .default(app.getHttpServer())
        .delete(`/qna/questions/${publicQuestionId}`)
        .set('Authorization', user2Token)
        .expect(403);
    });
  });

  describe('PATCH /qna/questions/:id/resolve (질문 해결 완료)', () => {
    let resolvableQuestionId: string;

    beforeAll(async () => {
      // 해결 테스트용 질문 생성 (ANSWERED 상태)
      const question = await prisma.question.create({
        data: {
          userId: user1.id,
          title: '해결 테스트 질문',
          content: '내용',
          category: QuestionCategory.BUG,
          visibility: QuestionVisibility.PUBLIC,
          status: QuestionStatus.ANSWERED,
        },
      });
      resolvableQuestionId = question.id;
    });

    it('ANSWERED 상태에서 RESOLVED로 변경 성공', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/qna/questions/${resolvableQuestionId}/resolve`)
        .set('Authorization', user1Token)
        .expect(200);

      expect(response.body.status).toBe(QuestionStatus.RESOLVED);
    });

    it('PENDING 상태에서는 해결 완료 불가 (400)', async () => {
      // PENDING 상태 질문 생성
      const pendingQuestion = await prisma.question.create({
        data: {
          userId: user1.id,
          title: 'PENDING 해결 시도',
          content: '내용',
          category: QuestionCategory.BUG,
          visibility: QuestionVisibility.PUBLIC,
          status: QuestionStatus.PENDING,
        },
      });

      await request
        .default(app.getHttpServer())
        .patch(`/qna/questions/${pendingQuestion.id}/resolve`)
        .set('Authorization', user1Token)
        .expect(400);
    });

    it('타인의 질문 해결 완료 시도 시 403', async () => {
      const otherUserQuestion = await prisma.question.create({
        data: {
          userId: user2.id,
          title: '타인 질문',
          content: '내용',
          category: QuestionCategory.BUG,
          visibility: QuestionVisibility.PUBLIC,
          status: QuestionStatus.ANSWERED,
        },
      });

      await request
        .default(app.getHttpServer())
        .patch(`/qna/questions/${otherUserQuestion.id}/resolve`)
        .set('Authorization', user1Token)
        .expect(403);
    });
  });

  describe('POST /qna/admin/questions/:questionId/answers (답변 작성 - ADMIN)', () => {
    let answerableQuestionId: string;

    beforeAll(async () => {
      // 답변 테스트용 질문 생성
      const question = await prisma.question.create({
        data: {
          userId: user1.id,
          title: '답변 테스트 질문',
          content: '답변 부탁드립니다',
          category: QuestionCategory.FEATURE,
          visibility: QuestionVisibility.PUBLIC,
          status: QuestionStatus.PENDING,
        },
      });
      answerableQuestionId = question.id;
    });

    it('ADMIN이 답변 작성 성공 및 질문 상태 ANSWERED로 변경', async () => {
      const createAnswerDto = {
        content: '답변 내용입니다',
        attachments: [
          {
            url: 'https://example.com/guide.pdf',
            name: 'guide.pdf',
            size: 5120,
          },
        ],
      };

      const response = await request
        .default(app.getHttpServer())
        .post(`/qna/admin/questions/${answerableQuestionId}/answers`)
        .set('Authorization', adminToken)
        .send(createAnswerDto)
        .expect(201);

      expect(response.body).toMatchObject({
        content: createAnswerDto.content,
        questionId: answerableQuestionId,
        adminId: adminUser.id,
      });

      // 질문 상태 확인
      const updatedQuestion = await prisma.question.findUnique({
        where: { id: answerableQuestionId },
      });

      expect(updatedQuestion?.status).toBe(QuestionStatus.ANSWERED);
    });

    it('일반 사용자는 답변 작성 불가 (403)', async () => {
      const createAnswerDto = {
        content: '일반 사용자 답변 시도',
      };

      await request
        .default(app.getHttpServer())
        .post(`/qna/admin/questions/${answerableQuestionId}/answers`)
        .set('Authorization', user1Token)
        .send(createAnswerDto)
        .expect(403);
    });

    it('존재하지 않는 질문에 답변 시 404', async () => {
      const createAnswerDto = {
        content: '답변',
      };

      await request
        .default(app.getHttpServer())
        .post('/qna/admin/questions/non-existent-id/answers')
        .set('Authorization', adminToken)
        .send(createAnswerDto)
        .expect(404);
    });
  });

  describe('PUT /qna/admin/answers/:id (답변 수정 - ADMIN)', () => {
    let editableAnswerId: string;
    let questionIdForAnswer: string;

    beforeAll(async () => {
      // 답변 수정 테스트용 데이터 생성
      const question = await prisma.question.create({
        data: {
          userId: user1.id,
          title: '답변 수정 테스트',
          content: '질문 내용',
          category: QuestionCategory.BUG,
          visibility: QuestionVisibility.PUBLIC,
          status: QuestionStatus.ANSWERED,
        },
      });
      questionIdForAnswer = question.id;

      const answer = await prisma.answer.create({
        data: {
          questionId: questionIdForAnswer,
          adminId: adminUser.id,
          content: '원본 답변',
        },
      });
      editableAnswerId = answer.id;
    });

    it('ADMIN이 답변 수정 성공', async () => {
      const updateDto = {
        content: '수정된 답변 내용',
      };

      const response = await request
        .default(app.getHttpServer())
        .put(`/qna/admin/answers/${editableAnswerId}`)
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: editableAnswerId,
        content: updateDto.content,
      });
    });

    it('일반 사용자는 답변 수정 불가 (403)', async () => {
      const updateDto = {
        content: '일반 사용자 수정 시도',
      };

      await request
        .default(app.getHttpServer())
        .put(`/qna/admin/answers/${editableAnswerId}`)
        .set('Authorization', user1Token)
        .send(updateDto)
        .expect(403);
    });

    it('존재하지 않는 답변 수정 시 404', async () => {
      const updateDto = {
        content: '수정',
      };

      await request
        .default(app.getHttpServer())
        .put('/qna/admin/answers/non-existent-id')
        .set('Authorization', adminToken)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('DELETE /qna/admin/answers/:id (답변 삭제 - ADMIN)', () => {
    let deletableAnswerId: string;

    beforeAll(async () => {
      // 답변 삭제 테스트용 데이터 생성
      const question = await prisma.question.create({
        data: {
          userId: user1.id,
          title: '답변 삭제 테스트',
          content: '질문',
          category: QuestionCategory.ETC,
          visibility: QuestionVisibility.PUBLIC,
          status: QuestionStatus.ANSWERED,
        },
      });

      const answer = await prisma.answer.create({
        data: {
          questionId: question.id,
          adminId: adminUser.id,
          content: '삭제될 답변',
        },
      });
      deletableAnswerId = answer.id;
    });

    it('ADMIN이 답변 삭제 성공 (soft delete)', async () => {
      await request
        .default(app.getHttpServer())
        .delete(`/qna/admin/answers/${deletableAnswerId}`)
        .set('Authorization', adminToken)
        .expect(200);

      // Soft delete 확인
      const deletedAnswer = await prisma.answer.findUnique({
        where: { id: deletableAnswerId },
      });

      expect(deletedAnswer?.deletedAt).toBeDefined();
    });

    it('일반 사용자는 답변 삭제 불가 (403)', async () => {
      await request
        .default(app.getHttpServer())
        .delete(`/qna/admin/answers/${deletableAnswerId}`)
        .set('Authorization', user1Token)
        .expect(403);
    });
  });

  describe('GET /qna/admin/questions (모든 질문 조회 - ADMIN)', () => {
    it('ADMIN은 모든 질문 조회 가능', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/qna/admin/questions')
        .set('Authorization', adminToken)
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            visibility: expect.any(String),
          }),
        ]),
      );
    });

    it('PENDING 질문이 우선 정렬', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/qna/admin/questions')
        .set('Authorization', adminToken)
        .query({ page: 1, limit: 100 })
        .expect(200);

      // PENDING 상태가 있는지 확인
      const pendingQuestions = response.body.data.filter(
        (q: any) => q.status === QuestionStatus.PENDING,
      );

      if (pendingQuestions.length > 0) {
        // 첫 번째 PENDING 질문의 인덱스
        const firstPendingIndex = response.body.data.findIndex(
          (q: any) => q.status === QuestionStatus.PENDING,
        );

        // ANSWERED 상태가 있다면
        const firstAnsweredIndex = response.body.data.findIndex(
          (q: any) => q.status === QuestionStatus.ANSWERED,
        );

        if (firstAnsweredIndex !== -1) {
          expect(firstPendingIndex).toBeLessThan(firstAnsweredIndex);
        }
      }
    });

    it('사용자명으로 검색 가능', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/qna/admin/questions')
        .set('Authorization', adminToken)
        .query({ page: 1, limit: 20, search: '사용자1' })
        .expect(200);

      expect(
        response.body.data.every((q: any) => q.user.name === '사용자1'),
      ).toBe(true);
    });

    it('일반 사용자는 접근 불가 (403)', async () => {
      await request
        .default(app.getHttpServer())
        .get('/qna/admin/questions')
        .set('Authorization', user1Token)
        .query({ page: 1, limit: 20 })
        .expect(403);
    });
  });

  describe('GET /qna/admin/statistics (통계 조회 - ADMIN)', () => {
    it('ADMIN이 통계 조회 성공', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/qna/admin/statistics')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toMatchObject({
        totalQuestions: expect.any(Number),
        statusStats: {
          pending: expect.any(Number),
          answered: expect.any(Number),
          resolved: expect.any(Number),
        },
        categoryStats: expect.any(Array),
        recentQuestions: expect.any(Array),
      });
    });

    it('일반 사용자는 통계 조회 불가 (403)', async () => {
      await request
        .default(app.getHttpServer())
        .get('/qna/admin/statistics')
        .set('Authorization', user1Token)
        .expect(403);
    });
  });
});
