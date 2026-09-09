# 백엔드 요청 — 회고 카드 마감(Phase 2 잔여) + 영상 첨부 준비(Phase 3)

- **작성일**: 2026-09-09
- **대상**: `GET /diaries/flashback`, `POST /diaries/media/reserve`,
  `POST /diaries/media/:id/confirm`, `POST /subscription/verify`
- **관련 파일**: `src/diary/diary.service.ts`, `src/diary/dto/diary-response.dto.ts`,
  `src/diary/media/diary-media.service.ts`, `src/diary/media/diary-media.controller.ts`,
  `src/diary/media/dto/diary-media-response.dto.ts`
- **우선순위**: 1·2번 **상** (Phase 2 마감, 둘 다 작음) / 3번 **상** (Phase 3 선행 조건) /
  4번 하 (문서) / 5번 중 (Phase 3)
- **상태**: 요청

> **검증 기준**: 백엔드 `master` `33f9cd7` (2026-09-09 11:41) 기준으로 소스를 직접 대조해
> 작성했습니다. 처음 초안에 있던 "영상 길이·MIME·한도 검증이 되어 있는지 확인 요청"과
> "quota-plans에 premium이 있는지 확인 요청"은 **확인해보니 이미 전부 구현돼 있어 뺐습니다.**
> 아래 남은 것만 실제로 필요한 작업입니다.

---

## 배경

다이어리 **Phase 2(사진 첨부 + 용량 한도) 프론트 구현이 끝났습니다.**
`/diaries/media` 6개와 `/subscription/quota-plans`를 전부 연결했고,
업로드는 `reserve → R2 직접 PUT → confirm` 3단계로 동작합니다.

작업하면서 **회고(플래시백) 카드만 반쪽으로 남았습니다.** 원인이 서버 쪽에 두 개 있고,
둘 다 작습니다(1·2번). 그리고 **Phase 3(영상)을 시작하려면 서버에 먼저 있어야 하는
것이 하나** 있습니다(3번).

---

## 1. 회고 응답에 첨부 썸네일이 없다 (Phase 2 잔여)

### 현상

타임라인 최상단 "n개월 전 오늘" 회고 카드가 **글자만 나옵니다.**
사진이 있는 날의 회고인데도 썸네일이 뜨지 않습니다.

회고는 **찾으러 가지 않아도 올라오는 유일한 뷰**입니다. 사진이 없으면
"글 한 줄 적힌 회색 카드"가 되어 탭할 이유가 생기지 않습니다.
기획([21-diary.md] 회고 절 / 프론트 24-diary.md §5-1-B)에서 이 기능의 위력이
사진에서 나온다고 본 이유이기도 합니다.

### 원인

`getFlashback`이 **미디어를 아예 조회하지 않습니다.**

`src/diary/diary.service.ts:374-383`

```ts
const diary = await this.prisma.diary.findFirst({
  where: { userId, deletedAt: null, date: { in: [...] } },
  orderBy: { date: 'asc' },
});                                    // ← include: { media } 없음
```

`src/diary/diary.service.ts:389-397` — 응답 조립에도 미디어가 없습니다.

```ts
items: [{ id, date, label, title, excerpt, mood }]
```

`DiaryFlashbackItemDto`(`src/diary/dto/diary-response.dto.ts:166-191`)에도
미디어 관련 필드가 없습니다.

같은 Phase 2 작업에서 `GET /diaries`·`/diaries/:id`에는 `media[]`가 추가됐는데
**회고 DTO만 함께 수정되지 않았습니다.**

### 요청

**대표 썸네일 1장만** 추가해 주세요. 카드가 사진을 한 장만 쓰기 때문에,
목록처럼 `media[]` 전체를 내려주면 **쓰지도 않을 presigned URL을 여러 개 서명**하게 됩니다.

```jsonc
{
  "id": "uuid-1234",
  "date": "2025-09-01",
  "label": "1년 전 오늘",
  "title": "가을 첫날",
  "excerpt": null,
  "mood": "😊",
  "hasMedia": true,             // 추가 (boolean)
  "thumbnailUrl": "https://…"   // 추가 (string | null, 단기 만료 presigned GET)
}
```

