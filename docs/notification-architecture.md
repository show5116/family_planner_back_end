# 알림 시스템 아키텍처

Family Planner 백엔드의 Push Notification 시스템 설계 문서

## 1. Two-Track Push Notification System

### 개요
알림을 **즉시 발송**과 **예약 발송** 두 가지 방식으로 처리하는 Redis 기반 큐 시스템

### 구성 요소

```
┌─────────────────────────────────────────────────────────────┐
│                      클라이언트 요청                           │
└─────────────────────────────────────────────────────────────┘
                    │                       │
        ┌───────────┴──────────┐   ┌────────┴─────────┐
        │ POST /notifications  │   │ POST /schedule   │
        │   (즉시 발송)         │   │   (예약 발송)     │
        └───────────┬──────────┘   └────────┬─────────┘
                    │                       │
                    ▼                       ▼
        ┌───────────────────────┐   ┌──────────────────────┐
        │   Ready Queue (List)  │◄──│ Waiting Room (ZSet)  │
        │   즉시 발송 대기       │   │  예약 알림 대기       │
        └───────────┬───────────┘   └──────────┬───────────┘
                    │                          │
                    │          ┌───────────────┘
                    │          │ Worker (Cron 1분마다)
                    │          │ 시간 된 알림 이동
                    ▼          ▼
        ┌─────────────────────────────────────┐
        │    Worker (Cron 10초마다)            │
        │    Ready Queue 소비 & FCM 발송       │
        └─────────────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────────────┐
        │         FCM 발송 + DB 저장          │
        └─────────────────────────────────────┘
```

### Redis 데이터 구조

#### Ready Queue (즉시 발송 대기)
- **Key**: `notification:ready`
- **Type**: List
- **Operations**:
  - `LPUSH` - 큐에 추가
  - `BRPOP` - 큐에서 꺼내기 (Blocking, 실시간)
  - `RPOP` - 큐에서 꺼내기 (Non-blocking, deprecated)
- **용도**: API 요청 즉시 큐에 추가되어 Worker가 비동기로 처리

#### Waiting Room (예약 알림 대기)
- **Key**: `notification:waiting`
- **Type**: Sorted Set
- **Score**: Unix timestamp (초 단위)
- **Operations**:
  - `ZADD` - 예약 알림 추가
  - `ZRANGEBYSCORE` - 발송 시간 된 알림 조회
  - `ZREMRANGEBYSCORE` - Ready Queue로 이동 후 삭제
- **용도**: 특정 시간에 발송할 알림 (Task 리마인더 등)

### Worker 동작 방식

#### 1. Ready Queue 소비 (무한 루프 + BLPOP, 병렬 처리) ⭐
```typescript
async runWorkerLoop(workerId: number) // 앱 시작 시 자동 실행 (OnModuleInit)
```
- **BRPOP (Blocking Right Pop)**: 큐에 데이터가 들어올 때까지 대기 (CPU 사용 안 함)
- 데이터가 큐에 추가되는 **즉시 처리** (0ms 딜레이)
- **병렬 처리**: 5개의 Worker가 동시에 큐 소비 (concurrency: 5)
- FCM 발송 + DB 저장
- 실패한 토큰 제거 및 Redis 캐시 무효화
- 에러 발생 시 1초 대기 후 재시작
- **Graceful Shutdown**: 앱 종료 시 처리 중인 작업 완료 후 종료

**Cron vs BLPOP 비교**:
| 방식 | 처리 속도 | CPU 사용 | 확장성 | 처리량 |
|------|----------|---------|--------|--------|
| Cron (10초 주기) | 최대 10초 딜레이 | 빈 큐 polling 낭비 | 제한적 | 1개/10초 |
| **BLPOP (무한 루프, 병렬 5)** | **0ms (실시간)** | **대기 시 0%** | **우수** | **5배 빠름** |

**장점**:
- ✅ 실시간 처리 (알림이 큐에 들어오는 즉시 발송)
- ✅ CPU 효율적 (큐가 비어있으면 대기 상태, CPU 안 씀)
- ✅ 수평 확장 가능 (여러 Worker 인스턴스가 동시에 큐 소비)
- ✅ **병렬 처리** (단일 서버에서도 5배 빠른 처리)
- ✅ **Graceful Shutdown** (서버 재시작 시 데이터 손실 방지)

#### 2. Waiting → Ready 이동 (Cron 매 1분)
```typescript
@Cron(CronExpression.EVERY_MINUTE)
async moveWaitingToReady()
```
- Waiting Room에서 `score <= 현재 시간`인 알림들을 조회
- Ready Queue로 이동 (`LPUSH`)
- Waiting Room에서 제거 (`ZREMRANGEBYSCORE`)
- 이동된 알림은 무한 루프 Worker가 **즉시 처리** (BLPOP)

