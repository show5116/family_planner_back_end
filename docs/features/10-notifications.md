# 10. 알림 (Notifications)

> **상태**: ✅ 완료
> **Phase**: Phase 3

---

## 개요

Firebase Cloud Messaging (FCM)을 활용한 푸시 알림 시스템입니다. 웹, Android, iOS 모든 플랫폼 지원, 카테고리별 알림 on/off 설정, 알림 히스토리 관리 기능을 제공합니다.

**Two-Track Queue System**을 통해 즉시 발송과 예약 발송을 모두 지원하며, Redis BLPOP 기반 실시간 처리와 병렬 처리로 높은 처리량을 제공합니다.

---

## 핵심 개념

### 알림 카테고리
- `SCHEDULE`: 일정 관련
- `TODO`: 할일 관련
- `HOUSEHOLD`: 가계부 관련
- `ASSET`: 자산 관련
- `CHILDCARE`: 육아 관련
- `GROUP`: 그룹 관련 (초대, 멤버 추가 등)
- `SYSTEM`: 시스템 알림

### 디바이스 플랫폼
- `IOS`, `ANDROID`, `WEB`

### 특징
- 다중 디바이스 지원 (한 사용자가 여러 디바이스 등록)
- 카테고리별 알림 활성화/비활성화
- 유효하지 않은 토큰 자동 삭제
- 알림 히스토리 자동 저장

---

## FCM 토큰 관리

### 디바이스 토큰 등록 (`POST /notifications/token`)
- FCM 토큰 등록
- 동일 토큰 재등록 시 `lastUsed` 업데이트
- 플랫폼 정보 저장 (iOS, Android, Web)
- **계정 전환 처리**: 다른 사용자 토큰이면 기존 토큰 자동 삭제 후 새로 등록

### 디바이스 토큰 삭제 (`DELETE /notifications/token/:token`)
- 로그아웃 시 FCM 토큰 삭제
- 본인 토큰만 삭제 가능

---

## 알림 설정 관리

### 알림 설정 조회 (`GET /notifications/settings`)
- 카테고리별 알림 설정 조회
- 설정 없는 카테고리는 자동 생성 (enabled=true)

### 알림 설정 업데이트 (`PUT /notifications/settings`)
- 특정 카테고리의 알림 활성화/비활성화
- Upsert 방식 (없으면 생성, 있으면 업데이트)

---

## Two-Track 알림 시스템 아키텍처

### 개요
Redis 기반 큐 시스템으로 **즉시 발송**과 **예약 발송** 두 가지 방식을 지원합니다.

### 시스템 구성 요소

#### 1. Ready Queue (즉시 발송 대기)
- **Redis Type**: List (`notification:ready`)
- **Operations**: `LPUSH` (추가), `BRPOP` (실시간 소비)
- **용도**: API 요청 즉시 큐에 추가되어 Worker가 비동기로 처리

#### 2. Waiting Room (예약 알림 대기)
- **Redis Type**: Sorted Set (`notification:waiting`)
- **Score**: Unix timestamp (발송 시간)
- **Operations**: `ZADD` (추가), `ZRANGEBYSCORE` (시간 조회), `ZREMRANGEBYSCORE` (삭제)
- **용도**: 특정 시간에 발송할 알림 (Task 리마인더 등)

#### 3. Worker 시스템
**무한 루프 + BLPOP (실시간, 병렬 처리)**
- **BRPOP (Blocking Right Pop)**: 큐에 데이터가 들어올 때까지 대기 (CPU 사용 0%)
- 데이터가 큐에 추가되는 **즉시 처리** (0ms 딜레이)
- **병렬 처리**: 5개의 Worker가 동시에 큐 소비 (concurrency: 5)
- FCM 발송 + DB 저장
- 실패한 토큰 제거 및 Redis 캐시 무효화
- **Graceful Shutdown**: 앱 종료 시 처리 중인 작업 완료 후 종료

**Cron vs BLPOP 비교**:
| 방식 | 처리 속도 | CPU 사용 | 확장성 | 처리량 |
|------|----------|---------|--------|--------|
| Cron (10초 주기) | 최대 10초 딜레이 | 빈 큐 polling 낭비 | 제한적 | 1개/10초 |
| **BLPOP (무한 루프, 병렬 5)** | **0ms (실시간)** | **대기 시 0%** | **우수** | **5배 빠름** |

**Cron 작업 (보조)**
- **매 1분**: Waiting Room → Ready Queue 이동 (예약 시간 도달 시)
- **매 5분**: 큐 상태 로깅 (모니터링용)

### 알림 종류별 처리 방식

