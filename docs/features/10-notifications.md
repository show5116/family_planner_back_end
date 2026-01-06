# 10. 알림 (Notifications)

> **상태**: ✅ 완료
> **Phase**: Phase 3

---

## 개요

Firebase Cloud Messaging (FCM)을 활용한 푸시 알림 시스템입니다. 웹, Android, iOS 모든 플랫폼 지원, 카테고리별 알림 on/off 설정, 알림 히스토리 관리 기능을 제공합니다.

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

## 알림 전송 (내부 사용)

### sendNotification
- 다른 서비스에서 `NotificationService` 주입받아 사용
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

### ⬜ TODO / 향후 고려
- [ ] 알림 예약 발송 (특정 시간에 전송)
- [ ] 알림 그룹핑 (같은 카테고리 알림 묶기)
- [ ] 알림 액션 버튼 (승인/거부 등)
- [ ] 알림 이미지 첨부
- [ ] 알림 통계 (발송률, 클릭률)
- [ ] 푸시 알림 템플릿
- [ ] 푸시 알림 A/B 테스트
