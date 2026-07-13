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
  { code: 'STREAK_DAYS_7', title: '7일 연속 달성', description: '루틴을 7일 연속으로 체크했어요', iconEmoji: '🔥', criteriaType: 'STREAK_DAYS', criteriaValue: 7, sortOrder: 0 },
  { code: 'STREAK_DAYS_30', title: '30일 연속 달성', description: '루틴을 30일 연속으로 체크했어요', iconEmoji: '🔥', criteriaType: 'STREAK_DAYS', criteriaValue: 30, sortOrder: 1 },
  { code: 'STREAK_DAYS_100', title: '100일 연속 달성', description: '루틴을 100일 연속으로 체크했어요', iconEmoji: '🏆', criteriaType: 'STREAK_DAYS', criteriaValue: 100, sortOrder: 2 },
  { code: 'STREAK_WEEKS_4', title: '4주 연속 목표 달성', description: '4주 연속으로 주간 목표를 달성했어요', iconEmoji: '⭐', criteriaType: 'STREAK_WEEKS', criteriaValue: 4, sortOrder: 3 },
  { code: 'STREAK_WEEKS_12', title: '12주 연속 목표 달성', description: '12주 연속으로 주간 목표를 달성했어요', iconEmoji: '🌟', criteriaType: 'STREAK_WEEKS', criteriaValue: 12, sortOrder: 4 },
  { code: 'STREAK_WEEKS_52', title: '1년 연속 목표 달성', description: '52주 연속으로 주간 목표를 달성했어요', iconEmoji: '👑', criteriaType: 'STREAK_WEEKS', criteriaValue: 52, sortOrder: 5 },
  { code: 'TOTAL_CHECKS_50', title: '누적 50회 체크', description: '루틴을 총 50회 체크했어요', iconEmoji: '✅', criteriaType: 'TOTAL_CHECKS', criteriaValue: 50, sortOrder: 6 },
  { code: 'TOTAL_CHECKS_200', title: '누적 200회 체크', description: '루틴을 총 200회 체크했어요', iconEmoji: '💯', criteriaType: 'TOTAL_CHECKS', criteriaValue: 200, sortOrder: 7 },
  { code: 'TOTAL_CHECKS_500', title: '누적 500회 체크', description: '루틴을 총 500회 체크했어요', iconEmoji: '💎', criteriaType: 'TOTAL_CHECKS', criteriaValue: 500, sortOrder: 8 },
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