- 대표 썸네일은 **`sortOrder`가 가장 앞선 `CONFIRMED` 미디어**로 잡아 주세요.
  상세 화면 갤러리의 첫 장과 같아야 합니다 — 다르면 "카드에서 본 사진이 안에 없다"가 됩니다.
- `thumbnailKey`가 비어 있으면 `storageKey`를 서명해 주세요.
  현재 이미지에는 `thumbnailKey`를 채우는 코드가 없어(→ 3번) 그대로 두면 **항상 null**입니다.
  기존 `signKey()`(`diary-media.service.ts:92`, `:516`)를 그대로 쓰면 됩니다.
- 첨부가 없으면 `hasMedia: false`, `thumbnailUrl: null`.

**추가로**, 후보가 여러 개일 때 고르는 규칙에 한 단계만 얹어 주세요.
현재는 `orderBy: { date: 'asc' }`로 "가장 오래된 것"입니다(`diary.service.ts:377`).

```
1. 첨부가 있는 회고          ← 추가
2. 더 오래된 회고            (기존)
```

이건 **선택입니다.** (1)만 반영되면 여러 건을 내려주시고 앱에서 정렬해도 됩니다.

### 검증 케이스

| # | 상황 | 기대 |
|---|---|---|
| 1 | 1년 전 오늘 일기에 사진 3장 | `hasMedia: true`, `thumbnailUrl` = `sortOrder` 최소 항목 |
| 2 | 1년 전 오늘 일기에 사진 없음 | `hasMedia: false`, `thumbnailUrl: null` |
| 3 | 첨부가 전부 `PENDING` | `hasMedia: false` — 업로드 중인 것은 세지 않는다 |
| 4 | 첨부를 삭제한 일기 | `hasMedia: false` — `deletedAt` 찍힌 미디어 제외 |
| 5 | 3개월 전(사진 있음) + 1년 전(사진 없음) | 3개월 전이 먼저 (선택 항목 반영 시) |

### 앱 쪽 대응

- **앱에서 보정하지 않습니다.** 회고 목록을 받고 일기 상세를 다시 조회하면 카드 하나에
  요청이 2번 나갑니다. 회고는 부가 정보라 그만한 비용을 쓸 곳이 아닙니다.
- 현재 앱은 필드가 없어도 **글자 카드로 정상 동작**합니다. 배포 순서 제약 없습니다.

---

## 2. 회고 라벨이 한국어로 고정돼 있다 (Phase 2 잔여 · 다국어 버그)

### 현상

**일본어·영어·중국어로 앱을 쓰는 사용자에게 회고 카드만 한국어로 나옵니다.**

```
[ 3개월 전 오늘 ]      ← 앱 언어가 English여도 이렇게 나온다
  가을 첫날
```

앱은 4개 언어(ko/en/ja/zh)를 지원하고 나머지 화면은 전부 번역돼 있어서,
이 카드 하나만 한국어로 떠 있는 상태가 됩니다.

### 원인

라벨 문자열을 **서버가 한국어로 만들어 내려줍니다.**

`src/diary/diary.service.ts:357-365`

```ts
const candidates = [
  { label: '1개월 전 오늘', date: today.subtract(1, 'month') },
  { label: '3개월 전 오늘', date: today.subtract(3, 'month') },
  { label: '6개월 전 오늘', date: today.subtract(6, 'month') },
  ...Array.from({ length: Math.max(yearsBack, 0) }, (_, index) => ({
    label: `${index + 1}년 전 오늘`,
    date: today.subtract(index + 1, 'year'),
  })),
];
```

앱은 이 `label`을 **그대로 화면에 찍습니다**
(`lib/features/main/diary/presentation/widgets/flashback_card.dart:46`).

다른 API는 `diary.errors.file_too_large` 처럼 **메시지 키**를 내려주고 있어서
이 저장소의 관례와도 어긋납니다.

