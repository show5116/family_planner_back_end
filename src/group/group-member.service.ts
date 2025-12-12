import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';

@Injectable()
export class GroupMemberService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  /**
   * 프로필 이미지 URL 변환 (Helper)
   */
  private transformUserWithImageUrl<
    T extends { profileImageKey?: string | null },
  >(user: T): Omit<T, 'profileImageKey'> & { profileImageUrl: string | null } {
    const { profileImageKey, ...rest } = user;
    return {
      ...rest,
      profileImageUrl: profileImageKey
        ? this.storageService.getPublicUrl(profileImageKey)
        : null,
    } as Omit<T, 'profileImageKey'> & { profileImageUrl: string | null };
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
   * 그룹 멤버 목록 조회
   * (멤버십 확인은 GroupMembershipGuard에서 수행)
   */
  async getMembers(groupId: string) {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImageKey: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    // 프로필 이미지 URL 추가
    return members.map((member) => ({
      ...member,
      user: this.transformUserWithImageUrl(member.user),
    }));
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
   * 멤버 역할 변경 (MANAGE_MEMBER 권한 필요)
   */
  async updateMemberRole(
    groupId: string,
    targetUserId: string,
    userId: string,
    roleId: string,
  ) {
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
            profileImageKey: true,
          },
        },
      },
    });

    // 프로필 이미지 URL 변환 (profileImageKey 제거)
    return {
      ...updatedMember,
      user: this.transformUserWithImageUrl(updatedMember.user),
    };
  }

  /**
   * 멤버 삭제 (MANAGE_MEMBER 권한 필요)
   */
  async removeMember(groupId: string, targetUserId: string, userId: string) {
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
   * 개인 그룹 색상 설정
   * (멤버십 확인은 GroupMembershipGuard에서 수행)
   */
  async updateMyColor(groupId: string, userId: string, customColor: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

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
      throw new BadRequestException('이 그룹에 접근할 권한이 없습니다');
    }

    if (currentOwnerMember.role.name !== 'OWNER') {
      throw new BadRequestException(
        'OWNER 권한 양도는 현재 OWNER만 수행할 수 있습니다',
      );
    }

    // 2. 자기 자신에게는 양도할 수 없음
    if (currentOwnerId === newOwnerId) {
      throw new BadRequestException(
        '자기 자신에게는 권한을 양도할 수 없습니다',
      );
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
            profileImageKey: true,
          },
        },
      },
    });

    // 프로필 이미지 URL 추가
    const membersWithUrls = updatedMembers.map((member) => ({
      ...member,
      user: this.transformUserWithImageUrl(member.user),
    }));

    return {
      message: 'OWNER 권한이 성공적으로 양도되었습니다',
      previousOwner: membersWithUrls.find((m) => m.userId === currentOwnerId),
      newOwner: membersWithUrls.find((m) => m.userId === newOwnerId),
    };
  }
}
