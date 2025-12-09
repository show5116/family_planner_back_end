import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class GroupInviteService {
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
  async generateUniqueInviteCode(): Promise<string> {
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
   * 초대 코드 재생성 (INVITE_MEMBER 권한 필요)
   */
  async regenerateInviteCode(groupId: string) {
    const newInviteCode = await this.generateUniqueInviteCode();

    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: { inviteCode: newInviteCode },
    });

    return { inviteCode: group.inviteCode };
  }
}
