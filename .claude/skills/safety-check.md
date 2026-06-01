# safety-check — 삭제 영향도 & 다국어 검증

그룹/유저 삭제 시 데이터 무결성, 스케줄러 타이밍 이슈, 다국어 키 정합성을 검증하는 스킬.

**사용법:** `/safety-check` 또는 "안전 검사해줘"

---

## 실행 순서

### 1단계 — 외래키 누락 검사 (그룹/유저 삭제 영향도)

**목표:** `groupId` 또는 `userId`를 가진 모든 모델이 `onDelete` 설정을 갖고 있는지 확인한다.

`prisma/schema.prisma`를 읽고 다음 패턴을 찾는다:

```
groupId  String  (또는 String?)
userId   String  (또는 String?)
```

각 필드가 선언된 모델에서 같은 모델 안에 아래 패턴이 있는지 확인:

```
Group   @relation(..., onDelete: ...)   ← groupId 대응
User    @relation(..., onDelete: ...)   ← userId 대응
```

**판정 기준:**
- `onDelete: Cascade` → ✅ 그룹/유저 삭제 시 자동 삭제
- `onDelete: SetNull` → ✅ null 처리 (의도적)
- `onDelete: Restrict` / `onDelete: NoAction` → ⚠️ 삭제 차단 (의도 확인 필요)
- `@relation` 자체가 없음 → ❌ 고아 데이터 발생 가능

**출력 예시:**
```
[1단계] 외래키 누락 검사
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ SavingsGoal.groupId — @relation 없음 (고아 데이터 위험)
✅ GroupMember.groupId — onDelete: Cascade
✅ Task.groupId — onDelete: Cascade
✅ Notification.userId — onDelete: Cascade
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
결과: ❌ 1건 발견
```

---

### 2단계 — 스케줄러 타이밍 이슈 검사

**목표:** 스케줄러가 groupId/userId 기준으로 데이터를 조회한 뒤, 그룹/유저 존재 여부를 재확인하지 않고 알림을 발송하는 패턴을 탐지한다.

`src/**/*.scheduler.ts` 파일을 모두 읽는다.

**위험 패턴 A — 고아 groupId로 groupMember 조회:**
```typescript
// ❌ 위험: groupId가 유효한지 확인 없이 바로 멤버 조회
const members = await this.prisma.groupMember.findMany({
  where: { groupId },   // ← group 존재 여부 미확인
});
```

안전한 패턴:
```typescript
// ✅ 안전: group join으로 존재 여부 동시 확인
where: { groupId, group: { id: groupId } }
// 또는 조회 후 members.length === 0 이면 continue
```

**위험 패턴 B — include 없이 중첩 관계 사용:**
```typescript
// ❌ 위험: child.group을 include하지 않고 사용
const plans = await this.prisma.childAllowancePlan.findMany({
  include: { child: true },  // group 미포함
});
if (!child.group) ...  // ← 런타임 에러 또는 undefined 접근
```

**위험 패턴 C — 외래키 없는 모델의 groupId 직접 사용:**
스키마에서 `@relation` 없는 groupId를 가진 모델을 1단계에서 파악한 뒤,
해당 모델을 스케줄러에서 조회한 후 groupId를 그대로 알림/트랜잭션에 사용하면 위험.

**출력 예시:**
```
[2단계] 스케줄러 타이밍 이슈 검사
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ childcare.scheduler.ts — dispatchAllowance: child.group 체크 있음
✅ fridge.scheduler.ts — runExpiryAlert: group join 조건 있음
⚠️ savings.scheduler.ts — runAutoDeposit: SavingsGoal 외래키 없음 (스키마 수정 필요)
✅ gold-asset.scheduler.ts — runRecordReminder: group join 조건 있음
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
결과: ⚠️ 1건 주의
```

---

### 3단계 — 다국어 키 누락 검사

**목표:** 소스코드에서 `i18n.t('key')` 또는 `this.t('key', ...)` 로 참조하는 키가 모든 언어 파일에 실제로 존재하는지 확인한다.

#### 3-A. 코드에서 사용된 i18n 키 수집

`src/` 아래 모든 `.ts` 파일에서 다음 패턴으로 키를 추출:
- `i18n.t('...')` 또는 `i18n.t("...")`
- `this.t('...', ...)` 또는 `this.t("...", ...)`
- `t('...')` 등 래퍼 함수
- `throw new XxxException('key')` — NestJS 예외 메시지로 i18n 키를 직접 전달하는 패턴도 포함

추출된 키 예시: `group.errors.group_not_found`, `childcare.notification.allowance_title_child`

> 동적 키(`'prefix.' + variable` 형태)는 정적 분석 불가 — "동적 키 N건은 수동 확인 필요"로 안내

#### 3-B. 언어 파일 키 목록 수집

`src/i18n/` 디렉토리 구조:
```
src/i18n/
  ko/   ← 기준 언어
  en/
  ja/
  zh/
```

각 언어별 JSON 파일을 읽어 플랫 키 목록을 생성한다.
예: `{ "notification": { "allowance_title_child": "..." } }` → `childcare.notification.allowance_title_child`

#### 3-C. 교차 검증

**검사 1 — 코드에서 쓰이지만 번역 파일에 없는 키:**
```
❌ ko/childcare.json 에 키 없음: childcare.notification.new_key
```

**검사 2 — ko 에는 있지만 다른 언어에 없는 키 (언어 간 불일치):**
```
⚠️ en/childcare.json 누락: childcare.notification.savings_mature_title_child
⚠️ ja/savings.json 누락: savings.notification.goal_reached_body
```

**검사 3 — 번역 파일에만 있고 코드에서 전혀 쓰이지 않는 키 (사용되지 않는 번역):**
```
💡 ko/group.json 미사용 키: group.legacy.old_message (삭제 검토)
```
→ 이 검사는 정보성으로만 표시 (false positive 가능성 있음)

**출력 예시:**
```
[3단계] 다국어 키 검사
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
코드에서 추출된 i18n 키: 142개
ko 파일 등록 키: 156개

❌ 코드 참조 키 누락 (2건):
  • ko, en, ja, zh / childcare.json → childcare.notification.new_feature_title
  • en / savings.json → savings.notification.goal_reached_title

⚠️ 언어 간 키 불일치 (3건):
  • en/fridge.json 누락 → fridge.notification.expiring_body
  • ja/assets.json 누락 → assets.notification.record_reminder_body
  • zh/childcare.json 누락 → childcare.notification.negotiation_body_today

💡 미사용 키 (정보성, 5건):
  • ko/group.json → group.legacy.disbanded
  ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
결과: ❌ 2건 오류 / ⚠️ 3건 주의
```

---

## 최종 결과 요약

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[safety-check] 결과 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1단계 외래키 누락:     ❌ N건 / ✅ 통과
2단계 스케줄러 이슈:   ⚠️ N건 / ✅ 통과
3단계 다국어 키:       ❌ N건 오류, ⚠️ N건 주의 / ✅ 통과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**❌ 오류가 있는 경우** 수정 방법을 제안하고 수정 여부를 물어본다.
**⚠️ 주의만 있는 경우** 의도적인지 확인을 요청한다.
**모두 통과한 경우** "✅ safety-check 통과" 를 출력한다.

---

## 주의사항

- 동적 키(`i18n.t('prefix.' + variable)`)는 정적 분석으로 추출 불가 → 탐지 대상에서 제외하고 "동적 키 N건은 수동 확인 필요" 안내
- `// i18n-ignore` 주석이 있는 라인은 검사 제외
- 3-C 미사용 키 검사는 false positive가 많으므로 정보성으로만 표시
