export enum TaskType {
  CALENDAR_ONLY = 'CALENDAR_ONLY', // 캘린더 전용 (생일, 기념일 등)
  TODO_LINKED = 'TODO_LINKED', // 할일 연동 (완료 체크 가능)
  TODO_ONLY = 'TODO_ONLY', // 할일 전용 (캘린더 미표시, 완료 체크 가능)
}
