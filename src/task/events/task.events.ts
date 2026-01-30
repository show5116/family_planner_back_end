import { Task, Prisma } from '@prisma/client';

// Prisma JSON 호환 타입
type JsonRecord = Prisma.InputJsonObject;

/**
 * Task 생성 이벤트
 */
export class TaskCreatedEvent {
  constructor(
    public readonly task: Task,
    public readonly userId: string,
    public readonly groupId: string | null,
    public readonly participantIds: string[],
  ) {}
}

/**
 * Task 수정 이벤트
 */
export class TaskUpdatedEvent {
  constructor(
    public readonly task: Task,
    public readonly userId: string,
    public readonly before: JsonRecord,
    public readonly after: JsonRecord,
    public readonly newParticipantIds: string[],
  ) {}
}

/**
 * Task 완료 이벤트
 */
export class TaskCompletedEvent {
  constructor(
    public readonly task: Task,
    public readonly userId: string,
    public readonly isCompleted: boolean,
  ) {}
}

/**
 * Task 삭제 이벤트
 */
export class TaskDeletedEvent {
  constructor(
    public readonly taskIds: string[],
    public readonly userId: string,
  ) {}
}

/**
 * 반복 Task 일괄 수정 이벤트
 */
export class TaskBulkUpdatedEvent {
  constructor(
    public readonly taskIds: string[],
    public readonly userId: string,
    public readonly before: JsonRecord,
    public readonly after: JsonRecord,
  ) {}
}

/**
 * 반복 일정 건너뛰기 이벤트
 */
export class RecurringSkippedEvent {
  constructor(
    public readonly recurringId: string,
    public readonly userId: string,
    public readonly groupId: string | null,
    public readonly skipDate: string,
    public readonly reason: string | null,
  ) {}
}

/**
 * 반복 Task 자동 생성 이벤트 (스케줄러/즉시 생성용)
 */
export class RecurringTasksGeneratedEvent {
  constructor(
    public readonly taskIds: string[],
    public readonly userId: string,
    public readonly recurringId: string,
  ) {}
}
