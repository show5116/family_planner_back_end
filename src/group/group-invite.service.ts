import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { EmailService } from '@/email/email.service';

@Injectable()
export class GroupInviteService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private emailService: EmailService,
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
   * 만료 여부와 관계없이 모든 코드를 유니크하게 생성
   */
  async generateUniqueInviteCode(): Promise<string> {
    let code = this.generateInviteCode();
    let exists = await this.prisma.group.findUnique({
      where: { inviteCode: code },
    });

    // 중복되면 다시 생성 (만료된 코드도 중복으로 취급)
    while (exists) {
      code = this.generateInviteCode();
      exists = await this.prisma.group.findUnique({
        where: { inviteCode: code },
      });
    }

    return code;
  }

  /**
   * 초대 코드 유효성 확인 및 재생성
   * 만료된 경우 자동으로 재생성하여 반환
   */
  private async ensureValidInviteCode(
    groupId: string,
  ): Promise<{ inviteCode: string; inviteCodeExpiresAt: Date }> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { inviteCode: true, inviteCodeExpiresAt: true },
    });

    if (!group) {
      throw new NotFoundException('그룹을 찾을 수 없습니다');
    }

    // 초대 코드가 만료되었으면 재생성
    if (group.inviteCodeExpiresAt <= new Date()) {
      return await this.regenerateInviteCode(groupId);
    }

    return {
      inviteCode: group.inviteCode,
      inviteCodeExpiresAt: group.inviteCodeExpiresAt,
    };
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
   * 초대 코드로 그룹 가입 요청
   */
  async joinByInviteCode(userId: string, inviteCode: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
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

    // 사용자 정보 조회 (이메일 필요)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.email) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    // 이메일 초대 여부 확인 (INVITE 타입의 PENDING 요청이 있는지)
    const inviteRequest = await this.prisma.groupJoinRequest.findFirst({
      where: {
        groupId: group.id,
        email: user.email,
        type: 'INVITE', // 이메일로 초대받은 경우
        status: 'PENDING',
      },
    });

    // 이메일로 초대받은 경우 즉시 승인 및 멤버 추가
    if (inviteRequest) {
      const defaultRole = await this.getDefaultRole(group.id);

      // 트랜잭션: 요청 승인 + 멤버 추가
      const [, member] = await this.prisma.$transaction([
        this.prisma.groupJoinRequest.update({
          where: { id: inviteRequest.id },
          data: { status: 'ACCEPTED' },
        }),
        this.prisma.groupMember.create({
          data: {
            groupId: group.id,
            userId,
            roleId: defaultRole.id,
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
        }),
      ]);

      // 프로필 이미지 URL 추가
      return {
        message: '그룹 가입이 완료되었습니다',
        member: {
          ...member,
          user: this.transformUserWithImageUrl(member.user),
        },
        group: {
          ...group,
          members: group.members.map((m) => ({
            ...m,
            user: this.transformUserWithImageUrl(m.user),
          })),
        },
      };
    }

    // 일반 가입 요청인 경우 (이메일 초대 없이 초대 코드만으로 가입)
    // 이미 가입 요청이 있는지 확인
    const existingRequest = await this.prisma.groupJoinRequest.findFirst({
      where: {
        groupId: group.id,
        email: user.email,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new ConflictException('이미 가입 요청이 대기 중입니다');
    }

    // GroupJoinRequest 생성 (REQUEST 타입, PENDING 상태)
    const joinRequest = await this.prisma.groupJoinRequest.create({
      data: {
        groupId: group.id,
        email: user.email,
        type: 'REQUEST', // 사용자가 초대 코드로 요청
        status: 'PENDING', // 승인 대기
      },
    });

    return {
      message: '그룹 가입 요청이 전송되었습니다. 관리자 승인을 기다려주세요.',
      joinRequestId: joinRequest.id,
      groupName: group.name,
      status: joinRequest.status,
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

  /**
   * 그룹 가입 요청 목록 조회 (INVITE_MEMBER 권한 필요)
   */
  async getJoinRequests(groupId: string, status?: string) {
    const where: any = { groupId };

    if (status) {
      where.status = status;
    }

    const joinRequests = await this.prisma.groupJoinRequest.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return joinRequests;
  }

  /**
   * 가입 요청 승인 (INVITE_MEMBER 권한 필요)
   */
  async acceptJoinRequest(groupId: string, requestId: string) {
    const joinRequest = await this.prisma.groupJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!joinRequest) {
      throw new NotFoundException('가입 요청을 찾을 수 없습니다');
    }

    if (joinRequest.groupId !== groupId) {
      throw new NotFoundException('해당 그룹의 가입 요청이 아닙니다');
    }

    if (joinRequest.status !== 'PENDING') {
      throw new ConflictException('이미 처리된 요청입니다');
    }

    if (joinRequest.type === 'INVITE') {
      throw new BadRequestException(
        'INVITE 타입은 사용자가 초대 코드로 가입 시 자동 승인됩니다',
      );
    }

    // 초대받은 사용자 조회
    const user = await this.prisma.user.findUnique({
      where: { email: joinRequest.email },
    });

    if (!user) {
      throw new NotFoundException('해당 이메일로 가입된 사용자가 없습니다');
    }

    // 이미 멤버인지 확인
    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('이미 그룹 멤버입니다');
    }

    // 기본 역할 조회
    const defaultRole = await this.getDefaultRole(groupId);

    // 트랜잭션: 요청 승인 + 멤버 추가
    const [updatedRequest, member] = await this.prisma.$transaction([
      this.prisma.groupJoinRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.groupMember.create({
        data: {
          groupId,
          userId: user.id,
          roleId: defaultRole.id,
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
      }),
    ]);

    return {
      message: '가입 요청이 승인되었습니다',
      member: {
        ...member,
        user: this.transformUserWithImageUrl(member.user),
      },
    };
  }

  /**
   * 가입 요청 거부 (INVITE_MEMBER 권한 필요)
   */
  async rejectJoinRequest(groupId: string, requestId: string) {
    const joinRequest = await this.prisma.groupJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!joinRequest) {
      throw new NotFoundException('가입 요청을 찾을 수 없습니다');
    }

    if (joinRequest.groupId !== groupId) {
      throw new NotFoundException('해당 그룹의 가입 요청이 아닙니다');
    }

    if (joinRequest.status !== 'PENDING') {
      throw new ConflictException('이미 처리된 요청입니다');
    }

    await this.prisma.groupJoinRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    return {
      message: '가입 요청이 거부되었습니다',
    };
  }

  /**
   * 이메일로 그룹 초대 (INVITE_MEMBER 권한 필요)
   */
  async inviteByEmail(groupId: string, inviterUserId: string, email: string) {
    // 그룹 조회
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });

    if (!group) {
      throw new NotFoundException('그룹을 찾을 수 없습니다');
    }

    // 초대하는 사용자 정보 조회
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterUserId },
    });

    if (!inviter) {
      throw new NotFoundException('초대자를 찾을 수 없습니다');
    }

    // 초대받을 사용자 조회
    const invitee = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!invitee) {
      throw new BadRequestException('해당 이메일로 가입된 사용자가 없습니다');
    }

    // 이미 그룹 멤버인지 확인
    const existingMember = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: invitee.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('이미 이 그룹의 멤버입니다');
    }

    // 초대 코드 유효성 확인 및 재생성 (만료된 경우)
    const { inviteCode, inviteCodeExpiresAt } =
      await this.ensureValidInviteCode(groupId);

    // GroupJoinRequest 생성 (INVITE 타입)
    const joinRequest = await this.prisma.groupJoinRequest.create({
      data: {
        groupId: group.id,
        email,
        type: 'INVITE', // 관리자가 초대
        status: 'PENDING',
      },
    });

    // 초대 이메일 발송
    await this.emailService.sendGroupInviteEmail(
      email,
      group.name,
      inviter.name,
      inviteCode,
    );

    return {
      message: '초대 이메일이 발송되었습니다',
      email,
      groupName: group.name,
      inviteCode,
      inviteCodeExpiresAt,
      joinRequestId: joinRequest.id,
    };
  }

  /**
   * 초대 취소 (INVITE_MEMBER 권한 필요)
   * INVITE 타입의 PENDING 상태 요청만 취소 가능
   */
  async cancelInvite(groupId: string, requestId: string) {
    const joinRequest = await this.prisma.groupJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!joinRequest) {
      throw new NotFoundException('초대 요청을 찾을 수 없습니다');
    }

    if (joinRequest.groupId !== groupId) {
      throw new NotFoundException('해당 그룹의 초대 요청이 아닙니다');
    }

    if (joinRequest.type !== 'INVITE') {
      throw new BadRequestException('INVITE 타입의 요청만 취소할 수 있습니다');
    }

    if (joinRequest.status !== 'PENDING') {
      throw new ConflictException('대기 중인 초대만 취소할 수 있습니다');
    }

    // 초대 요청 삭제
    await this.prisma.groupJoinRequest.delete({
      where: { id: requestId },
    });

    return {
      message: '초대가 취소되었습니다',
    };
  }

  /**
   * 초대 재전송 (INVITE_MEMBER 권한 필요)
   * INVITE 타입의 PENDING 상태 요청에 대해 이메일 재전송
   */
  async resendInvite(
    groupId: string,
    requestId: string,
    inviterUserId: string,
  ) {
    const joinRequest = await this.prisma.groupJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!joinRequest) {
      throw new NotFoundException('초대 요청을 찾을 수 없습니다');
    }

    if (joinRequest.groupId !== groupId) {
      throw new NotFoundException('해당 그룹의 초대 요청이 아닙니다');
    }

    if (joinRequest.type !== 'INVITE') {
      throw new BadRequestException(
        'INVITE 타입의 요청만 재전송할 수 있습니다',
      );
    }

    if (joinRequest.status !== 'PENDING') {
      throw new ConflictException('대기 중인 초대만 재전송할 수 있습니다');
    }

    // 그룹 조회
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });

    if (!group) {
      throw new NotFoundException('그룹을 찾을 수 없습니다');
    }

    // 초대하는 사용자 정보 조회
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterUserId },
    });

    if (!inviter) {
      throw new NotFoundException('초대자를 찾을 수 없습니다');
    }

    // 초대 코드 유효성 확인 및 재생성 (만료된 경우)
    const { inviteCode, inviteCodeExpiresAt } =
      await this.ensureValidInviteCode(groupId);

    // 초대 이메일 재발송
    await this.emailService.sendGroupInviteEmail(
      joinRequest.email,
      group.name,
      inviter.name,
      inviteCode,
    );

    return {
      message: '초대 이메일이 재전송되었습니다',
      email: joinRequest.email,
      groupName: group.name,
      inviteCode,
      inviteCodeExpiresAt,
      joinRequestId: joinRequest.id,
    };
  }
}
