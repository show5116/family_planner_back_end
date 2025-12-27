# 10. 알림 (Notifications)

> **상태**: ✅ 완료 (프론트엔드 연동 대기)
> **우선순위**: High
> **담당 Phase**: Phase 3

---

## 📋 개요

Firebase Cloud Messaging (FCM)을 활용한 푸시 알림 시스템입니다. 웹, Android, iOS 모든 플랫폼을 지원하며, 카테고리별 알림 on/off 설정, 알림 히스토리 관리 등의 기능을 제공합니다.

---

## 🎯 핵심 개념

### 알림 카테고리

- `SCHEDULE`: 일정 관련 알림
- `TODO`: 할일 관련 알림
- `HOUSEHOLD`: 가계부 관련 알림
- `ASSET`: 자산 관련 알림
- `CHILDCARE`: 육아 관련 알림
- `GROUP`: 그룹 관련 알림 (초대, 멤버 추가 등)
- `SYSTEM`: 시스템 알림

### 디바이스 플랫폼

- `IOS`: iOS 앱
- `ANDROID`: Android 앱
- `WEB`: 웹 브라우저

### 주요 특징

- 다중 디바이스 지원 (한 사용자가 여러 디바이스 등록 가능)
- 카테고리별 알림 활성화/비활성화
- 유효하지 않은 토큰 자동 삭제
- 알림 히스토리 자동 저장

---

## ✅ FCM 토큰 관리

### 디바이스 토큰 등록 (`POST /notifications/token`)

- ✅ 로그인한 사용자의 FCM 토큰 등록
- ✅ 동일 토큰 재등록 시 `lastUsed` 시간 업데이트
- ✅ 플랫폼 정보 함께 저장 (iOS, Android, Web)
- ✅ **계정 전환 시나리오 처리**: 다른 사용자에게 등록된 토큰이면 기존 토큰 자동 삭제 후 새로 등록

**계정 전환 예시**:
```
1. 사용자 A 로그인 → 토큰 "ABC123" 등록
2. 사용자 A 로그아웃 (토큰 삭제 깜빡함)
3. 사용자 B 로그인 → 토큰 "ABC123" 등록 시도
4. 시스템: 기존 A의 토큰 자동 삭제 → B의 토큰으로 새로 등록 ✅
```

**관련 파일**:

