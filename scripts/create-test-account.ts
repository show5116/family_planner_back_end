/**
 * 플레이 스토어 심사용 테스트 계정 생성 스크립트
 * 실행: npx ts-node -r tsconfig-paths/register scripts/create-test-account.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ACCOUNTS = [
  {
    email: 'test-owner@familyplanner.test',
    password: 'Test1234!',
    name: '테스트 그룹장',
    // 그룹별 역할: GROUP1에서는 OWNER, GROUP2에서는 DEFAULT 멤버
    memberships: [
      { group: 'GROUP1', role: 'OWNER' },
      { group: 'GROUP2', role: 'DEFAULT' },
    ],
  },
  {
    email: 'test-member@familyplanner.test',
    password: 'Test1234!',
    name: '테스트 멤버',
    memberships: [
      { group: 'GROUP1', role: 'DEFAULT' },
      { group: 'GROUP2', role: 'DEFAULT' },
    ],
  },
  {
    email: 'test-owner2@familyplanner.test',
    password: 'Test1234!',
    name: '테스트 그룹장2',
    memberships: [{ group: 'GROUP2', role: 'OWNER' }],
  },
];

const GROUPS: Record<string, string> = {
  GROUP1: '테스트 가족',
  GROUP2: '테스트 가족 2',
};

interface UserInfo {
  id: string;
  email: string;
  name: string;
  memberships: { group: string; role: string }[];
}

async function main() {
  console.log('테스트 계정 생성 시작...\n');

  const ownerRole = await prisma.role.findFirst({
    where: { name: 'OWNER', groupId: null },
  });
  if (!ownerRole) {
    console.error(
      'OWNER 역할을 찾을 수 없습니다. 데이터베이스 시드를 먼저 실행하세요.',
    );
    process.exit(1);
  }

  const defaultRole = await prisma.role.findFirst({
    where: { groupId: null, isDefaultRole: true, name: { not: 'OWNER' } },
  });
  if (!defaultRole) {
    console.error(
      '기본 멤버 역할을 찾을 수 없습니다. 데이터베이스 시드를 먼저 실행하세요.',
    );
    process.exit(1);
  }
  const roleByName: Record<string, { id: string }> = {
    OWNER: ownerRole,
    DEFAULT: defaultRole,
  };

  const users: UserInfo[] = [];

  for (const account of ACCOUNTS) {
    const existing = await prisma.user.findUnique({
      where: { email: account.email },
    });

    if (existing) {
      console.log(`이미 존재: ${account.email} (건너뜀)`);
      users.push({
        id: existing.id,
        email: account.email,
        name: account.name,
        memberships: account.memberships,
      });
      continue;
    }

    const hashedPassword = await bcrypt.hash(account.password, 10);
    const user = await prisma.user.create({
      data: {
        email: account.email,
        password: hashedPassword,
        name: account.name,
        provider: 'LOCAL',
        isEmailVerified: true,
      },
    });
    console.log(`유저 생성: ${account.name} (${account.email})`);
    users.push({
      id: user.id,
      email: account.email,
      name: account.name,
      memberships: account.memberships,
    });
  }

  const groupIdByKey: Record<string, string> = {};

  for (const [groupKey, groupName] of Object.entries(GROUPS)) {
    const existingGroup = await prisma.group.findFirst({
      where: { name: groupName },
    });

    if (existingGroup) {
      console.log(`이미 그룹 존재: ${existingGroup.name} (건너뜀)`);
      groupIdByKey[groupKey] = existingGroup.id;
      continue;
    }

    const inviteCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    const inviteCodeExpiresAt = new Date();
    inviteCodeExpiresAt.setFullYear(inviteCodeExpiresAt.getFullYear() + 10);

    const group = await prisma.group.create({
      data: { name: groupName, inviteCode, inviteCodeExpiresAt },
    });
    groupIdByKey[groupKey] = group.id;
    console.log(`그룹 생성: ${groupName}`);
  }

  for (const user of users) {
    for (const membership of user.memberships) {
      const groupId = groupIdByKey[membership.group];
      const role = roleByName[membership.role];

      const alreadyJoined = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: user.id } },
      });

      if (!alreadyJoined) {
        await prisma.groupMember.create({
          data: { groupId, userId: user.id, roleId: role.id },
        });
        console.log(
          `${membership.role === 'OWNER' ? '그룹장' : '멤버'} 등록: ${user.name} → ${GROUPS[membership.group]}`,
        );
      } else {
        console.log(
          `이미 멤버로 등록됨: ${user.name} → ${GROUPS[membership.group]} (건너뜀)`,
        );
      }
    }
  }

  console.log('\n========== 테스트 계정 정보 ==========');
  for (const [groupKey, groupName] of Object.entries(GROUPS)) {
    console.log(`\n소속 그룹: ${groupName}`);
    for (const u of users) {
      const membership = u.memberships.find((m) => m.group === groupKey);
      if (!membership) continue;
      console.log(`[${membership.role === 'OWNER' ? '그룹장' : '멤버'}]`);
      console.log(`  이메일  : ${u.email}`);
      console.log(`  비밀번호: Test1234!`);
      console.log(`  이름    : ${u.name}`);
    }
  }
  console.log('\n=======================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