### 요청 — 라벨 대신 **숫자와 단위**를 내려주세요

문자열을 번역해 달라는 게 아닙니다. **앱이 문장을 만들 수 있게 재료만** 주시면 됩니다.
영어는 `1 month ago` / `3 months ago`로 복수형이 갈려서, 서버가 언어별 문자열을
들고 있는 것보다 앱이 ARB plural로 만드는 쪽이 맞습니다.

```jsonc
{
  "id": "uuid-1234",
  "date": "2025-09-01",
  "label": "1년 전 오늘",   // 유지 — 구버전 앱 호환용
  "unit": "YEAR",           // 추가 — 'MONTH' | 'YEAR'
  "amount": 1,              // 추가 — 1·3·6(개월) 또는 n(년)
  …
}
```

- **`label`은 지우지 말고 남겨 주세요.** 지금 배포된 앱이 이 필드를 그리고 있어서,
  서버만 먼저 나가면 회고 카드에서 라벨이 사라집니다.
- 앱은 `unit`·`amount`가 오면 그걸로 번역된 문구를 만들고, 없으면 `label`로 폴백합니다.

### 검증 케이스

| # | 후보 | 기대 |
|---|---|---|
| 1 | 1개월 전 오늘 | `unit: "MONTH"`, `amount: 1` |
| 2 | 6개월 전 오늘 | `unit: "MONTH"`, `amount: 6` |
| 3 | 3년 전 오늘 | `unit: "YEAR"`, `amount: 3` |

### 앱 쪽 대응

- ARB 4개 파일에 **plural 문법**으로 키를 넣고, `unit`·`amount`로 문구를 만들겠습니다
  (`diary_flashback_months`, `diary_flashback_years` — 프론트 24-diary.md §7에 예약된 키).
- `unit`이 없으면 서버가 준 `label`을 그대로 쓰므로 **서버가 먼저 나가도 안 깨집니다.**

---

## 3. 영상 썸네일을 올릴 경로가 없다 (Phase 3 선행 조건)

### 현상

Phase 3에서 영상을 올리면 **목록·그리드에 보여줄 그림이 없습니다.**

지금도 이미 반쪽입니다 — **`thumbnailKey`를 채우는 코드가 어디에도 없어서
`thumbnailUrl`은 항상 `null`입니다.** 이미지는 원본 URL로 대체할 수 있어
Phase 2에서는 티가 나지 않지만(앱이 `thumbnailUrl ?? url`로 폴백),
영상은 원본을 썸네일로 쓸 수 없어 그대로 빈 칸이 됩니다.

### 원인

설계상 **서버는 바이트를 보지 않습니다.** 프론트 24-diary.md §3-2·§4에서
이렇게 정해두었습니다.

> 서버는 검증(크기·타입·길이)만 한다. … 썸네일은 클라이언트에서 첫 프레임을 추출해
> 함께 올린다 (서버 ffmpeg 부담 감소).

그런데 업로드 URL을 **하나만** 발급합니다.
`src/diary/media/dto/diary-media-response.dto.ts:75-87`

```ts
export class ReserveMediaResultDto {
  mediaId: string;
  uploadUrl: string;      // ← 본체용 하나뿐
  storageKey: string;
  expiresIn: number;
}
```

스키마에는 자리가 있고(`prisma/schema.prisma:804` `thumbnailKey`),
서비스는 그 키를 **서명하고**(`diary-media.service.ts:92`, `:516`)
**삭제까지**(`:427`, `:485`) 합니다. **쓰는 코드만 없습니다.**

### 요청 — `type: VIDEO`일 때 썸네일 업로드 URL을 함께 발급

**권장안**: `reserve` 응답에 필드 2개 추가 (왕복이 늘지 않습니다).

```jsonc
{
  "mediaId": "",
  "uploadUrl": "",
  "storageKey": "",
  "expiresIn": 0,
  "thumbnailUploadUrl": "",  // 추가 — VIDEO일 때만 (string | null)
  "thumbnailKey": ""         // 추가 — VIDEO일 때만 (string | null)
}
```