- [src/notification/notification.service.ts](../../src/notification/notification.service.ts#L31-L83)

---

### 디바이스 토큰 삭제 (`DELETE /notifications/token/:token`)

- ✅ 로그아웃 시 FCM 토큰 삭제
- ✅ 본인의 토큰만 삭제 가능

**관련 파일**:

- [src/notification/notification.service.ts](../../src/notification/notification.service.ts#L75-L91)

---

## ✅ 알림 설정 관리

### 알림 설정 조회 (`GET /notifications/settings`)

- ✅ 카테고리별 알림 설정 조회
- ✅ 설정이 없는 카테고리는 자동으로 생성 (enabled=true)
- ✅ 모든 카테고리 반환

**관련 파일**:

- [src/notification/notification.service.ts](../../src/notification/notification.service.ts#L96-L126)

---

### 알림 설정 업데이트 (`PUT /notifications/settings`)

- ✅ 특정 카테고리의 알림 활성화/비활성화
- ✅ Upsert 방식 (없으면 생성, 있으면 업데이트)

**관련 파일**:

- [src/notification/notification.service.ts](../../src/notification/notification.service.ts#L131-L147)

---

## ✅ 알림 전송 (내부 사용)

### 알림 전송 (`sendNotification`)

- ✅ 다른 서비스에서 `NotificationService` 주입받아 사용
- ✅ 사용자 설정 확인 (비활성화된 카테고리는 전송 스킵)
- ✅ 다중 디바이스 동시 전송
- ✅ 실패한 토큰 자동 삭제
- ✅ 알림 히스토리 자동 저장

**사용 예시**:

```typescript
await this.notificationService.sendNotification({
  userId: 'user-uuid',
  category: NotificationCategory.GROUP,
  title: '새로운 그룹 초대',
  body: '홍길동님이 당신을 "우리가족" 그룹에 초대했습니다.',
  data: {
    groupId: 'group-uuid',
    action: 'view_group',
  },
});
```

**관련 파일**:

- [src/notification/notification.service.ts](../../src/notification/notification.service.ts#L152-L235)

---

## ✅ 알림 히스토리

### 알림 목록 조회 (`GET /notifications`)

- ✅ 페이지네이션 지원 (page, limit)
- ✅ 읽지 않은 알림만 필터링 가능 (unreadOnly)
- ✅ 최신순 정렬 (sentAt DESC)

**관련 파일**:

- [src/notification/notification.service.ts](../../src/notification/notification.service.ts#L240-L263)

---

### 읽지 않은 알림 개수 조회 (`GET /notifications/unread-count`)

- ✅ 배지 표시용
- ✅ isRead=false인 알림 개수 반환

**관련 파일**:

- [src/notification/notification.service.ts](../../src/notification/notification.service.ts#L303-L313)

---

### 알림 읽음 처리 (`PUT /notifications/:id/read`)

- ✅ 특정 알림을 읽음 상태로 변경
- ✅ `isRead=true`, `readAt` 시간 기록
- ✅ 본인의 알림만 처리 가능

**관련 파일**:

- [src/notification/notification.service.ts](../../src/notification/notification.service.ts#L268-L288)

---

### 알림 삭제 (`DELETE /notifications/:id`)

- ✅ 특정 알림 삭제
- ✅ 본인의 알림만 삭제 가능

**관련 파일**:

- [src/notification/notification.service.ts](../../src/notification/notification.service.ts#L293-L308)

---

## 📦 데이터베이스 스키마

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

| 컬럼     | 타입          | 설명                                 |
| -------- | ------------- | ------------------------------------ |
| id       | String (UUID) | 기본 키                              |
| userId   | String        | 사용자 ID (외래 키)                  |
| category | Enum          | 알림 카테고리                        |
| title    | String        | 알림 제목                            |
| body     | Text          | 알림 내용                            |
| data     | Json          | 추가 데이터 (화면 이동용 payload 등) |
| isRead   | Boolean       | 읽음 여부 (기본값: false)            |
| sentAt   | DateTime      | 발송 시간                            |
| readAt   | DateTime      | 읽은 시간 (nullable)                 |

---

## 🔧 Firebase 설정 가이드

### 1. Firebase Console에서 서비스 계정 키 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 설정 > 서비스 계정 탭
3. Firebase Admin SDK 선택
4. "새 비공개 키 생성" 클릭
5. JSON 파일 다운로드

### 2. 환경 변수 설정

다운로드한 JSON 파일에서 값을 추출하여 `.env` 파일에 추가:

```env
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key\n-----END PRIVATE KEY-----\n"
```

**주의**: Private Key는 개행문자(`\n`)를 포함하므로 JSON에서 복사한 그대로 사용

### 3. Railway 배포 시

Railway 대시보드 > 백엔드 서비스 > Variables 탭에서 환경 변수 추가

### 알림 히스토리

```typescript
// 목록 조회
const { data, meta } = await api.get('/notifications?page=1&limit=20');

// 읽지 않은 개수
const { count } = await api.get('/notifications/unread-count');

// 읽음 처리
await api.put(`/notifications/${id}/read`);
```

---

## 🚀 향후 개선 사항

- [ ] 알림 템플릿 시스템 (카테고리별 템플릿)
- [ ] 알림 스케줄링 (예: 일정 30분 전 알림)
- [ ] 알림 그룹화 (같은 카테고리 묶기)
- [ ] 알림 우선순위 설정
- [ ] 알림 통계 대시보드
- [ ] 일괄 읽음 처리
- [ ] 방해 금지 모드 (특정 시간대 음소거)

---

## 📝 구현 완료 체크리스트

- ✅ Prisma 스키마 정의 (DeviceToken, NotificationSetting, Notification)
- ✅ Firebase Admin SDK 통합
- ✅ FCM 토큰 관리 API (등록, 삭제)
- ✅ 알림 설정 API (조회, 업데이트)
- ✅ 알림 전송 서비스
- ✅ 알림 히스토리 API (조회, 읽음 처리, 삭제)
- ✅ 페이지네이션 지원
- ✅ 유효하지 않은 토큰 자동 삭제
- ✅ 카테고리별 알림 활성화/비활성화
- ✅ Swagger 문서화
- ✅ 데이터베이스 마이그레이션
