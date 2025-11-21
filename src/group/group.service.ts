import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupMemberRole } from './dto/update-member-role.dto';
import type { GroupMemberRole as PrismaGroupMemberRole } from '@prisma/client';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  /**
   * 초대 코드 생성 (8자리 랜덤 영숫자)
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 고유한 초대 코드 생성 (중복 체크)
   */
  private async generateUniqueInviteCode(): Promise<string> {
    let code = this.generateInviteCode();
    let exists = await this.prisma.group.findUnique({
      where: { inviteCode: code },
    });

    // 중복되면 다시 생성
    while (exists) {
      code = this.generateInviteCode();
      exists = await this.prisma.group.findUnique({
        where: { inviteCode: code },
      });
    }

    return code;
  }

  /**
   * 그룹 생성
   */
  async create(userId: string, createGroupDto: CreateGroupDto) {
    const inviteCode = await this.generateUniqueInviteCode();

    const group = await this.prisma.group.create({
      data: {
        name: createGroupDto.name,
        description: createGroupDto.description,
        inviteCode,
        members: {
          create: {
            userId,
            role: 'OWNER', // 생성자는 자동으로 OWNER
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    return group;
  }

  /**
   * 내가 속한 그룹 목록 조회
   */
  async findMyGroups(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                profileImage: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return groups;
  }

  /**
   * 그룹 상세 조회
   */
  async findOne(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                profileImage: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('그룹을 찾을 수 없습니다');
    }

    // 멤버인지 확인
    const isMember = group.members.some((member) => member.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('이 그룹에 접근할 권한이 없습니다');
    }

    return group;
  }

  /**
   * 그룹 정보 수정 (OWNER, ADMIN만 가능)
   */
  async update(groupId: string, userId: string, updateGroupDto: UpdateGroupDto) {
    await this.checkPermission(groupId, userId, ['OWNER', 'ADMIN']);

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: updateGroupDto,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    return group;
  }

  /**
   * 그룹 삭제 (OWNER만 가능)
   */
  async remove(groupId: string, userId: string) {
    await this.checkPermission(groupId, userId, ['OWNER']);

    await this.prisma.group.delete({
      where: { id: groupId },
    });

    return { message: '그룹이 삭제되었습니다' };
  }

  /**
   * 초대 코드로 그룹 가입
   */
  async joinByInviteCode(userId: string, inviteCode: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
    });

    if (!group) {
      throw new NotFoundException('유효하지 않은 초대 코드입니다');
    }

    // 이미 멤버인지 확인
    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('이미 이 그룹의 멤버입니다');
    }

    // 멤버 추가
    const member = await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: 'MEMBER',
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    profileImage: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return member.group;
  }

  /**
   * 그룹 나가기
   */
  async leave(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('그룹 멤버를 찾을 수 없습니다');
    }

    // OWNER는 나갈 수 없음 (다른 멤버에게 위임 필요)
    if (member.role === 'OWNER') {
      throw new BadRequestException(
        'OWNER는 그룹을 나갈 수 없습니다. 다른 멤버에게 OWNER 권한을 위임하거나 그룹을 삭제해주세요',
      );
    }

    await this.prisma.groupMember.delete({
      where: { id: member.id },
    });

    return { message: '그룹에서 나갔습니다' };
  }

  /**
   * 그룹 멤버 목록 조회
   */
  async getMembers(groupId: string, userId: string) {
    // 멤버인지 확인
    await this.checkMembership(groupId, userId);

    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImage: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return members;
  }

  /**
   * 멤버 역할 변경 (OWNER만 가능)
   */
  async updateMemberRole(
    groupId: string,
    targetUserId: string,
    userId: string,
    role: GroupMemberRole,
  ) {
    await this.checkPermission(groupId, userId, ['OWNER']);

    // 자기 자신의 역할은 변경할 수 없음
    if (userId === targetUserId) {
      throw new BadRequestException('자신의 역할은 변경할 수 없습니다');
    }

    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('그룹 멤버를 찾을 수 없습니다');
    }

    const updatedMember = await this.prisma.groupMember.update({
      where: { id: member.id },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    return updatedMember;
  }

  /**
   * 멤버 삭제 (OWNER, ADMIN만 가능)
   */
  async removeMember(groupId: string, targetUserId: string, userId: string) {
    await this.checkPermission(groupId, userId, ['OWNER', 'ADMIN']);

    // 자기 자신은 삭제할 수 없음 (나가기 사용)
    if (userId === targetUserId) {
      throw new BadRequestException('자신은 삭제할 수 없습니다. 그룹 나가기를 사용해주세요');
    }

    const targetMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMember) {
      throw new NotFoundException('그룹 멤버를 찾을 수 없습니다');
    }

    // OWNER는 삭제할 수 없음
    if (targetMember.role === 'OWNER') {
      throw new BadRequestException('OWNER는 삭제할 수 없습니다');
    }

    await this.prisma.groupMember.delete({
      where: { id: targetMember.id },
    });

    return { message: '멤버가 삭제되었습니다' };
  }

  /**
   * 초대 코드 재생성 (OWNER, ADMIN만 가능)
   */
  async regenerateInviteCode(groupId: string, userId: string) {
    await this.checkPermission(groupId, userId, ['OWNER', 'ADMIN']);

    const newInviteCode = await this.generateUniqueInviteCode();

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: { inviteCode: newInviteCode },
    });

    return { inviteCode: group.inviteCode };
  }

  /**
   * 권한 체크 헬퍼 메서드
   */
  private async checkPermission(
    groupId: string,
    userId: string,
    allowedRoles: PrismaGroupMemberRole[],
  ) {
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('그룹 멤버를 찾을 수 없습니다');
    }

    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException('이 작업을 수행할 권한이 없습니다');
    }
  }

  /**
   * 멤버십 체크 헬퍼 메서드
   */
  private async checkMembership(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('이 그룹에 접근할 권한이 없습니다');
    }
  }
}
