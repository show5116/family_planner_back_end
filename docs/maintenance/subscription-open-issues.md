# 구독·용량 한도 미해결 이슈

> **관련 기능 문서**: [features/17-subscription.md](../features/17-subscription.md) ·
> [features/21-diary.md](../features/21-diary.md) · [features/02-groups.md](../features/02-groups.md)

프리미엄 구독 출시(다이어리 버킷 용량 제한 + 추후 AI 사용량 제한)를 준비하며 정리한 이슈 목록입니다.

- **가격·한도 수치는 아직 확정 전 제안**입니다. 근거와 원가 계산은
  [17-subscription.md의 "프리미엄 출시 설계"](../features/17-subscription.md#프리미엄-출시-설계-미확정-제안) 참고.
- 이 문서는 **코드에 실제로 존재하는 갭**과 **손대야 할 순서**만 다룹니다.

---

## 우선순위 요약

| # | 이슈 | 크기 | 선행 조건 |
| --- | --- | --- | --- |
| ~~A-1~~ | ~~월 한도 × 12 > 누적 한도~~ — **✅ 2026-09-12 해결** | 설정값 | — |
| ~~A-2~~ | ~~그룹 수 제한이 없다~~ — **✅ 2026-09-12 해결** | 중 | — |
| ~~A-3~~ | ~~`autoRenewing` 변화를 감지하지 않는다~~ — **✅ 2026-09-12 해결** | 소 | — |
| ~~A-4~~ | ~~Google 취소 설문 응답을 버리고 있다~~ — **✅ 2026-09-12 해결** | 소 | — |
| C-1 | 저장 사용량 분포를 볼 방법이 없다 | 소 | — |
| B-1 | 미디어 내보내기 경로가 없다 | 중 | — |
| B-2 | 해지 후 초과 저장분 정책이 없다 | 중 | **B-1** |
| B-3 | 그룹 일기 첨부 삭제는 남의 일기를 망가뜨린다 | — | B-2와 함께 |
| D-1 | AI 마이크로서비스가 usage를 반환하지 않는다 | 외부 | AI 확장 시 |

A·C는 지금, B는 해지자가 실제로 생기기 전, D는 AI 확장 시점.

---

## A. 지금 잡아야 할 것

### ✅ A-1. 월 한도 × 12 > 누적 한도 — 유료 티어가 1년 안에 막힌다 *(2026-09-12 해결)*

**현상이었던 것** — 매달 월 한도를 꽉 채우면 누적 한도가 1년 안에 차서, 월 한도는 남았는데 못
올리는 상태가 되고 그 시점이 연간 구독 갱신 직전이었습니다.

**해결** — 「누적 ≥ 월 × 13」을 설계 원칙으로 채택하고
[diary-media.config.ts](../../src/config/diary-media.config.ts)의 `DEFAULTS`를 조정했습니다.
원칙은 같은 파일 상단 주석에 남겨, 나중에 숫자를 바꿔도 같은 모순이 재발하지 않게 했습니다.

| Tier | 월간 | 누적 | 매달 꽉 채우면 |
| --- | --- | --- | --- |
| `free` | 100 MB | 500 MB | 5개월 *(의도적 예외 — 전환 유도)* |
| `ad_free` | 300 MB | 2 GB → **4 GB** | 6.8 → **13.3개월** |
| `premium` | 2 GB → **3 GB** | 20 GB → **40 GB** | 10 → **13.3개월** |

누적 한도 상향은 **평균 원가를 거의 올리지 않습니다.** 도달하는 유저에게만 비용이 붙고,
그 유저는 1년 이상 매달 한도를 꽉 채운 최우량 고객입니다. 계산은 17번 문서 참고.

> **⚠️ 양산 환경변수 확인 필요.** `DIARY_MEDIA_PREMIUM_TOTAL_MB` 같은 오버라이드가 Railway에
> 설정돼 있으면 **기본값 변경이 무시됩니다.** 로컬 `.env`에는 없지만 양산은 별도 확인해야 합니다.
> (설정값 우선순위: 환경변수 > `DEFAULTS`)

---

### ✅ A-2. 그룹 수 제한이 없다 *(2026-09-12 해결)*

**해결** — `free` 1 / `ad_free` 1 / `premium` 5로 제한하고, 멤버가 생기는 3개 경로를 모두 막았습니다.
동작·설계 근거는 [features/02-groups.md](../features/02-groups.md) "그룹 수 한도"로 옮겼습니다.

추가된 것:

- [src/config/group-quota.config.ts](../../src/config/group-quota.config.ts) — 등급별 한도 (환경변수 오버라이드)
- [src/group/group-quota.service.ts](../../src/group/group-quota.service.ts) — 집계·검사 (`assertCanJoin` / `assertMemberCanJoin`)
- [src/group/group-quota-exceeded.exception.ts](../../src/group/group-quota-exceeded.exception.ts) — 402 + `groupQuota` payload
- 검사 지점 3곳 + 사전 차단 1곳, i18n 4개 언어 2키, `GET /subscription/quota-plans`에 `maxGroups` 추가

**⚠️ 배포 전 분포 확인이 남아 있습니다.** 이 숫자가 크면 제한이 사실상 신규 유저에게만 걸리는
정책이 되고, 전환 효과가 기대보다 작습니다. 기존 소속은 유지되므로 데이터 손실은 없습니다.

```sql
SELECT cnt, COUNT(*) AS users FROM (
  SELECT userId, COUNT(*) AS cnt FROM group_members GROUP BY userId
) t GROUP BY cnt ORDER BY cnt;
```

**남은 것** — `docs/api/` 재생성(`npm run gen:api`). 402 응답과 `maxGroups` 필드가 아직 반영되지
않았습니다. 다른 작업(routine)이 워킹 트리에 함께 있어 분리를 위해 실행하지 않았습니다.

---

### ✅ A-3. `autoRenewing` 변화를 감지하지 않는다 *(2026-09-12 해결)*

**해결** — `applyVerifiedPurchase`가 트랜잭션 안에서 직전 `autoRenewing`과 비교해 `true → false`일 때만
`AUTO_RENEW_OFF` 이벤트를 남깁니다. 첫 구매·중복 검증·재활성화는 걸리지 않습니다.
만료 7일 전 알림 스케줄러도 함께 추가했습니다.

동작·판단 근거는 [features/17-subscription.md](../features/17-subscription.md)
"해지 감지와 만료 임박 알림"으로 옮겼습니다.

추가된 것:

- [subscription.service.ts](../../src/subscription/subscription.service.ts) — `AUTO_RENEW_OFF` 전이 감지
- [subscription-expiry.scheduler.ts](../../src/subscription/subscription-expiry.scheduler.ts) — 만료 D-7 알림 (매일 10시 KST)
- i18n 4개 언어 3키, `SubscriptionModule` → `NotificationModule` import
- 스펙 14개 (전이 5 + 스케줄러 9)

**남은 것 (별개 과제)**

- **스토어 윈백 오퍼 연결** — Google Play win-back / Apple win-back offer. `AUTO_RENEW_OFF` 기록이
  쌓이기 시작했으므로 대상 선별은 가능해졌습니다.
- **2주 무료 체험자 대상 안내** — 체험은 `Subscription` 행이 없어 이 알림 대상이 아닙니다.
  성격도 다릅니다(해지 만류가 아니라 전환 유도).

---

### ✅ A-4. Google 취소 설문 응답을 버리고 있다 *(2026-09-12 해결)*

**해결** — Android verifier가 `canceledStateContext`를 읽어 `AUTO_RENEW_OFF` 이벤트의
`rawPayload.cancellation`에 남깁니다. 설문 사유뿐 아니라 **누가 해지했는지**(`USER` / `SYSTEM` /
`DEVELOPER` / `REPLACEMENT`)까지 구분합니다 — 업그레이드 교체를 이탈로 세면 통계가 망가지기 때문입니다.

동작·집계 쿼리는 [features/17-subscription.md](../features/17-subscription.md)
"왜 떠나는지 — Google 취소 설문" 참고.

추가된 것:

- [subscription-verifier.interface.ts](../../src/subscription/verifiers/subscription-verifier.interface.ts) — `CancellationContext` 타입
- [android-subscription.verifier.ts](../../src/subscription/verifiers/android-subscription.verifier.ts) — `toCancellation()` 매핑 (자유 입력 500자 제한)
- [subscription.service.ts](../../src/subscription/subscription.service.ts) — 이벤트 payload·로그에 반영
- 스펙 11개 (verifier 9 + 서비스 2). Android verifier 스펙은 이번에 새로 만들었습니다.

**남은 것 (별개 과제)**

- **Apple `expirationIntent`** — Apple은 취소 설문이 없고, `signedRenewalInfo.expirationIntent`
  (1=사용자 해지, 2=결제 오류, 3=가격 인상 미동의, 4=상품 미제공, 5=기타)가 가장 가까운 신호입니다.
  읽지 않으면 **iOS 이탈 사유는 계속 비어 있습니다.** 지금은 Android만 채워집니다.
- **설문 응답률이 낮을 것을 감안해야 합니다.** 응답은 선택이라 `surveyReason`이 비는 경우가 많고,
  `initiator`만 남습니다. 그것만으로도 자발/비자발 구분은 됩니다.

---

## B. 해지자 정리 정책을 켜기 전에 필요한 것

### B-1. 미디어 내보내기 경로가 없다

**현상** — 사용자가 자기 사진·영상을 받아갈 방법이 없습니다.

**근거** — [auth.service.ts:1184](../../src/auth/auth.service.ts#L1184)의 데이터 내보내기는
JSON/CSV 레코드만 담고 **R2 파일은 빠져 있습니다**(`profile.json`, `groups.csv` 등).

**영향** — 이게 없으면 한도 초과 시 "정리하세요" 안내가 사실상 **"그냥 지우라"는 강요**가 되고,
B-2의 D+90 삭제는 데이터 파괴가 됩니다.

**방향** — 수십 GB짜리 zip을 메일로 보낼 수는 없습니다. 현실적인 경로는 이미 있는
`GET /diaries/media/large`가 주는 presigned GET URL로 **앱이 직접 내려받아 기기 갤러리에 저장**하는
방식입니다. 백엔드는 URL을 이미 주고 있으므로 주로 프론트 작업입니다.

**⚠️ B-2는 이것 없이 착수 금지.**

---

### B-2. 해지 후 초과 저장분 정책이 없다

**현상** — 누적 한도를 꽉 채운 유저가 해지하면 `free`로 내려가지만 파일은 그대로 남습니다.
현행 정책이 "이미 올린 파일은 삭제하지 않고 신규 업로드만 차단"이기 때문입니다
([21-diary.md](../features/21-diary.md) "다운그레이드").

**영향** — 해지자 1인당 **영구 미회수 비용**. 40GB 기준 월 ₩840, 100명이면 월 ₩84,000.

**방향(제안)**

| 시점 | 조치 |
| --- | --- |
| 만료 즉시 | tier `free`. **조회·삭제·다운로드 전부 유지**, 신규 업로드만 차단 |
| D+7 | 초과 알림 + 정리/재구독 안내 |
| D+30 / D+60 | 재알림, 남은 기간 명시 |
| **D+90** | 초과분 삭제 — 사용자가 안 골랐으면 오래된 것부터, 최신은 남김 |

- **삭제 전에 반드시 B-1이 있어야 합니다.**
- **재구독하면 즉시 원복.** D+90 전에 재결제하면 아무 일도 없었던 것처럼. 이게 유예의 진짜 목적입니다.
- 누적 한도는 삭제 시 즉시 회복되므로(월간과 달리) 영구 벽이 아닙니다 —
  402 응답에 이미 `quota`가 실려 있어 프론트가 "큰 영상부터 정리하기"로 바로 연결할 수 있습니다.

---

### B-3. 그룹 일기 첨부 삭제는 남의 일기를 망가뜨린다

**현상** — 한도는 업로더(`DiaryMedia.userId`)에 귀속되는데 파일은 **그룹 전체가 봅니다.**
해지자의 미디어를 지우면 다른 가족 구성원의 일기에서 사진이 사라집니다.

**근거** — [21-diary.md](../features/21-diary.md) "접근 권한" — 그룹 일기의 첨부는 그룹원 누구나
추가·삭제할 수 있고, 한도만 업로더에게 귀속됩니다.

**방향** — B-2의 정리 대상에서 **그룹 일기에 붙은 미디어(`diaryId`가 그룹 일기)를 제외**하거나
최소한 별도 취급합니다. 놓치면 "돈 안 낸 사람 때문에 내 일기가 망가지는" 최악의 경험이 됩니다.

---

## C. 관측 수단이 없다

### C-1. 저장 사용량 분포를 볼 방법이 없다

**현상** — 누구가 얼마나 쓰는지 SQL을 직접 치지 않으면 알 수 없습니다. 한도 상향·상위 티어 신설
시점을 데이터가 아니라 감으로 정하게 됩니다.

**방향** — ADMIN API(`GET /subscription/admin/users`)에 저장 사용량을 얹습니다.
[diary-media-quota.service.ts](../../src/diary/media/diary-media-quota.service.ts)의 집계를
그대로 재사용할 수 있어 작은 작업입니다.

---

## D. AI 사용량 (추후)

### D-1. 마이크로서비스가 usage를 반환하지 않는다

**현상** — 백엔드는 AI 마이크로서비스의 프록시일 뿐이고
([ai.service.ts](../../src/ai/ai.service.ts)), 응답 DTO에 `response` / `plan` / `room_id`만 있어
**토큰 사용량을 알 수 없습니다.** 계량 자체가 불가능한 상태입니다.

**방향** — 마이크로서비스가 `usage: { model, input_tokens, output_tokens, cache_read_input_tokens }`를
응답에 싣도록 **계약을 먼저 바꿔야 합니다.** 이것 없이는 한도를 걸 수 없습니다.

### D-2. 계량 설계 메모 (착수 시 참고)

- 계량 패턴은 **다이어리 미디어를 그대로 재사용**: 요청 전 잔여 확인(부족 시 402) → 호출 →
  응답의 실측 토큰으로 차감. `reserve`/`confirm`과 같은 구조.
  상대가 내부 서비스라 신고값 위조 방어는 API 키 격리로 충분합니다.
- 월 리셋은 배치 없이 **조회 시점 기간 집계**(다이어리와 동일 — 배치는 실패하면 조용히 한도가 안 풀림).
- 설정은 `ai-quota.config.ts`로 [diary-media.config.ts](../../src/config/diary-media.config.ts) 패턴 복제.
- **토큰을 사용자에게 노출하지 않습니다.** "월 100만 토큰"은 가족 사용자에게 무의미하고,
  모델 선택도 노출하지 않습니다. 사용자에게는 "AI 대화 N회", 서버가 라우팅으로 원가를 관리합니다.
- 사고(thinking) 토큰이 출력으로 과금됩니다. **`thinking_budget` 설정이 가격 정책의 절반**입니다.

---

## 제약 — 온건한 중간 옵션이 봉쇄돼 있다

용량 초과 대응에서 **"화질을 낮춰 보관"은 불가능합니다.**

- 서버가 바이트를 보지 않으므로 ffmpeg·sharp를 돌릴 수 없습니다
  ([21-diary.md](../features/21-diary.md) "썸네일 — 클라이언트가 만들어 올린다").
- `isOriginal`은 클라이언트 신고 플래그이고 조회 필터로만 쓰입니다
  ([diary-media.service.ts:170](../../src/diary/media/diary-media.service.ts#L170)).
  원본과 압축본이 따로 저장되지 않습니다.

presigned 직업로드의 대가입니다. **선택지는 "통째로 보관" 아니면 "통째로 삭제" 둘뿐**이고,
이 제약이 A-1의 한도 설계와 B-2의 해지 정리 정책에 그대로 이어집니다.

---

**Last Updated**: 2026-09-10
