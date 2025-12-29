export enum QuestionStatus {
  PENDING = 'PENDING', // 대기 중 (답변 대기)
  ANSWERED = 'ANSWERED', // 답변 완료 (ADMIN 답변 완료)
  RESOLVED = 'RESOLVED', // 해결 완료 (사용자가 해결 확인)
}
