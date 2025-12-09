import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateGroupDto } from '@/group/dto/create-group.dto';
import { UpdateGroupDto } from '@/group/dto/update-group.dto';

@Injectable()
export class GroupService {
  constructor(private prisma: PrismaService) {}

  /**
   * 초대 코드 생성 (8자리 랜덤 영문 대소문자 + 숫자)
   */
  private generateInviteCode(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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
   * OWNER 역할 조회 (공통 역할)
   */
  private async getOwnerRole() {
    const ownerRole = await this.prisma.role.findFirst({
      where: {
        name: 'OWNER',
        groupId: null, // 공통 역할
      },
    });

    if (!ownerRole) {
      throw new Error(
        'OWNER 역할을 찾을 수 없습니다. 데이터베이스 시드를 실행해주세요.',
      );
    }

    return ownerRole;
  }

  /**
   * 기본 역할 조회 (is_default_role=true)
   */
  private async getDefaultRole() {
    const defaultRole = await this.prisma.role.findFirst({
      where: {
        groupId: null, // 공통 역할
        isDefaultRole: true,
      },
    });

    if (!defaultRole) {
      throw new Error(
        '기본 역할을 찾을 수 없습니다. 데이터베이스 시드를 실행해주세요.',
      );
    }

    return defaultRole;
  }

  /**
   * 권한 체크 헬퍼 메서드
   * @param groupId - 그룹 ID
   * @param userId - 사용자 ID
   * @param requiredPermissions - 필요한 권한 배열 (예: ['INVITE', 'MANAGE_MEMBER'])
   */
  private async checkPermissions(
    groupId: string,
    userId: string,
    requiredPermissions: string[],
  ) {
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!member) {
      throw new ForbiddenException('이 그룹에 접근할 권한이 없습니다');
    }

    // 권한 체크
    const userPermissions = JSON.parse(
      member.role.permissions as string,
    ) as string[];
    const hasPermission = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException('이 작업을 수행할 권한이 없습니다');
    }