**참고**: 예약 알림은 최대 1분 오차 발생 가능 (Cron 주기)

#### 3. 큐 상태 로깅 (Cron 매 5분)
```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async logQueueStatus()
```
- Ready Queue 크기 조회
- Waiting Room 크기 조회
- 로그 출력 (모니터링용)

## 2. 알림 종류별 처리 방식

### 2.1 개인 알림 (1:1 알림)

**대상**: 특정 사용자 1명
**예시**: 댓글 알림, 일정 공유, 그룹 초대 등
**처리 방식**: Queue 기반 (Two-Track)

```typescript
// 즉시 발송
await notificationService.sendNotification({
  userId: 'user-123',
  category: NotificationCategory.GROUP,
  title: '그룹 초대',
  body: '홍길동님이 당신을 "우리가족" 그룹에 초대했습니다.'
});
```

**흐름**:
1. Ready Queue에 추가
2. Worker가 FCM 발송
3. DB에 히스토리 저장 (`Notification` 테이블)
4. 사용자 앱 내 알림함에 표시

---

### 2.2 예약 알림 (Task 리마인더)

**대상**: 특정 사용자 1명
**예시**: "30분 후 회의 시작", "내일 오전 10시 약 복용"
**처리 방식**: Queue 기반 (Two-Track)

```typescript
// 예약 발송
await notificationService.scheduleNotification({
  userId: 'user-123',
  category: NotificationCategory.TODO,
  title: '할 일 알림',
  body: '30분 후 회의 시작',
  scheduledTime: '2026-01-11T15:30:00Z'
});
```

**흐름**:
1. Waiting Room에 추가 (score = Unix timestamp)
2. 1분마다 Worker가 시간 확인
3. 발송 시간 도달 시 Ready Queue로 이동
4. FCM 발송 + DB 저장

---

### 2.3 공지사항 (1:N 전체 알림)

**대상**: 모든 사용자 (10만 명, 100만 명...)
**예시**: "긴급 점검 안내", "새로운 기능 출시"
**처리 방식**: FCM Topic (Queue 미사용)

```typescript
// Topic 발송
await notificationService.sendAnnouncementNotification({
  id: 'announcement-456',
  title: '긴급 점검 안내'
});
```

**흐름**:
1. FCM Topic `announcements`로 즉시 발송
2. **DB에 저장하지 않음** (휘발성)
3. 사용자 핸드폰 상단바에만 알림 표시

---

## 3. 공지사항 알림의 특수성

### ⚠️ 비즈니스 정책: 공지사항은 DB에 저장하지 않음

#### 배경
- FCM Topic은 **100만 명에게 1번의 API 호출**로 발송 가능 (효율적)
- 하지만 **100만 개의 DB Row를 Insert**하는 것은 비효율적
- Family Planner 앱 특성상 공지사항은 **별도 게시판**에서 제공

#### 결과
| 구분 | FCM 푸시 | 알림함 (Notification) | 공지사항 게시판 |
|------|----------|---------------------|----------------|
| 개인 알림 | O | O | - |
| 예약 알림 | O | O | - |
| 공지사항 | O | **X (저장 안 함)** | O (Announcement) |

#### 클라이언트 처리 가이드

1. **공지사항 푸시 클릭 시**
   ```javascript
   // FCM data에 포함된 announcementId로 상세 조회
   const announcementId = notification.data.announcementId;
   await fetchAnnouncementDetail(announcementId);
   ```

2. **앱 내 알림함**
   ```javascript
   // GET /notifications
   // 개인 알림(댓글, 일정 등)만 표시
   // 공지사항은 표시되지 않음
   ```

3. **공지사항 메뉴**
   ```javascript
   // GET /announcements
   // 별도 화면에서 전체 공지사항 목록 제공
   ```

---

## 4. API 엔드포인트

### 개인 알림 (즉시 발송)
```http
POST /notifications
Content-Type: application/json

{
  "userId": "user-123",
  "category": "GROUP",
  "title": "그룹 초대",
  "body": "홍길동님이 당신을 우리가족 그룹에 초대했습니다."
}
```

### 예약 알림
```http
POST /notifications/schedule
Content-Type: application/json

{
  "userId": "user-123",
  "category": "TODO",
  "title": "할 일 알림",
  "body": "30분 후 회의 시작",
  "scheduledTime": "2026-01-11T15:30:00Z"
}
```

### 알림 목록 조회
```http
GET /notifications?page=1&limit=20&unreadOnly=false
```
**응답**: 개인 알림만 반환 (공지사항 제외)

