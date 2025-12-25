import { Test, TestingModule } from '@nestjs/testing';
import { GroupInviteService } from './group-invite.service';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { EmailService } from '@/email/email.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('GroupInviteService', () => {
  let service: GroupInviteService;
  let prismaService: PrismaService;
  let storageService: StorageService;
  let emailService: EmailService;

  const mockPrismaService = {
    group: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    groupMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    groupJoinRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockStorageService = {
    getPublicUrl: jest.fn(),
  };

  const mockEmailService = {
    sendGroupInviteEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupInviteService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<GroupInviteService>(GroupInviteService);
    prismaService = module.get<PrismaService>(PrismaService);
    storageService = module.get<StorageService>(StorageService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateUniqueInviteCode', () => {
    it('고유한 8자리 초대 코드를 생성해야 함', async () => {
      mockPrismaService.group.findUnique.mockResolvedValue(null);

      const inviteCode = await service.generateUniqueInviteCode();

      expect(inviteCode).toHaveLength(8);
      expect(inviteCode).toMatch(/^[A-Za-z0-9]{8}$/);
      expect(prismaService.group.findUnique).toHaveBeenCalledWith({
        where: { inviteCode: expect.any(String) },
      });
    });

    it('중복된 코드가 있으면 재생성해야 함', async () => {
      mockPrismaService.group.findUnique
        .mockResolvedValueOnce({ id: 'group-1' }) // 첫 번째 시도: 중복
        .mockResolvedValueOnce({ id: 'group-2' }) // 두 번째 시도: 중복
        .mockResolvedValueOnce(null); // 세 번째 시도: 성공

      const inviteCode = await service.generateUniqueInviteCode();

      expect(inviteCode).toHaveLength(8);
      expect(prismaService.group.findUnique).toHaveBeenCalledTimes(3);
    });
  });

  describe('joinByInviteCode', () => {
    it('이메일로 초대받은 경우 즉시 승인되고 멤버로 추가되어야 함', async () => {
      const userId = 'user-1';
      const inviteCode = 'ABC12345';
      const group = {
        id: 'group-1',
        name: 'Family',
        inviteCode,
        inviteCodeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        members: [],
      };
      const user = {
        id: userId,
        email: 'user@test.com',
        name: 'Test User',
        profileImageKey: null,
      };
      const inviteRequest = {
        id: 'request-1',
        groupId: group.id,
        email: user.email,
        type: 'INVITE',
        status: 'PENDING',
      };
      const defaultRole = {
        id: 'role-1',
        name: 'MEMBER',
        isDefaultRole: true,
      };
      const member = {
        id: 'member-1',
        groupId: group.id,
        userId,
        roleId: defaultRole.id,
        customColor: null,
        joinedAt: new Date(),
        role: defaultRole,
        user,
      };

      mockPrismaService.group.findUnique.mockResolvedValue(group);
      mockPrismaService.groupMember.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.groupJoinRequest.findFirst.mockResolvedValue(
        inviteRequest,
      );
      mockPrismaService.role.findFirst.mockResolvedValue(defaultRole);
      mockPrismaService.$transaction.mockResolvedValue([
        { ...inviteRequest, status: 'ACCEPTED' },
        member,
      ]);
      mockStorageService.getPublicUrl.mockReturnValue(null);

      const result = await service.joinByInviteCode(userId, inviteCode);

      expect(result.message).toBe('그룹 가입이 완료되었습니다');
      expect(result.member).toBeDefined();
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('일반 가입 요청인 경우 PENDING 상태의 GroupJoinRequest를 생성해야 함', async () => {
      const userId = 'user-1';
      const inviteCode = 'ABC12345';
      const group = {
        id: 'group-1',
        name: 'Family',
        inviteCode,
        inviteCodeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        members: [],
      };
      const user = {
        id: userId,
        email: 'user@test.com',
        name: 'Test User',
      };
      const joinRequest = {
        id: 'request-1',
        groupId: group.id,
        email: user.email,
        type: 'REQUEST',
        status: 'PENDING',
      };

      mockPrismaService.group.findUnique.mockResolvedValue(group);
      mockPrismaService.groupMember.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.groupJoinRequest.findFirst
        .mockResolvedValueOnce(null) // INVITE 요청 없음
        .mockResolvedValueOnce(null); // 기존 REQUEST 요청 없음
      mockPrismaService.groupJoinRequest.create.mockResolvedValue(joinRequest);

      const result = await service.joinByInviteCode(userId, inviteCode);

      expect(result.message).toBe(
        '그룹 가입 요청이 전송되었습니다. 관리자 승인을 기다려주세요.',
      );
      expect(result.joinRequestId).toBe('request-1');
      expect(prismaService.groupJoinRequest.create).toHaveBeenCalledWith({
        data: {
          groupId: group.id,
          email: user.email,
          type: 'REQUEST',
          status: 'PENDING',
        },
      });
    });

    it('유효하지 않은 초대 코드는 NotFoundException을 발생시켜야 함', async () => {
      const userId = 'user-1';
      const inviteCode = 'INVALID';

      mockPrismaService.group.findUnique.mockResolvedValue(null);

      await expect(
        service.joinByInviteCode(userId, inviteCode),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.joinByInviteCode(userId, inviteCode),
      ).rejects.toThrow('유효하지 않은 초대 코드입니다');
    });

    it('만료된 초대 코드는 NotFoundException을 발생시켜야 함', async () => {
      const userId = 'user-1';
      const inviteCode = 'ABC12345';
      const group = {
        id: 'group-1',
        name: 'Family',
        inviteCode,
        inviteCodeExpiresAt: new Date(Date.now() - 1000), // 만료됨
        members: [],
      };

      mockPrismaService.group.findUnique.mockResolvedValue(group);

      await expect(
        service.joinByInviteCode(userId, inviteCode),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.joinByInviteCode(userId, inviteCode),
      ).rejects.toThrow('만료된 초대 코드입니다');
    });

    it('이미 멤버인 경우 ConflictException을 발생시켜야 함', async () => {
      const userId = 'user-1';
      const inviteCode = 'ABC12345';
      const group = {
        id: 'group-1',
        name: 'Family',
        inviteCode,
        inviteCodeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        members: [],
      };
      const existingMember = {
        id: 'member-1',
        groupId: group.id,
        userId,
      };

      mockPrismaService.group.findUnique.mockResolvedValue(group);
      mockPrismaService.groupMember.findUnique.mockResolvedValue(
        existingMember,
      );

      await expect(
        service.joinByInviteCode(userId, inviteCode),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.joinByInviteCode(userId, inviteCode),
      ).rejects.toThrow('이미 이 그룹의 멤버입니다');
    });
  });

  describe('regenerateInviteCode', () => {
    it('새로운 초대 코드를 생성하고 7일 후 만료되도록 설정해야 함', async () => {
      const groupId = 'group-1';
      const newInviteCode = 'NEW12345';
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Mock generateUniqueInviteCode (private method)
      jest
        .spyOn(service, 'generateUniqueInviteCode')
        .mockResolvedValue(newInviteCode);

      mockPrismaService.group.update.mockResolvedValue({
        id: groupId,
        inviteCode: newInviteCode,
        inviteCodeExpiresAt: futureDate,
      });

      const result = await service.regenerateInviteCode(groupId);

      expect(result.inviteCode).toBe(newInviteCode);
      expect(result.inviteCodeExpiresAt).toBeInstanceOf(Date);
      expect(prismaService.group.update).toHaveBeenCalledWith({
        where: { id: groupId },
        data: {
          inviteCode: newInviteCode,
          inviteCodeExpiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('getJoinRequests', () => {
    it('그룹의 모든 가입 요청을 조회해야 함', async () => {
      const groupId = 'group-1';
      const joinRequests = [
        {
          id: 'request-1',
          groupId,
          email: 'user1@test.com',
          type: 'REQUEST',
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'request-2',
          groupId,
          email: 'user2@test.com',
          type: 'INVITE',
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.groupJoinRequest.findMany.mockResolvedValue(
        joinRequests,
      );

      const result = await service.getJoinRequests(groupId);

      expect(result).toHaveLength(2);
      expect(prismaService.groupJoinRequest.findMany).toHaveBeenCalledWith({
        where: { groupId },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('status 필터를 적용하여 조회해야 함', async () => {
      const groupId = 'group-1';
      const status = 'ACCEPTED';

      mockPrismaService.groupJoinRequest.findMany.mockResolvedValue([]);

      await service.getJoinRequests(groupId, status);

      expect(prismaService.groupJoinRequest.findMany).toHaveBeenCalledWith({
        where: { groupId, status },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('acceptJoinRequest', () => {
    it('가입 요청을 승인하고 멤버로 추가해야 함', async () => {
      const groupId = 'group-1';
      const requestId = 'request-1';
      const joinRequest = {
        id: requestId,
        groupId,
        email: 'user@test.com',
        type: 'REQUEST',
        status: 'PENDING',
      };
      const user = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        profileImageKey: null,
      };
      const defaultRole = {
        id: 'role-1',
        name: 'MEMBER',
        isDefaultRole: true,
      };
      const member = {
        id: 'member-1',
        groupId,
        userId: user.id,
        roleId: defaultRole.id,
        customColor: null,
        joinedAt: new Date(),
        role: defaultRole,
        user,
      };

      mockPrismaService.groupJoinRequest.findUnique.mockResolvedValue(
        joinRequest,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.groupMember.findUnique.mockResolvedValue(null);
      mockPrismaService.role.findFirst.mockResolvedValue(defaultRole);
      mockPrismaService.$transaction.mockResolvedValue([
        { ...joinRequest, status: 'ACCEPTED' },
        member,
      ]);
      mockStorageService.getPublicUrl.mockReturnValue(null);

      const result = await service.acceptJoinRequest(groupId, requestId);

      expect(result.message).toBe('가입 요청이 승인되었습니다');
      expect(result.member).toBeDefined();
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('존재하지 않는 요청은 NotFoundException을 발생시켜야 함', async () => {
      const groupId = 'group-1';
      const requestId = 'non-existent';

      mockPrismaService.groupJoinRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptJoinRequest(groupId, requestId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.acceptJoinRequest(groupId, requestId),
      ).rejects.toThrow('가입 요청을 찾을 수 없습니다');
    });

    it('INVITE 타입의 요청은 승인할 수 없어야 함', async () => {
      const groupId = 'group-1';
      const requestId = 'request-1';
      const joinRequest = {
        id: requestId,
        groupId,
        email: 'user@test.com',
        type: 'INVITE',
        status: 'PENDING',
      };

      mockPrismaService.groupJoinRequest.findUnique.mockResolvedValue(
        joinRequest,
      );

      await expect(
        service.acceptJoinRequest(groupId, requestId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.acceptJoinRequest(groupId, requestId),
      ).rejects.toThrow('INVITE 타입은 사용자가 초대 코드로 가입 시 자동 승인');
    });
  });

  describe('rejectJoinRequest', () => {
    it('가입 요청을 거부해야 함', async () => {
      const groupId = 'group-1';
      const requestId = 'request-1';
      const joinRequest = {
        id: requestId,
        groupId,
        email: 'user@test.com',
        type: 'REQUEST',
        status: 'PENDING',
      };

      mockPrismaService.groupJoinRequest.findUnique.mockResolvedValue(
        joinRequest,
      );
      mockPrismaService.groupJoinRequest.update.mockResolvedValue({
        ...joinRequest,
        status: 'REJECTED',
      });

      const result = await service.rejectJoinRequest(groupId, requestId);

      expect(result.message).toBe('가입 요청이 거부되었습니다');
      expect(prismaService.groupJoinRequest.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });
    });

    it('이미 처리된 요청은 ConflictException을 발생시켜야 함', async () => {
      const groupId = 'group-1';
      const requestId = 'request-1';
      const joinRequest = {
        id: requestId,
        groupId,
        email: 'user@test.com',
        type: 'REQUEST',
        status: 'ACCEPTED',
      };

      mockPrismaService.groupJoinRequest.findUnique.mockResolvedValue(
        joinRequest,
      );

      await expect(
        service.rejectJoinRequest(groupId, requestId),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.rejectJoinRequest(groupId, requestId),
      ).rejects.toThrow('이미 처리된 요청입니다');
    });
  });

  describe('inviteByEmail', () => {
    it('이메일로 초대를 보내고 GroupJoinRequest를 생성해야 함', async () => {
      const groupId = 'group-1';
      const inviterUserId = 'inviter-1';
      const email = 'invitee@test.com';
      const group = {
        id: groupId,
        name: 'Family',
        inviteCode: 'ABC12345',
        inviteCodeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      const inviter = {
        id: inviterUserId,
        email: 'inviter@test.com',
        name: 'Inviter User',
      };
      const invitee = {
        id: 'invitee-1',
        email,
        name: 'Invitee User',
      };
      const joinRequest = {
        id: 'request-1',
        groupId,
        email,
        type: 'INVITE',
        status: 'PENDING',
      };

      mockPrismaService.group.findUnique.mockResolvedValue(group);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(inviter)
        .mockResolvedValueOnce(invitee);
      mockPrismaService.groupMember.findUnique.mockResolvedValue(null);
      mockPrismaService.groupJoinRequest.create.mockResolvedValue(joinRequest);
      mockEmailService.sendGroupInviteEmail.mockResolvedValue(undefined);

      const result = await service.inviteByEmail(
        groupId,
        inviterUserId,
        email,
      );

      expect(result.message).toBe('초대 이메일이 발송되었습니다');
      expect(result.email).toBe(email);
      expect(prismaService.groupJoinRequest.create).toHaveBeenCalledWith({
        data: {
          groupId,
          email,
          type: 'INVITE',
          status: 'PENDING',
        },
      });
      expect(emailService.sendGroupInviteEmail).toHaveBeenCalledWith(
        email,
        group.name,
        inviter.name,
        group.inviteCode,
      );
    });

    it('이미 멤버인 사용자는 ConflictException을 발생시켜야 함', async () => {
      const groupId = 'group-1';
      const inviterUserId = 'inviter-1';
      const email = 'invitee@test.com';
      const group = { id: groupId, name: 'Family' };
      const inviter = {
        id: inviterUserId,
        email: 'inviter@test.com',
        name: 'Inviter User',
      };
      const invitee = {
        id: 'invitee-1',
        email,
        name: 'Invitee User',
      };
      const existingMember = {
        id: 'member-1',
        groupId,
        userId: invitee.id,
      };

      mockPrismaService.group.findUnique.mockResolvedValue(group);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(inviter)
        .mockResolvedValueOnce(invitee);
      mockPrismaService.groupMember.findUnique.mockResolvedValue(
        existingMember,
      );

      await expect(
        service.inviteByEmail(groupId, inviterUserId, email),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.inviteByEmail(groupId, inviterUserId, email),
      ).rejects.toThrow('이미 이 그룹의 멤버입니다');
    });
  });

  describe('cancelInvite', () => {
    it('INVITE 타입의 PENDING 상태 초대를 취소해야 함', async () => {
      const groupId = 'group-1';
      const requestId = 'request-1';
      const joinRequest = {
        id: requestId,
        groupId,
        email: 'user@test.com',
        type: 'INVITE',
        status: 'PENDING',
      };

      mockPrismaService.groupJoinRequest.findUnique.mockResolvedValue(
        joinRequest,
      );
      mockPrismaService.groupJoinRequest.delete.mockResolvedValue(joinRequest);

      const result = await service.cancelInvite(groupId, requestId);

      expect(result.message).toBe('초대가 취소되었습니다');
      expect(prismaService.groupJoinRequest.delete).toHaveBeenCalledWith({
        where: { id: requestId },
      });
    });

    it('REQUEST 타입은 취소할 수 없어야 함', async () => {
      const groupId = 'group-1';
      const requestId = 'request-1';
      const joinRequest = {
        id: requestId,
        groupId,
        email: 'user@test.com',
        type: 'REQUEST',
        status: 'PENDING',
      };

      mockPrismaService.groupJoinRequest.findUnique.mockResolvedValue(
        joinRequest,
      );

      await expect(
        service.cancelInvite(groupId, requestId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancelInvite(groupId, requestId),
      ).rejects.toThrow('INVITE 타입의 요청만 취소할 수 있습니다');
    });
  });

  describe('resendInvite', () => {
    it('초대 이메일을 재전송해야 함', async () => {
      const groupId = 'group-1';
      const requestId = 'request-1';
      const inviterUserId = 'inviter-1';
      const joinRequest = {
        id: requestId,
        groupId,
        email: 'invitee@test.com',
        type: 'INVITE',
        status: 'PENDING',
      };
      const group = {
        id: groupId,
        name: 'Family',
        inviteCode: 'ABC12345',
        inviteCodeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      const inviter = {
        id: inviterUserId,
        email: 'inviter@test.com',
        name: 'Inviter User',
      };

      mockPrismaService.groupJoinRequest.findUnique.mockResolvedValue(
        joinRequest,
      );
      mockPrismaService.group.findUnique.mockResolvedValue(group);
      mockPrismaService.user.findUnique.mockResolvedValue(inviter);
      mockEmailService.sendGroupInviteEmail.mockResolvedValue(undefined);

      const result = await service.resendInvite(
        groupId,
        requestId,
        inviterUserId,
      );

      expect(result.message).toBe('초대 이메일이 재전송되었습니다');
      expect(emailService.sendGroupInviteEmail).toHaveBeenCalledWith(
        joinRequest.email,
        group.name,
        inviter.name,
        group.inviteCode,
      );
    });

    it('REQUEST 타입은 재전송할 수 없어야 함', async () => {
      const groupId = 'group-1';
      const requestId = 'request-1';
      const inviterUserId = 'inviter-1';
      const joinRequest = {
        id: requestId,
        groupId,
        email: 'user@test.com',
        type: 'REQUEST',
        status: 'PENDING',
      };

      mockPrismaService.groupJoinRequest.findUnique.mockResolvedValue(
        joinRequest,
      );

      await expect(
        service.resendInvite(groupId, requestId, inviterUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resendInvite(groupId, requestId, inviterUserId),
      ).rejects.toThrow('INVITE 타입의 요청만 재전송할 수 있습니다');
    });
  });
});
