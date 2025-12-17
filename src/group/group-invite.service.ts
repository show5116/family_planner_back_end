import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';

@Injectable()
export class GroupInviteService {
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
   * 만료된 초대 코드는 재사용 가능
   */
  async generateUniqueInviteCode(): Promise<string> {
    let code = this.generateInviteCode();
    let exists = await this.prisma.group.findUnique({
      where: { inviteCode: code },
    });

    // 중복되면 다시 생성 (단, 만료된 코드는 중복으로 취급하지 않음)
    while (exists && exists.inviteCodeExpiresAt > new Date()) {
      code = this.generateInviteCode();
      exists = await this.prisma.group.findUnique({
        where: { inviteCode: code },
      });
    }

    return code;
  }

  /**
   * 기본 역할 조회 (is_default_role=true)
   * 1. 해당 groupId 내에서 defaultRole 조회
   * 2. 없으면 공통 역할(groupId=null) 중 defaultRole 조회
   */
  private async getDefaultRole(groupId?: string) {
    // 1. groupId가 제공된 경우, 해당 그룹의 defaultRole 조회
    if (groupId) {
      const groupDefaultRole = await this.prisma.role.findFirst({
        where: {
          groupId,
          isDefaultRole: true,
        },
      });

      if (groupDefaultRole) {
        return groupDefaultRole;
      }
    }

    // 2. 그룹별 defaultRole이 없거나 groupId가 없는 경우, 공통 defaultRole 조회
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
   * 초대 코드로 그룹 가입
   */
  async joinByInviteCode(userId: string, inviteCode: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
    });

    if (!group) {
      throw new NotFoundException('유효하지 않은 초대 코드입니다');
    }

    // 초대 코드 만료 확인
    if (group.inviteCodeExpiresAt <= new Date()) {
      throw new NotFoundException('만료된 초대 코드입니다');
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
    const defaultRole = await this.getDefaultRole(group.id);

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
                    profileImageKey: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 프로필 이미지 URL 추가
    return {
      ...member.group,
      members: member.group.members.map((m) => ({
        ...m,
        user: this.transformUserWithImageUrl(m.user),
      })),
    };
  }

  /**
   * 초대 코드 재생성 (INVITE_MEMBER 권한 필요)
   */
  async regenerateInviteCode(groupId: string) {
    const newInviteCode = await this.generateUniqueInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        inviteCode: newInviteCode,
        inviteCodeExpiresAt: expiresAt,
      },
    });

    return {
      inviteCode: group.inviteCode,
      inviteCodeExpiresAt: group.inviteCodeExpiresAt,
    };
  }
}
