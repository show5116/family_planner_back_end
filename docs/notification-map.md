# 알림 현황 맵 (Notification Map)

> 마지막 업데이트: 2026-03-09
> 전체 알림 카테고리와 실제 발송 현황을 한눈에 확인합니다.

---

## 카테고리별 알림 현황

### 📅 SCHEDULE — 일정 알림

| # | 트리거 | 제목 | 수신자 | 발송 방식 | 파일 |
|---|--------|------|--------|-----------|------|
| 1 | CALENDAR_ONLY Task 생성 + 참여자 지정 | 새 일정에 참여자로 지정되었습니다 | 지정된 참여자 (생성자 제외) | 즉시 | [task-notification.listener.ts](../src/task/listeners/task-notification.listener.ts) |
| 2 | CALENDAR_ONLY Task 생성 + 그룹 지정 | 새 일정이 추가되었습니다 | 그룹 멤버 전체 (생성자 제외) | 즉시 | [task-notification.listener.ts](../src/task/listeners/task-notification.listener.ts) |
| 3 | CALENDAR_ONLY Task 수정 + 새 참여자 추가 | 일정에 참여자로 지정되었습니다 | 새로 추가된 참여자만 | 즉시 | [task-notification.listener.ts](../src/task/listeners/task-notification.listener.ts) |
| 4 | 반복 일정 건너뛰기 | 반복 일정이 건너뛰기 되었습니다 | 그룹 멤버 전체 (건너뛴 사람 제외) | 즉시 | [task-notification.listener.ts](../src/task/listeners/task-notification.listener.ts) |

---

### ✅ TODO — 할 일 알림

| # | 트리거 | 제목 | 수신자 | 발송 방식 | 파일 |
|---|--------|------|--------|-----------|------|
| 1 | TODO_LINKED Task 생성 + 참여자 지정 | 새 할 일에 참여자로 지정되었습니다 | 지정된 참여자 (생성자 제외) | 즉시 | [task-notification.listener.ts](../src/task/listeners/task-notification.listener.ts) |
| 2 | TODO_LINKED Task 생성 + 그룹 지정 | 새 할 일이 추가되었습니다 | 그룹 멤버 전체 (생성자 제외) | 즉시 | [task-notification.listener.ts](../src/task/listeners/task-notification.listener.ts) |
| 3 | TODO_LINKED Task 수정 + 새 참여자 추가 | 할 일에 참여자로 지정되었습니다 | 새로 추가된 참여자만 | 즉시 | [task-notification.listener.ts](../src/task/listeners/task-notification.listener.ts) |
| 4 | TODO_LINKED Task 상태 → COMPLETED | 할 일 완료 | 할 일 참여자 (완료한 사람 제외) | 즉시 | [task-notification.listener.ts](../src/task/listeners/task-notification.listener.ts) |

> **분기 기준**: `task.type === 'TODO_LINKED'` → TODO 카테고리, `'CALENDAR_ONLY'` → SCHEDULE 카테고리

---

### 🏠 HOUSEHOLD — 가계부 알림

| # | 트리거 | 제목 | 수신자 | 발송 방식 | 파일 |
|---|--------|------|--------|-----------|------|
| 1 | 지출 등록 후 월별 예산 초과 | 예산 초과 알림 | 그룹 멤버 전체 | 큐 (즉시) | [household.service.ts](../src/household/household.service.ts) |

> **본문 예시**: `"식비 예산을 초과했습니다. (지출 50,000원 / 예산 40,000원)"`

---

### 💰 ASSET — 자산 알림

| # | 트리거 | 제목 | 수신자 | 발송 방식 | 파일 |
|---|--------|------|--------|-----------|------|
| 1 | 계좌 등록 | 새 자산 계좌 등록 | 그룹 멤버 전체 (등록자 제외) | 즉시 | [assets.service.ts](../src/assets/assets.service.ts) |
| 2 | 잔액 기록 추가 | 자산 잔액 업데이트 | 계좌 소유자 본인 | 즉시 | [assets.service.ts](../src/assets/assets.service.ts) |

---

### 👶 CHILDCARE — 육아 알림