### 공지사항 발송 (내부 API)
```typescript
// AnnouncementService에서 호출
await notificationService.sendAnnouncementNotification({
  id: announcement.id,
  title: announcement.title
});
```

---

## 5. 데이터베이스 스키마

### Notification 테이블
```prisma
model Notification {
  id        String               @id @default(uuid())
  userId    String               // 특정 사용자 ID
  category  NotificationCategory
  title     String               @db.VarChar(255)
  body      String               @db.Text
  data      Json?
  sent      Boolean              @default(false)  // FCM 발송 상태
  isRead    Boolean              @default(false)
  createdAt DateTime             @default(now())
  sentAt    DateTime?
  readAt    DateTime?

  @@index([userId])
  @@index([isRead])
  @@index([sent])
  @@index([createdAt])
}
```

**주의**: 공지사항(Announcement)은 이 테이블에 저장되지 않음

---

## 6. 확장 가능성

### 현재 구조의 장점
- **BLPOP 기반 실시간 처리**: 0ms 딜레이로 즉시 발송
- **병렬 처리 (Concurrency: 5)**: 단일 서버에서도 5배 빠른 처리량
- **Redis 연결 분리**: BLPOP 전용 클라이언트로 일반 Redis 작업 영향 없음
- **Redis 기반 수평 확장**: 여러 Worker 인스턴스가 동시에 큐 소비 가능
- **Queue 방식으로 트래픽 폭증 대응**: API 응답 즉시 반환
- **예약 발송**: Task 리마인더 구현 가능
- **CPU 효율적**: 빈 큐일 때 BLPOP으로 대기 (polling 낭비 없음)
- **Graceful Shutdown**: 서버 재시작 시 처리 중인 작업 완료 후 종료 (데이터 손실 방지)

### 향후 개선 가능 방향
1. **Dead Letter Queue (DLQ)**: 발송 실패 알림 재시도
2. **우선순위 큐**: 긴급 알림 우선 처리
3. **메트릭 수집**: Prometheus/Grafana로 큐 상태 모니터링
4. **예약 알림 정밀도 개선**: Cron 주기를 30초로 줄이거나, Sorted Set에 TTL 기반 이벤트 사용
5. **Concurrency 동적 조정**: 큐 크기에 따라 Worker 개수 자동 증감

---

## 7. 트러블슈팅

### Q1. 예약 알림이 정확한 시간에 발송되지 않아요
**A**: Worker가 1분 주기로 Waiting Room을 확인하므로 최대 1분 오차 발생 가능.
더 정확한 시간이 필요하면 Cron 주기를 `EVERY_30_SECONDS`로 변경.

### Q2. Ready Queue가 계속 쌓여요
**A**: Worker 처리 속도보다 유입이 빠른 상황. 해결 방법:
1. **Concurrency 증가** (가장 쉬움): `notification.worker.ts`에서 `concurrency: 5` → `10`으로 변경
2. **Worker 인스턴스 수평 확장**: 여러 서버에서 동시에 큐 소비
3. FCM 배치 발송 최적화 (한 번에 여러 사용자에게 발송)

### Q3. 공지사항 알림이 알림함에 안 보여요
**A**: 정상 동작입니다. 공지사항은 별도 Announcement 게시판에서 확인하도록 설계됨.

### Q4. 서버 재시작 시 알림이 유실되나요?
**A**: 아니요. Graceful Shutdown이 구현되어 있어 안전합니다:
- 서버 종료 시 `isRunning = false`로 설정하여 새 작업 수신 중지
- 현재 처리 중인 작업이 완료될 때까지 최대 6초 대기
- Redis Queue에 남은 알림은 서버 재시작 후 자동으로 처리됨

### Q5. BLPOP이 일반 Redis 작업을 차단하나요?
**A**: 아니요. BLPOP 전용 Redis 클라이언트를 별도로 분리했습니다:
- **일반 작업 (GET, SET, HGET 등)**: `redisClient` 사용 → 영향 없음
- **BLPOP (Blocking)**: `blockingClient` 사용 → 전용 연결 독점
- 두 클라이언트는 완전히 독립적인 연결이므로 서로 영향 없음

---

## 8. 참고 파일

- **Redis Queue**: `src/redis/redis.service.ts:622-718`
- **Queue Service**: `src/notification/notification-queue.service.ts`
- **Worker**: `src/notification/notification.worker.ts`
- **Notification Service**: `src/notification/notification.service.ts`
- **Controller**: `src/notification/notification.controller.ts`
- **Module**: `src/notification/notification.module.ts`
