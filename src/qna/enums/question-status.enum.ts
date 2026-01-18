export enum QuestionStatus {
  PENDING = 'PENDING', // 대기 중 (답변 대기)
  ANSWERED = 'ANSWERED', // 답변 완료 (ADMIN 답변 완료)
  RESOLVED = 'RESOLVED', // 해결 완료 (질문자 확인 또는 자동 처리)
}
