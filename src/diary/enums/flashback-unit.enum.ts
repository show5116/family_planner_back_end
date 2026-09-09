/**
 * 회고 시점의 단위
 *
 * 라벨 문자열을 서버가 만들지 않고 숫자와 단위만 내려, 앱이 각 언어의 복수형
 * 규칙(`1 month ago` / `3 months ago`)에 맞게 문장을 만들게 한다.
 */
export enum FlashbackUnit {
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}
