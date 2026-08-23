import { PrismaClient, BadgeCriteriaType } from '@prisma/client';

const prisma = new PrismaClient();

const BADGES: {
  code: string;
  title: string;
  description: string;
  iconEmoji: string;
  criteriaType: BadgeCriteriaType;
  criteriaValue: number;
  sortOrder: number;
}[] = [
  { code: 'GOAL_STREAK_3', title: '3일 연속 달성', description: '일일 목표를 3일 연속으로 달성했어요', iconEmoji: '🌱', criteriaType: 'GOAL_STREAK_DAYS', criteriaValue: 3, sortOrder: 0 },
  { code: 'GOAL_STREAK_7', title: '7일 연속 달성', description: '일일 목표를 7일 연속으로 달성했어요', iconEmoji: '🔥', criteriaType: 'GOAL_STREAK_DAYS', criteriaValue: 7, sortOrder: 1 },
  { code: 'GOAL_STREAK_14', title: '2주 연속 달성', description: '일일 목표를 14일 연속으로 달성했어요', iconEmoji: '🔥', criteriaType: 'GOAL_STREAK_DAYS', criteriaValue: 14, sortOrder: 2 },
  { code: 'GOAL_STREAK_30', title: '30일 연속 달성', description: '일일 목표를 30일 연속으로 달성했어요', iconEmoji: '🔥🔥', criteriaType: 'GOAL_STREAK_DAYS', criteriaValue: 30, sortOrder: 3 },
  { code: 'GOAL_STREAK_100', title: '100일 연속 달성', description: '일일 목표를 100일 연속으로 달성했어요', iconEmoji: '🔥🔥🔥', criteriaType: 'GOAL_STREAK_DAYS', criteriaValue: 100, sortOrder: 4 },
  { code: 'GOAL_TOTAL_10', title: '누적 10일 달성', description: '일일 목표를 누적 10일 달성했어요', iconEmoji: '⭐', criteriaType: 'GOAL_TOTAL_DAYS', criteriaValue: 10, sortOrder: 5 },
  { code: 'GOAL_TOTAL_50', title: '누적 50일 달성', description: '일일 목표를 누적 50일 달성했어요', iconEmoji: '⭐⭐', criteriaType: 'GOAL_TOTAL_DAYS', criteriaValue: 50, sortOrder: 6 },
  { code: 'GOAL_TOTAL_100', title: '누적 100일 달성', description: '일일 목표를 누적 100일 달성했어요', iconEmoji: '⭐⭐⭐', criteriaType: 'GOAL_TOTAL_DAYS', criteriaValue: 100, sortOrder: 7 },
  { code: 'GOAL_TOTAL_365', title: '누적 365일 달성', description: '일일 목표를 누적 365일 달성했어요', iconEmoji: '👑', criteriaType: 'GOAL_TOTAL_DAYS', criteriaValue: 365, sortOrder: 8 },
  { code: 'GOAL_PERFECT_WEEK_1', title: '완벽한 한 주', description: '한 주(월~일) 동안 매일 일일 목표를 달성했어요', iconEmoji: '🏆', criteriaType: 'GOAL_PERFECT_WEEK', criteriaValue: 1, sortOrder: 9 },
  { code: 'GOAL_PERFECT_WEEK_4', title: '완벽한 4주', description: '완벽한 한 주를 4번 달성했어요', iconEmoji: '🏆🏆', criteriaType: 'GOAL_PERFECT_WEEK', criteriaValue: 4, sortOrder: 10 },
  { code: 'GOAL_PERFECT_WEEK_12', title: '완벽한 12주', description: '완벽한 한 주를 12번 달성했어요', iconEmoji: '🏆🏆🏆', criteriaType: 'GOAL_PERFECT_WEEK', criteriaValue: 12, sortOrder: 11 },
];

async function main() {
  for (const badge of BADGES) {
    await prisma.routineBadge.upsert({
      where: { code: badge.code },
      update: {},
      create: badge,
    });
  }
  const count = await prisma.routineBadge.count();
  console.log(`routine_badges seeded, total count: ${count}`);
  await prisma.$disconnect();
}

main();