앱 동작은 이렇게 됩니다.

```
[1] reserve                    → uploadUrl + thumbnailUploadUrl 수령
[2] PUT <uploadUrl>              영상 본체 → R2
[2'] PUT <thumbnailUploadUrl>    첫 프레임 JPEG → R2   (본체와 병렬)
[3] confirm                    → 서버가 둘 다 HeadObject로 확인
```

**함께 정해 주셨으면 하는 것 3가지**

1. **썸네일이 없다고 `confirm`을 실패시키지 말아 주세요.**
   프레임 추출은 기기·코덱에 따라 실패합니다. 없으면 `thumbnailKey`를 비운 채 확정하고,
   앱은 재생 아이콘만 있는 회색 칸으로 그리겠습니다.
   **본체가 올라갔는데 썸네일 때문에 업로드 전체가 날아가는 쪽이 훨씬 나쁩니다.**
2. **썸네일 크기는 한도에 넣지 말아 주세요.** 수십 KB가 월간 한도를 깎으면
   "20MB 영상 올렸는데 20.1MB가 줄었다"를 사용자가 겪습니다.
   집계는 지금처럼 본체 `fileSize`만으로 두는 편이 설명하기 쉽습니다
   (`perFileBytes` 검증에도 넣지 않기).
3. **이미지에도 같은 경로를 열어둘지** 정해 주세요. 지금은 앱이 원본 URL로 폴백하고 있어
   급하지 않지만, 목록에서 원본을 그대로 받는 구조라 **사진이 많은 달에 트래픽이 큽니다.**
   영상 작업하는 김에 이미지 축소본도 같은 방식으로 올리게 하면 그게 해결됩니다.
   (지금 결정하지 않아도 되고, 영상만 먼저 열어도 됩니다)

썸네일 규격은 앱이 맞추겠습니다 — **JPEG, 최대 변 640px, 품질 80.**
다른 값을 원하시면 알려주세요.

**대안**: `POST /diaries/media/:id/thumbnail/reserve`로 전용 예약을 따로 두는 방식.
왕복이 1회 늘지만 `reserve` 응답을 안 건드립니다. 어느 쪽이든 앱은 맞출 수 있습니다.

### 앱 쪽 대응

- **정해지기 전에는 영상 코드를 쓰지 않겠습니다.** 지금 짜두면 방식이 바뀔 때 버려야 합니다.
  **이 항목이 Phase 3 착수의 실질적 게이트입니다.**
- 앱은 모델·한도 파싱까지는 이미 영상을 열어뒀습니다
  (`DiaryMedia.durationMs`, `MediaQuota.videoAllowed`, `maxVideoDurationMs`).
  **UI와 압축만 이미지 전용**이라 서버가 준비되면 그 위에 얹으면 됩니다.

---

## 4. 검증은 다 돼 있는데 API 문서에 안 드러난다 (문서만)

### 확인한 것

처음에는 "영상 길이·MIME·한도 검증이 실제로 걸려 있는지 확인해 달라"고 쓰려 했는데,
**소스를 보니 전부 구현돼 있었습니다.** `diary-media.service.ts`

| 검증 | 위치 | 응답 |
|---|---|---|
| 파일 1개 최대 크기 | `:114` | 413 |
| 영상 불가 등급 | `:119` | 403 |
| 영상 길이 초과 | `:125-128` | 400 |
| MIME 화이트리스트 | `:131` | 400 |
| 월간/누적 한도 (Redis 락) | `:146` | 402 + `quota` 동봉 |
| confirm 실측 재검증 | `:210`, `:220`, `:232` | 400 / 413 / 402 |

402가 `quota`를 함께 싣는 것도 확인했습니다(`quota-exceeded.exception.ts`).
**앱이 이미 그 필드를 파싱해 "이번 달 남은 용량 N MB"를 띄우고 있어서 그대로 맞습니다.**

### 요청 — `@ApiResponse` 누락분만 채워 주세요