    return member;
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
      include: {
        role: true,
      },
    });

    if (!member) {
      throw new ForbiddenException('이 그룹에 접근할 권한이 없습니다');
    }

    return member;
  }

  /**
   * 그룹 생성
   */
  async create(userId: string, createGroupDto: CreateGroupDto) {
    const inviteCode = await this.generateUniqueInviteCode();
    const ownerRole = await this.getOwnerRole();

    const group = await this.prisma.group.create({
      data: {
        name: createGroupDto.name,
        description: createGroupDto.description,
        defaultColor: createGroupDto.defaultColor || '#6366F1', // 기본 색상
        inviteCode,
        members: {
          create: {
            userId,
            roleId: ownerRole.id, // OWNER 역할 부여
          },
        },
      },
      include: {
        members: {
          include: {
            role: true,
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
          where: {
            userId, // 내 멤버십 정보만 포함
          },
          include: {
            role: true,
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

    // 개인 커스텀 색상 또는 그룹 기본 색상 반환
    return groups.map((group) => ({
      ...group,
      myColor: group.members[0]?.customColor || group.defaultColor,
      myRole: group.members[0]?.role,
    }));
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
            role: true,
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
   * 그룹 정보 수정 (UPDATE 권한 필요)
   */
  async update(
    groupId: string,
    userId: string,
    updateGroupDto: UpdateGroupDto,
  ) {
    await this.checkPermissions(groupId, userId, ['UPDATE']);

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        name: updateGroupDto.name,
        description: updateGroupDto.description,
        defaultColor: updateGroupDto.defaultColor,
      },
      include: {
        members: {
          include: {
            role: true,
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
   * 그룹 삭제 (DELETE 권한 필요 - 보통 OWNER만)
   */
  async remove(groupId: string, userId: string) {
    await this.checkPermissions(groupId, userId, ['DELETE']);

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

    // 기본 역할 조회
    const defaultRole = await this.getDefaultRole();

    // 멤버 추가
    const member = await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        roleId: defaultRole.id, // 기본 역할 부여
      },
      include: {
        role: true,
        group: {
          include: {
            members: {
              include: {
                role: true,
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
      include: {
        role: true,
      },
    });

    if (!member) {
      throw new NotFoundException('그룹 멤버를 찾을 수 없습니다');
    }

    // OWNER는 나갈 수 없음
    if (member.role.name === 'OWNER') {
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
        role: true,
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
   * 멤버 역할 변경 (ASSIGN_ROLE 권한 필요 - 보통 OWNER만)
   */
  async updateMemberRole(
    groupId: string,
    targetUserId: string,
    userId: string,
    roleId: string,
  ) {
    await this.checkPermissions(groupId, userId, ['ASSIGN_ROLE']);

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
      include: {
        role: true,
      },
    });

    if (!member) {
      throw new NotFoundException('그룹 멤버를 찾을 수 없습니다');
    }

    // OWNER 역할은 양도만 가능 (변경 불가)
    if (member.role.name === 'OWNER') {
      throw new BadRequestException(
        'OWNER 역할은 변경할 수 없습니다. 그룹장 양도 기능을 사용해주세요',
      );
    }

    // 새 역할 확인
    const newRole = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!newRole) {
      throw new NotFoundException('역할을 찾을 수 없습니다');
    }

    // OWNER 역할로는 변경할 수 없음
    if (newRole.name === 'OWNER') {
      throw new BadRequestException(
        'OWNER 역할은 할당할 수 없습니다. 그룹장 양도 기능을 사용해주세요',
      );
    }

    const updatedMember = await this.prisma.groupMember.update({
      where: { id: member.id },
      data: { roleId },
      include: {
        role: true,
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
   * 멤버 삭제 (REMOVE_MEMBER 권한 필요)
   */
  async removeMember(groupId: string, targetUserId: string, userId: string) {
    await this.checkPermissions(groupId, userId, ['REMOVE_MEMBER']);

    // 자기 자신은 삭제할 수 없음 (나가기 사용)
    if (userId === targetUserId) {
      throw new BadRequestException(
        '자신은 삭제할 수 없습니다. 그룹 나가기를 사용해주세요',
      );
    }

    const targetMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!targetMember) {
      throw new NotFoundException('그룹 멤버를 찾을 수 없습니다');
    }

    // OWNER는 삭제할 수 없음
    if (targetMember.role.name === 'OWNER') {
      throw new BadRequestException('OWNER는 삭제할 수 없습니다');
    }

    await this.prisma.groupMember.delete({
      where: { id: targetMember.id },
    });

    return { message: '멤버가 삭제되었습니다' };
  }

  /**
   * 초대 코드 재생성 (REGENERATE_INVITE_CODE 권한 필요)
   */
  async regenerateInviteCode(groupId: string, userId: string) {
    await this.checkPermissions(groupId, userId, ['REGENERATE_INVITE_CODE']);

    const newInviteCode = await this.generateUniqueInviteCode();

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: { inviteCode: newInviteCode },
    });

    return { inviteCode: group.inviteCode };
  }

  /**
   * 개인 그룹 색상 설정
   */
  async updateMyColor(groupId: string, userId: string, customColor: string) {
    const member = await this.checkMembership(groupId, userId);

    const updatedMember = await this.prisma.groupMember.update({
      where: { id: member.id },
      data: { customColor },
    });

    return {
      message: '그룹 색상이 설정되었습니다',
      customColor: updatedMember.customColor,
    };
  }

  /**
   * OWNER 권한 양도
   * @param groupId - 그룹 ID
   * @param currentOwnerId - 현재 OWNER의 사용자 ID
   * @param newOwnerId - 새로운 OWNER가 될 사용자 ID
   */
  async transferOwnership(
    groupId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ) {
    // 1. 현재 사용자가 OWNER인지 확인
    const currentOwnerMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: currentOwnerId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!currentOwnerMember) {
      throw new ForbiddenException('이 그룹에 접근할 권한이 없습니다');
    }

    if (currentOwnerMember.role.name !== 'OWNER') {
      throw new ForbiddenException(
        'OWNER 권한 양도는 현재 OWNER만 수행할 수 있습니다',
      );
    }

    // 2. 자기 자신에게는 양도할 수 없음
    if (currentOwnerId === newOwnerId) {
      throw new BadRequestException('자기 자신에게는 권한을 양도할 수 없습니다');
    }

    // 3. 새로운 OWNER가 될 사용자가 그룹 멤버인지 확인
    const newOwnerMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: newOwnerId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!newOwnerMember) {
      throw new NotFoundException(
        '새로운 OWNER가 될 사용자를 그룹에서 찾을 수 없습니다',
      );
    }

    // 4. OWNER 역할과 기본 역할 조회
    const ownerRole = await this.getOwnerRole();
    const defaultRole = await this.getDefaultRole();

    // 5. 트랜잭션으로 역할 변경
    await this.prisma.$transaction([
      // 현재 OWNER를 기본 역할(MEMBER)로 변경
      this.prisma.groupMember.update({
        where: { id: currentOwnerMember.id },
        data: { roleId: defaultRole.id },
      }),
      // 새로운 사용자를 OWNER로 변경
      this.prisma.groupMember.update({
        where: { id: newOwnerMember.id },
        data: { roleId: ownerRole.id },
      }),
    ]);

    // 6. 업데이트된 멤버 정보 반환
    const updatedMembers = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { in: [currentOwnerId, newOwnerId] },
      },
      include: {
        role: true,
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

    return {
      message: 'OWNER 권한이 성공적으로 양도되었습니다',
      previousOwner: updatedMembers.find((m) => m.userId === currentOwnerId),
      newOwner: updatedMembers.find((m) => m.userId === newOwnerId),
    };
  }
}
