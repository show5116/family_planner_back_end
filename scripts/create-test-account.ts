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
    role: 'OWNER',
  },
  {
    email: 'test-member@familyplanner.test',
    password: 'Test1234!',
    name: '테스트 멤버',
    role: 'DEFAULT',
  },
];

const GROUP_NAME = '테스트 가족';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
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
        role: account.role,
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
      role: account.role,
    });
  }

  const ownerUser = users.find((u) => u.role === 'OWNER');
  const memberUser = users.find((u) => u.role === 'DEFAULT');
  if (!ownerUser || !memberUser) {
    console.error('유저 정보를 찾을 수 없습니다.');
    process.exit(1);
  }

  const existingMembership = await prisma.groupMember.findFirst({
    where: { userId: ownerUser.id },
    include: { group: true },
  });

  let groupId: string;

  if (existingMembership) {
    console.log(`이미 그룹 존재: ${existingMembership.group.name} (건너뜀)`);
    groupId = existingMembership.groupId;
  } else {
    const inviteCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    const inviteCodeExpiresAt = new Date();
    inviteCodeExpiresAt.setFullYear(inviteCodeExpiresAt.getFullYear() + 10);

    const group = await prisma.group.create({
      data: { name: GROUP_NAME, inviteCode, inviteCodeExpiresAt },
    });
    groupId = group.id;
    console.log(`그룹 생성: ${GROUP_NAME}`);

    await prisma.groupMember.create({
      data: { groupId, userId: ownerUser.id, roleId: ownerRole.id },
    });
    console.log(`그룹장 등록: ${ownerUser.name}`);
  }

  const memberAlreadyJoined = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: memberUser.id } },
  });

  if (!memberAlreadyJoined) {
    await prisma.groupMember.create({
      data: { groupId, userId: memberUser.id, roleId: defaultRole.id },
    });
    console.log(`멤버 등록: ${memberUser.name}`);
  } else {
    console.log(`이미 멤버로 등록됨: ${memberUser.name} (건너뜀)`);
  }

  console.log('\n========== 테스트 계정 정보 ==========');
  console.log(`[그룹장]`);
  console.log(`  이메일  : ${ownerUser.email}`);
  console.log(`  비밀번호: Test1234!`);
  console.log(`  이름    : ${ownerUser.name}`);
  console.log('');
  console.log(`[멤버]`);
  console.log(`  이메일  : ${memberUser.email}`);
  console.log(`  비밀번호: Test1234!`);
  console.log(`  이름    : ${memberUser.name}`);
  console.log(`\n소속 그룹: ${GROUP_NAME}`);
  console.log('=======================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
