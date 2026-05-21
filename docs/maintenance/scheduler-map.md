# 스케줄러(Cron Job) 현황 맵

현재 등록된 모든 Cron Job과 환경별 활성화 방법을 정리합니다.

---

## 환경별 동작 방식

| 환경 | 조건 | Cron 동작 |
|------|------|-----------|
| production | `NODE_ENV=production` | 모든 Cron 자동 활성화 |
| dev (기본) | 환경변수 없음 | 모든 Cron 비활성화 |
| dev (선택 활성화) | `ENABLE_SCHEDULER=이름1,이름2` | 지정한 Cron만 활성화 |

**예시:** `ENABLE_SCHEDULER=investment,weather` → investment와 weather Cron만 실행

구현 위치: [src/common/base.scheduler.ts](../../src/common/base.scheduler.ts)

---

## Cron Job 목록

### `investment` — 투자 지표 수집

파일: [src/investment/scheduler/investment.scheduler.ts](../../src/investment/scheduler/investment.scheduler.ts)

| 메서드 | 주기 | 설명 |
|--------|------|------|
| `collectYahoo` | 매 5분 (`*/5 * * * *`) | Yahoo Finance 전체 심볼 수집 |
| `collectCrypto` | 매 1시간 (`0 * * * *`) | CoinGecko BTC/KRW 수집 |
| `collectMacro` | 매일 06:00 KST (`0 21 * * *`) | 버핏 지수(Wilshire5000/GDP) 수집 |
| `collectGoldSpot` | 15분마다, 평일 KST 09:00~16:00 (`*/15 0-7 * * 1-5`) | 국내 금 현물가 수집 |
| `collectFearGreed` | 매 1시간 (`0 * * * *`) | Fear & Greed Index 수집 |
| `collectBond` | 평일 18:00 KST (`0 9 * * 1-5`) | 한국채 3년물 수집 |

---

### `weather` — 날씨 알림

파일: [src/weather/weather-alert.scheduler.ts](../../src/weather/weather-alert.scheduler.ts)

| 메서드 | 주기 | 설명 |
|--------|------|------|
| `sendWeatherAlerts` | 매 정시 (`0 * * * *`, KST) | 날씨 알림 설정된 유저에게 FCM 발송 |

---

### `notification` — 알림 Worker

파일: [src/notification/notification.worker.ts](../../src/notification/notification.worker.ts)

| 메서드 | 주기 | 설명 |
|--------|------|------|
| `onModuleInit` (startWorker) | 서버 시작 시 1회 | Ready Queue 소비 무한 루프 시작 (BLPOP 기반, 병렬 5개) |
| `moveWaitingToReady` | 매 1분 (`EVERY_MINUTE`) | Waiting Room → Ready Queue 이동 |
| `logQueueStatus` | 매 5분 (`EVERY_5_MINUTES`) | 큐 상태 모니터링 로그 |

---

### `announcement` — 공지사항

파일: [src/announcement/announcement.scheduler.ts](../../src/announcement/announcement.scheduler.ts)

| 메서드 | 주기 | 설명 |
|--------|------|------|
| `syncAnnouncementViewCounts` | 매 10분 (`EVERY_10_MINUTES`) | Redis 조회수 → DB Write-Back |
| `syncAnnouncementReads` | 매 10분 (`EVERY_10_MINUTES`) | Redis 읽음 처리 → DB Write-Back |
| `sendScheduledNotifications` | 매 1분 (`EVERY_MINUTE`) | 예약된 공지 알림 발송 |

---

### `fridge` — 냉장고 유통기한

파일: [src/fridge/fridge.scheduler.ts](../../src/fridge/fridge.scheduler.ts)

| 메서드 | 주기 | 설명 |
|--------|------|------|
| `runExpiryAlert` | 매일 자정 (`0 0 * * *`, KST) | 유통기한 임박 품목 FCM 알림 발송 |

---

### `gold-asset` — 금 자산

파일: [src/assets/scheduler/gold-asset.scheduler.ts](../../src/assets/scheduler/gold-asset.scheduler.ts)

| 메서드 | 주기 | 설명 |
|--------|------|------|
| `createMonthlyGoldRecords` | 매월 말일 KST 자정 (`0 15 28-31 * *`) | GOLD 계좌 월말 자동 평가 기록 생성 |

---

### `savings` — 저축

파일: [src/savings/savings.scheduler.ts](../../src/savings/savings.scheduler.ts)

| 메서드 | 주기 | 설명 |
|--------|------|------|
| `runAutoDeposit` | 매일 00:10 (`10 0 * * *`) | 자동 저축 납입 처리 및 목표 달성 알림 |

---

### `childcare` — 자녀 관리

파일: [src/childcare/childcare.scheduler.ts](../../src/childcare/childcare.scheduler.ts)

| 메서드 | 주기 | 설명 |
|--------|------|------|
| `dispatchAllowance` | 매일 자정 (`0 0 * * *`) | 용돈 지급일인 자녀에게 포인트 지급 |
| `notifyNegotiationDate` | 매일 자정 (`0 0 * * *`) | 용돈 협상일 알림 발송 |
| `matureSavingsPlans` | 매일 자정 (`0 0 * * *`) | 만기된 저축 플랜 처리 |

---

### `household` — 가계부

파일: [src/household/household.scheduler.ts](../../src/household/household.scheduler.ts)

| 메서드 | 주기 | 설명 |
|--------|------|------|
| `autoGenerateRecurringExpenses` | 매일 00:05 (`5 0 * * *`) | 고정비용 자동 복사 |
| `autoGenerateBudgetsFromTemplates` | 매월 1일 00:10 (`10 0 1 * *`) | 예산 템플릿으로 월별 예산 자동 생성 |

---

### `task` — 반복 일정

파일: [src/task/task-scheduler.service.ts](../../src/task/task-scheduler.service.ts)

| 메서드 | 주기 | 설명 |
|--------|------|------|
| `generateRecurringTasks` | 매일 자정 (`EVERY_DAY_AT_MIDNIGHT`) | 반복 규칙 기반 일정 자동 생성 |

---

### `qna` — Q&A

파일: [src/qna/qna.scheduler.ts](../../src/qna/qna.scheduler.ts)

| 메서드 | 주기 | 설명 |
|--------|------|------|
| `autoResolveOldAnsweredQuestions` | 매일 자정 (`EVERY_DAY_AT_MIDNIGHT`) | ANSWERED 상태 1주일 경과 시 RESOLVED로 자동 전환 |

---

## 새 스케줄러 추가 시 체크리스트

1. `isSchedulerEnabled('이름')` 을 모든 `@Cron` 메서드 첫 줄에 추가
2. 이 문서의 목록에 항목 추가
3. Railway dev 서비스에서 테스트 시 `ENABLE_SCHEDULER=이름` 환경변수 설정