#### 1. 개인 알림 (즉시 발송)
```typescript
await notificationService.sendNotification({
  userId: 'user-uuid',
  category: NotificationCategory.GROUP,
  title: '그룹 초대',
  body: '홍길동님이 당신을 "우리가족" 그룹에 초대했습니다.',
  data: { groupId: 'group-uuid' },
});
```
- Ready Queue에 추가 → Worker가 즉시 FCM 발송 → DB에 히스토리 저장

#### 2. 예약 알림 (Task 리마인더)
```typescript
await notificationService.scheduleNotification({
  userId: 'user-uuid',
  category: NotificationCategory.TODO,
  title: '할 일 알림',
  body: '30분 후 회의 시작',
  scheduledTime: '2026-01-11T15:30:00Z',
});
```
- Waiting Room에 추가 (score = Unix timestamp)
- 1분마다 Worker가 시간 확인
- 발송 시간 도달 시 Ready Queue로 이동 → 즉시 처리

#### 3. 공지사항 (FCM Topic, 1:N 전체 알림)
```typescript
await notificationService.sendAnnouncementNotification({
  id: 'announcement-456',
  title: '긴급 점검 안내',
});
```
- FCM Topic `announcements`로 즉시 발송 (100만 명에게 1번 API 호출)
- **DB에 저장하지 않음** (휘발성)
- 사용자 핸드폰 상단바에만 알림 표시
- **이유**: 100만 개 DB Row Insert는 비효율적, 별도 공지사항 게시판 제공

### API 엔드포인트

#### 예약 알림 발송 (`POST /notifications/schedule`)
```json
{
  "userId": "user-uuid",
  "category": "TODO",
  "title": "할 일 알림",
  "body": "30분 후 회의 시작",
  "scheduledTime": "2026-01-11T15:30:00Z"
}
```

**Response (201)**:
```json
{
  "queued": true,
  "scheduledTime": "2026-01-11T15:30:00Z"
}
```

### 시스템 특징

**장점**:
- ✅ 실시간 처리 (알림이 큐에 들어오는 즉시 발송, 0ms 딜레이)
- ✅ CPU 효율적 (큐가 비어있으면 대기 상태, CPU 안 씀)
- ✅ 수평 확장 가능 (여러 Worker 인스턴스가 동시에 큐 소비)
- ✅ 병렬 처리 (단일 서버에서도 5배 빠른 처리)
- ✅ Graceful Shutdown (서버 재시작 시 데이터 손실 방지)
- ✅ Redis 연결 분리 (BLPOP 전용 클라이언트로 일반 Redis 작업 영향 없음)
- ✅ Queue 방식으로 트래픽 폭증 대응 (API 응답 즉시 반환)

**트러블슈팅**:
1. **예약 알림이 정확한 시간에 발송되지 않아요**
   - Worker가 1분 주기로 Waiting Room 확인하므로 최대 1분 오차 발생 가능

2. **Ready Queue가 계속 쌓여요**
   - Concurrency 증가: `notification.worker.ts`에서 `concurrency: 5` → `10`으로 변경
   - Worker 인스턴스 수평 확장

3. **공지사항 알림이 알림함에 안 보여요**
   - 정상 동작. 공지사항은 별도 Announcement 게시판에서 확인

4. **BLPOP이 일반 Redis 작업을 차단하나요?**
   - 아니요. BLPOP 전용 Redis 클라이언트를 별도로 분리했음
   - 일반 작업 (GET, SET, HGET 등): `redisClient` 사용 → 영향 없음
   - BLPOP (Blocking): `blockingClient` 사용 → 전용 연결 독점

**참고 파일**:
- Redis Queue: [redis.service.ts](../../src/redis/redis.service.ts)
- Queue Service: [notification-queue.service.ts](../../src/notification/notification-queue.service.ts)
- Worker: [notification.worker.ts](../../src/notification/notification.worker.ts)
- Architecture Doc: [notification-architecture.md](../notification-architecture.md)

---

## 알림 전송 (내부 사용)

### sendNotification (즉시 발송)
- 다른 서비스에서 `NotificationService` 주입받아 사용
- Ready Queue에 추가하여 비동기 처리
- 사용자 설정 확인 (비활성화된 카테고리는 전송 스킵)
- 다중 디바이스 동시 전송
- 실패한 토큰 자동 삭제
- 알림 히스토리 자동 저장

사용 예시:
```typescript
await this.notificationService.sendNotification({
  userId: 'user-uuid',
  category: NotificationCategory.GROUP,
  title: '새로운 그룹 초대',
  body: '홍길동님이 당신을 "우리가족" 그룹에 초대했습니다.',
  data: { groupId: 'group-uuid', action: 'view_group' },
});
```

### scheduleNotification (예약 발송)
- Waiting Room에 추가하여 예약 처리
- 발송 시간 도달 시 Ready Queue로 자동 이동

---

## 알림 히스토리