| # | 트리거 | 제목 | 수신자 | 발송 방식 | 파일 |
|---|--------|------|--------|-----------|------|
| 1 | 용돈 지급 | 용돈 지급 | 자녀 계정 | 큐 (즉시) | [childcare.service.ts](../src/childcare/childcare.service.ts) |
| 2 | 보상 포인트 지급 | 보상 포인트 지급 | 자녀 계정 | 큐 (즉시) | [childcare.service.ts](../src/childcare/childcare.service.ts) |
| 3 | 규칙 위반 차감 | 규칙 위반 차감 | 자녀 계정 | 큐 (즉시) | [childcare.service.ts](../src/childcare/childcare.service.ts) |
| 4 | 보상 사용 | 보상 사용 | 자녀 계정 | 큐 (즉시) | [childcare.service.ts](../src/childcare/childcare.service.ts) |
| 5 | 적금 입금 | 적금 입금 | 자녀 계정 | 큐 (즉시) | [childcare.service.ts](../src/childcare/childcare.service.ts) |
| 6 | 적금 출금 | 적금 출금 | 자녀 계정 | 큐 (즉시) | [childcare.service.ts](../src/childcare/childcare.service.ts) |
| 7 | 이자 지급 | 이자 지급 | 자녀 계정 | 큐 (즉시) | [childcare.service.ts](../src/childcare/childcare.service.ts) |

> **본문**: 적립 유형 → `"N 포인트가 적립되었습니다"`, 차감 유형 → `"N 포인트가 차감되었습니다"`

---

### 👨‍👩‍👧 GROUP — 그룹 알림

| # | 트리거 | 제목 | 수신자 | 발송 방식 | 파일 |
|---|--------|------|--------|-----------|------|
| 1 | 이메일로 그룹 초대 | 그룹 초대 | 초대받은 사용자 | 즉시 | [group-invite.service.ts](../src/group/group-invite.service.ts) |
| 2 | 초대 코드로 가입 요청 생성 | 그룹 가입 요청 | 그룹 OWNER | 즉시 | [group-invite.service.ts](../src/group/group-invite.service.ts) |
| 3 | 가입 요청 승인 | 그룹 가입 승인 | 승인된 사용자 | 즉시 | [group-invite.service.ts](../src/group/group-invite.service.ts) |
| 4 | 가입 요청 거부 | 그룹 가입 거부 | 거부된 사용자 | 즉시 | [group-invite.service.ts](../src/group/group-invite.service.ts) |
| 5 | 이메일 초대 코드로 즉시 가입 완료 | 새 멤버 가입 | 기존 그룹 멤버 전체 | 즉시 | [group-invite.service.ts](../src/group/group-invite.service.ts) |
| 6 | 그룹장 권한 양도 | 그룹장 권한 양도 | 새 OWNER | 즉시 | [group-member.service.ts](../src/group/group-member.service.ts) |

---

### 🔔 SYSTEM — 시스템 알림

| # | 트리거 | 제목 | 수신자 | 발송 방식 | 파일 |
|---|--------|------|--------|-----------|------|
| 1 | Q&A 질문 등록 | 새 질문 등록 | 모든 ADMIN 사용자 | 즉시 | [qna.service.ts](../src/qna/qna.service.ts) |
| 2 | Q&A 답변 등록 | 답변이 등록되었습니다 | 질문 작성자 | 즉시 | [qna.service.ts](../src/qna/qna.service.ts) |
| 3 | 공지사항 등록 (즉시/조용한 시간대 이후) | 새 공지사항 | 전체 앱 사용자 | FCM Topic | [announcement.service.ts](../src/announcement/announcement.service.ts) |
| 4 | 테스트 (관리자 수동 발송) | 테스트 알림 | 요청한 관리자 본인 | 즉시 | [notification.service.ts](../src/notification/notification.service.ts) |

> **공지사항**: FCM Topic `announcements` 사용. DB에 저장되지 않음 (휘발성).

---

## 발송 방식 설명

| 방식 | 설명 |
|------|------|
| **즉시** | `notificationService.sendNotification()` → Redis Ready Queue → Worker가 FCM 발송 |
| **큐 (즉시)** | `notificationQueue.enqueueImmediate()` → Redis Ready Queue → Worker가 FCM 발송 |
| **예약** | `notificationService.scheduleNotification()` → Redis Waiting Room → 시간 도달 시 발송 |
| **FCM Topic** | `sendAnnouncementNotification()` → FCM Topic 직접 브로드캐스트 (DB 미저장) |

---

## 알림 설정 (사용자 제어 가능)

사용자는 카테고리별로 알림을 ON/OFF 할 수 있습니다.
- API: `GET /notifications/settings`, `PUT /notifications/settings`
- 비활성화된 카테고리는 발송 시 자동 스킵됩니다.
