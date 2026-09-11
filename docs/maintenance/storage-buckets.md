# R2 버킷 구성 — 공개/비공개 분리

파일을 어느 버킷에 둘지는 **그 파일의 URL이 공개되어도 되는가**로 갈린다.
잘못 두면 사적인 파일이 영구 공개 링크를 얻는다.

---

## 버킷 두 개

| 버킷 | 환경변수 | 공개 개발 URL(r2.dev) | 용도 |
|------|----------|----------------------|------|
| `family-planner` | `R2_BUCKET_NAME` | **켜짐** (`R2_PUBLIC_URL`) | 프로필 이미지, 에디터 이미지 |
| `family-planner-private` | `R2_PRIVATE_BUCKET_NAME` | **꺼짐** | 일기 미디어, 가계부 영수증 |

`R2_PRIVATE_BUCKET_NAME`이 비어 있으면 기존 버킷으로 폴백한다
([r2.config.ts](../../src/config/r2.config.ts)). 환경변수를 넣지 않고 배포해도 뜨긴 하지만,
**그 상태에서는 비공개여야 할 파일이 공개 버킷에 쌓인다.** 배포 전에 반드시 설정할 것.

## prefix별 소속

| prefix | 버킷 | 이유 |
|--------|------|------|
| `avatars/` | 공개 | 키에서 URL을 매번 생성하므로 비공개로 옮길 수는 있으나, 공개여도 무방 |
| `qna/`, `announcements/` | 공개 | **발급된 URL이 본문 HTML에 박혀 저장된다.** 만료되는 URL을 쓸 수 없다 |
| `diary-media/` | 비공개 | 일기는 사적인 기록 |
| `receipts/` | 비공개 | 영수증은 사적인 금융 문서 |

## 왜 분리했는가

공개 버킷은 r2.dev 공개 URL이 열려 있어 **키만 알면 누구나 인증 없이 읽는다.**
즉 presigned GET URL에서 쿼리스트링만 떼면 그 경로가 영구 접근 링크가 된다.

```
https://pub-….r2.dev/diary-media/…/x.jpg?X-Amz-Signature=…   ← 1시간 만료
https://pub-….r2.dev/diary-media/…/x.jpg                      ← 만료 없음 (구멍)
```

"일기는 사적이니 단기 만료 presigned"라는 설계가 실제로는 성립하지 않았다.
비공개 버킷은 공개 URL 자체가 없어 서명 없이는 접근 경로가 없다.

버킷을 나눠도 **요금과 구독 용량 한도는 그대로**다. R2 과금은 계정 단위 합산이라
같은 바이트를 어디에 두든 요금이 같고, 무료 한도도 계정당이다. 앱의 용량 한도는
R2가 아니라 `DiaryMedia.fileSize` 합으로 계산하므로 버킷과 무관하다.

## 코드에서 쓰는 법

`StorageService`의 메서드는 마지막 인자로 버킷을 받는다. 생략하면 공개 버킷이다.

```ts
// 비공개 파일
await this.storage.getUploadUrl(key, mime, ttl, this.storage.privateBucket);
await this.storage.getViewUrl(key, ttl, mime, this.storage.privateBucket);
await this.storage.deleteFile(key, this.storage.privateBucket);

// 공개 파일 (기존 그대로)
await this.storage.uploadImage(file, 'avatars');
```

**비공개 버킷 파일에는 `getPublicUrl()`을 쓰지 않는다.** 고정 URL이 없으므로
조회 시점에 `getViewUrl()`로 서명해 내보낸다. 영수증은 이 때문에 `fileUrl` 칼럼을
더 이상 쓰지 않고(빈 문자열), 조회 응답에서 매번 새로 발급한다.

## 새 업로드 기능을 만들 때

1. 이 파일의 URL이 공개되어도 되는지 먼저 정한다
2. 비공개면 `privateBucket`을 넘기고, 응답 URL은 조회 시점에 서명한다
3. presigned PUT은 **Content-Type이 서명 대상이 아니다.** 신고값을 믿지 말고
   `confirm` 단계에서 `getFileMetadata()`(실측 크기) +
   [media-signature.util.ts](../../src/common/utils/media-signature.util.ts)(매직바이트)로 확인한다

---

**Last Updated**: 2026-09-12