앱은 **상태 코드로 안내 문구를 가릅니다**(사유마다 제시하는 대안이 다릅니다).
그런데 생성된 문서([docs/api/diaries-media.md])에는 이렇게만 나옵니다.

| 엔드포인트 | 문서에 있는 것 | 실제로 던지는 것 |
|---|---|---|
| `reserve` | 201 · 403 · 404 | + **400** · **402** · **413** |
| `confirm` | 201 · 404 | + **400** · **402** · **413** |

`reserve`에는 `@ApiBadRequest`가 붙어 있는데도(`diary-media.controller.ts:63`)
문서에 400이 안 잡혔습니다 — **생성기가 흘린 것 같습니다**
(`cc25cde`의 "gen:api 누락분"과 같은 증상으로 보입니다).
`402`·`413`은 데코레이터 자체가 없습니다.

영상 길이 초과(400) 응답에 `maxVideoDurationMs`를 실어 주시면
"최대 60초까지 올릴 수 있어요"처럼 구체적으로 안내하겠습니다.

### 앱 쪽 대응

- 앱은 이미 402·413·403을 분기해 각각 다른 안내를 띄우고 있습니다
  (`DiaryMediaRepository._mapUploadError`). **동작에 문제는 없고**, 문서가 실제와
  맞아야 다음 작업에서 또 확인하지 않게 됩니다.

---

## 5. 프리미엄 등급 판매 (Phase 3)

### 확인한 것

**`/subscription/quota-plans`는 이미 3개 등급을 전부 내려줍니다.**
`src/config/diary-media.config.ts:27-48` — `premium`은 월 2GB / 누적 20GB /
파일 200MB / `videoAllowed: true` / 5분. 환경변수 오버라이드까지 돼 있어
**앱 재배포 없이 한도를 조정할 수 있는 형태**입니다. 요청드릴 게 없습니다.

구독 화면의 등급별 한도표가 이 응답을 그대로 그리므로,
**서버 값을 바꾸면 앱 수정 없이 표에 반영됩니다.**

### 요청 (Phase 3 착수 시점에)

1. **`POST /subscription/verify`가 `family_planner_premium_monthly` 영수증을 받아
   `premium` tier로 반영**하는지 확인해 주세요.
2. **스토어 웹훅**(갱신·해지·환불)이 premium 상품 ID도 처리하는지 확인해 주세요.
   `ad_free`만 매핑돼 있으면 갱신이 반영되지 않습니다.
3. **다운그레이드 시 기존 파일을 지우지 말아 주세요.** 누적 한도를 초과한 상태면
   **신규 업로드만 차단**하고 조회·삭제는 허용합니다. 프리미엄에서 20GB를 채운 사용자가
   해지했다고 사진이 사라지면 스토어 평점과 CS 양쪽에서 문제가 됩니다.

### 앱 쪽 대응

- 스토어 콘솔 상품 등록과 `IapProductIds.all` 추가는 앱 쪽 작업으로 잡아뒀습니다.
- 플랜 비교 카드가 2열 → 3열이 되어 가로가 좁아지므로 **세로 스택으로 재작업**해야 합니다.

---

## 요약

| # | 항목 | 규모 | 지금 가능? |
|---|---|---|---|
| 1 | 회고 응답에 `hasMedia` + `thumbnailUrl` | 작음 | ✅ |
| 2 | 회고 라벨을 `unit` + `amount`로 (다국어 버그) | 작음 | ✅ |
| 3 | 영상 썸네일 업로드 URL | 중간 | **Phase 3 게이트** |
| 4 | `@ApiResponse` 누락분 (400·402·413) | 작음 | ✅ |
| 5 | 프리미엄 verify·웹훅·다운그레이드 | 중간 | 3번 이후 |

**1·2·4번은 지금 바로 가능하고 셋 다 작습니다.** 1·2번을 하면 회고 카드가 제 모습이 되어
Phase 2가 완전히 닫힙니다. 3번이 정해져야 앱에서 영상 작업을 시작할 수 있습니다.