### 알림 목록 조회 (`GET /notifications`)
- 페이지네이션 지원 (page, limit)
- 읽지 않은 알림만 필터링 (unreadOnly)
- 최신순 정렬 (sentAt DESC)

### 읽지 않은 알림 개수 (`GET /notifications/unread-count`)
- 배지 표시용
- isRead=false인 알림 개수 반환

### 알림 읽음 처리 (`PUT /notifications/:id/read`)
- `isRead=true`, `readAt` 시간 기록
- 본인 알림만 처리 가능

### 알림 삭제 (`DELETE /notifications/:id`)
- 본인 알림만 삭제 가능

---

## 데이터베이스

### DeviceToken
| 컬럼     | 타입            | 설명                                |
| -------- | --------------- | ----------------------------------- |
| id       | String (UUID)   | 기본 키                             |
| userId   | String          | 사용자 ID (외래 키)                 |
| token    | String (Unique) | FCM 디바이스 토큰                   |
| platform | Enum            | 디바이스 플랫폼 (IOS, ANDROID, WEB) |
| lastUsed | DateTime        | 마지막 사용 시간                    |

### NotificationSetting
| 컬럼     | 타입          | 설명                |
| -------- | ------------- | ------------------- |
| id       | String (UUID) | 기본 키             |
| userId   | String        | 사용자 ID (외래 키) |
| category | Enum          | 알림 카테고리       |
| enabled  | Boolean       | 알림 활성화 여부    |

**Unique**: `(userId, category)`

### Notification
| 컬럼     | 타입          | 설명                      |
| -------- | ------------- | ------------------------- |
| id       | String (UUID) | 기본 키                   |
| userId   | String        | 사용자 ID (외래 키)       |
| category | Enum          | 알림 카테고리             |
| title    | String        | 알림 제목                 |
| body     | Text          | 알림 내용                 |
| data     | Json          | 추가 데이터 (payload 등)  |
| isRead   | Boolean       | 읽음 여부 (기본값: false) |
| sentAt   | DateTime      | 발송 시간                 |
| readAt   | DateTime      | 읽은 시간 (nullable)      |

---

## Firebase 설정

1. Firebase Console에서 서비스 계정 키 생성 (JSON 다운로드)
2. 환경 변수 설정:
```env
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key\n-----END PRIVATE KEY-----\n"
```
3. Railway 배포 시 Variables 탭에서 환경 변수 추가

---

## 구현 상태

### ✅ 완료
- [x] Prisma 스키마 정의 (DeviceToken, NotificationSetting, Notification)
- [x] Firebase Admin SDK 통합
- [x] FCM 토큰 등록 (다중 디바이스 지원)
- [x] FCM 토큰 삭제
- [x] 계정 전환 처리 (기존 토큰 자동 삭제)
- [x] 플랫폼 정보 저장 (iOS, Android, Web)
- [x] 카테고리별 알림 설정 조회
- [x] 카테고리별 알림 설정 업데이트
- [x] 알림 전송 서비스 (sendNotification)
- [x] 다중 디바이스 동시 전송
- [x] 사용자 설정 확인 (비활성화 시 스킵)
- [x] 유효하지 않은 토큰 자동 삭제
- [x] 알림 히스토리 자동 저장
- [x] 알림 목록 조회 (페이지네이션)
- [x] 읽지 않은 알림만 필터링
- [x] 읽지 않은 알림 개수 조회
- [x] 알림 읽음 처리
- [x] 알림 삭제
- [x] Swagger 문서화
- [x] 데이터베이스 마이그레이션
- [x] **Two-Track Queue System 구현 (Redis 기반)**
- [x] **Ready Queue (즉시 발송) - Redis List**
- [x] **Waiting Room (예약 발송) - Redis Sorted Set**
- [x] **BLPOP 기반 실시간 Worker (0ms 딜레이)**
- [x] **병렬 처리 (Concurrency: 5)**
- [x] **Graceful Shutdown 구현**
- [x] **Redis 연결 분리 (BLPOP 전용 클라이언트)**
- [x] **예약 알림 발송 API (`POST /notifications/schedule`)**
- [x] **Look-Aside Caching (FCM 토큰)**
- [x] **공지사항 FCM Topic 발송**

### ⬜ TODO / 향후 고려
- [ ] Dead Letter Queue (DLQ) - 발송 실패 알림 재시도
- [ ] 우선순위 큐 - 긴급 알림 우선 처리
- [ ] 메트릭 수집 (Prometheus/Grafana)
- [ ] Concurrency 동적 조정 (큐 크기 기반)
- [ ] 알림 그룹핑 (같은 카테고리 알림 묶기)
- [ ] 알림 액션 버튼 (승인/거부 등)
- [ ] 알림 이미지 첨부
- [ ] 알림 통계 (발송률, 클릭률)
- [ ] 푸시 알림 템플릿
- [ ] 푸시 알림 A/B 테스트
