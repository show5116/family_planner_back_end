import { Test, TestingModule } from '@nestjs/testing';
import { GroupService } from './group.service';
import { PrismaService } from '@/prisma/prisma.service';
import { GroupInviteService } from './group-invite.service';
import { StorageService } from '@/storage/storage.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('GroupService', () => {
  let service: GroupService;
  let prismaService: PrismaService;
  let groupInviteService: GroupInviteService;
  let storageService: StorageService;

  const mockPrismaService = {
    group: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    groupMember: {
      findUnique: jest.fn(),
    },
  };

  const mockGroupInviteService = {
    generateUniqueInviteCode: jest.fn(),
  };

  const mockStorageService = {
    getPublicUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GroupInviteService,
          useValue: mockGroupInviteService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<GroupService>(GroupService);
    prismaService = module.get<PrismaService>(PrismaService);
    groupInviteService = module.get<GroupInviteService>(GroupInviteService);
    storageService = module.get<StorageService>(StorageService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('그룹을 생성하고 생성자를 OWNER로 추가해야 함', async () => {
      const userId = 'user-1';
      const createGroupDto = {
        name: 'Family',
        description: 'Our family group',
        defaultColor: '#FF5733',
      };
      const inviteCode = 'ABC12345';
      const ownerRole = { id: 'role-owner', name: 'OWNER' };
      const createdGroup = {
        id: 'group-1',
        name: createGroupDto.name,
        description: createGroupDto.description,
        defaultColor: createGroupDto.defaultColor,
        inviteCode,
        inviteCodeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: 'member-1',
            groupId: 'group-1',
            userId,
            roleId: ownerRole.id,
            customColor: null,
            joinedAt: new Date(),
            role: ownerRole,
            user: {
              id: userId,
              email: 'user@test.com',
              name: 'Test User',
              profileImageKey: null,
            },
          },
        ],
      };

      mockGroupInviteService.generateUniqueInviteCode.mockResolvedValue(
        inviteCode,
      );
      mockPrismaService.role.findFirst.mockResolvedValue(ownerRole);
      mockPrismaService.group.create.mockResolvedValue(createdGroup);
      mockStorageService.getPublicUrl.mockReturnValue(null);

      const result = await service.create(userId, createGroupDto);

      expect(groupInviteService.generateUniqueInviteCode).toHaveBeenCalled();
      expect(prismaService.role.findFirst).toHaveBeenCalledWith({
        where: { name: 'OWNER', groupId: null },
      });
      expect(prismaService.group.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createGroupDto.name,
          description: createGroupDto.description,
          defaultColor: createGroupDto.defaultColor,
          inviteCode,
          members: {
            create: {
              userId,
              roleId: ownerRole.id,
            },
          },
        }),
        include: expect.any(Object),
      });
      expect(result.id).toBe('group-1');
      expect(result.members).toHaveLength(1);
      expect(result.members[0].user.profileImageUrl).toBe(null);
    });

    it('기본 색상이 제공되지 않으면 #6366F1을 사용해야 함', async () => {
      const userId = 'user-1';
      const createGroupDto = {
        name: 'Family',
        description: 'Our family group',
      };
      const inviteCode = 'ABC12345';
      const ownerRole = { id: 'role-owner', name: 'OWNER' };

      mockGroupInviteService.generateUniqueInviteCode.mockResolvedValue(
        inviteCode,
      );
      mockPrismaService.role.findFirst.mockResolvedValue(ownerRole);
      mockPrismaService.group.create.mockResolvedValue({
        id: 'group-1',
        name: createGroupDto.name,
        description: createGroupDto.description,
        defaultColor: '#6366F1',
        inviteCode,
        inviteCodeExpiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      });

      await service.create(userId, createGroupDto);

      expect(prismaService.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            defaultColor: '#6366F1',
          }),
        }),
      );
    });

    it('OWNER 역할을 찾을 수 없으면 에러를 발생시켜야 함', async () => {
      const userId = 'user-1';
      const createGroupDto = {
        name: 'Family',
        description: 'Our family group',
      };

      mockGroupInviteService.generateUniqueInviteCode.mockResolvedValue(
        'ABC12345',
      );
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, createGroupDto)).rejects.toThrow(
        'OWNER 역할을 찾을 수 없습니다',
      );
    });
  });

  describe('findMyGroups', () => {
    it('사용자가 속한 모든 그룹을 반환해야 함', async () => {
      const userId = 'user-1';
      const groups = [
        {
          id: 'group-1',
          name: 'Family',
          description: 'Family group',
          defaultColor: '#FF5733',
          inviteCode: 'ABC12345',
          inviteCodeExpiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [
            {
              id: 'member-1',
              groupId: 'group-1',
              userId,
              roleId: 'role-1',
              customColor: '#00FF00',
              joinedAt: new Date(),
              role: { id: 'role-1', name: 'OWNER' },
            },
          ],
          _count: {
            members: 5,
          },
        },
        {
          id: 'group-2',
          name: 'Work',
          description: 'Work group',
          defaultColor: '#0000FF',
          inviteCode: 'DEF67890',
          inviteCodeExpiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [
            {
              id: 'member-2',
              groupId: 'group-2',
              userId,
              roleId: 'role-2',
              customColor: null,
              joinedAt: new Date(),
              role: { id: 'role-2', name: 'MEMBER' },
            },
          ],
          _count: {
            members: 10,
          },
        },
      ];

      mockPrismaService.group.findMany.mockResolvedValue(groups);

      const result = await service.findMyGroups(userId);

      expect(prismaService.group.findMany).toHaveBeenCalledWith({
        where: {
          members: {
            some: {
              userId,
            },
          },
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(2);
      expect(result[0].myColor).toBe('#00FF00'); // customColor 우선
      expect(result[0].myRole.name).toBe('OWNER');
      expect(result[1].myColor).toBe('#0000FF'); // defaultColor 사용
      expect(result[1].myRole.name).toBe('MEMBER');
    });

    it('속한 그룹이 없으면 빈 배열을 반환해야 함', async () => {
      const userId = 'user-1';

      mockPrismaService.group.findMany.mockResolvedValue([]);

      const result = await service.findMyGroups(userId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('그룹 상세 정보를 반환해야 함 (멤버만 조회 가능)', async () => {
      const groupId = 'group-1';
      const userId = 'user-1';
      const group = {
        id: groupId,
        name: 'Family',
        description: 'Family group',
        defaultColor: '#FF5733',
        inviteCode: 'ABC12345',
        inviteCodeExpiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: 'member-1',
            groupId,
            userId,
            roleId: 'role-1',
            customColor: null,
            joinedAt: new Date(),
            role: { id: 'role-1', name: 'OWNER' },
            user: {
              id: userId,
              email: 'user@test.com',
              name: 'Test User',
              profileImageKey: 'profile-key-1',
            },
          },
        ],
      };

      mockPrismaService.group.findUnique.mockResolvedValue(group);
      mockStorageService.getPublicUrl.mockReturnValue(
        'https://cdn.example.com/profile-key-1',
      );

      const result = await service.findOne(groupId, userId);

      expect(prismaService.group.findUnique).toHaveBeenCalledWith({
        where: { id: groupId },
        include: expect.any(Object),
      });
      expect(result.id).toBe(groupId);
      expect(result.members).toHaveLength(1);
      expect(result.members[0].user.profileImageUrl).toBe(
        'https://cdn.example.com/profile-key-1',
      );
    });

    it('그룹이 존재하지 않으면 NotFoundException을 발생시켜야 함', async () => {
      const groupId = 'non-existent-group';
      const userId = 'user-1';

      mockPrismaService.group.findUnique.mockResolvedValue(null);

      await expect(service.findOne(groupId, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(groupId, userId)).rejects.toThrow(
        '그룹을 찾을 수 없습니다',
      );
    });

    it('그룹 멤버가 아니면 ForbiddenException을 발생시켜야 함', async () => {
      const groupId = 'group-1';
      const userId = 'user-1';
      const nonMemberUserId = 'user-2';
      const group = {
        id: groupId,
        name: 'Family',
        description: 'Family group',
        defaultColor: '#FF5733',
        inviteCode: 'ABC12345',
        inviteCodeExpiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: 'member-1',
            groupId,
            userId,
            roleId: 'role-1',
            customColor: null,
            joinedAt: new Date(),
            role: { id: 'role-1', name: 'OWNER' },
            user: {
              id: userId,
              email: 'user@test.com',
              name: 'Test User',
              profileImageKey: null,
            },
          },
        ],
      };

      mockPrismaService.group.findUnique.mockResolvedValue(group);

      await expect(service.findOne(groupId, nonMemberUserId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne(groupId, nonMemberUserId)).rejects.toThrow(
        '이 그룹에 접근할 권한이 없습니다',
      );
    });
  });

  describe('update', () => {
    it('그룹 정보를 업데이트해야 함', async () => {
      const groupId = 'group-1';
      const userId = 'user-1';
      const updateGroupDto = {
        name: 'Updated Family',
        description: 'Updated description',
        defaultColor: '#00FF00',
      };
      const updatedGroup = {
        id: groupId,
        name: updateGroupDto.name,
        description: updateGroupDto.description,
        defaultColor: updateGroupDto.defaultColor,
        inviteCode: 'ABC12345',
        inviteCodeExpiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: 'member-1',
            groupId,
            userId,
            roleId: 'role-1',
            customColor: null,
            joinedAt: new Date(),
            role: { id: 'role-1', name: 'OWNER' },
            user: {
              id: userId,
              email: 'user@test.com',
              name: 'Test User',
              profileImageKey: null,
            },
          },
        ],
      };

      mockPrismaService.group.update.mockResolvedValue(updatedGroup);
      mockStorageService.getPublicUrl.mockReturnValue(null);

      const result = await service.update(groupId, userId, updateGroupDto);

      expect(prismaService.group.update).toHaveBeenCalledWith({
        where: { id: groupId },
        data: {
          name: updateGroupDto.name,
          description: updateGroupDto.description,
          defaultColor: updateGroupDto.defaultColor,
        },
        include: expect.any(Object),
      });
      expect(result.name).toBe('Updated Family');
      expect(result.description).toBe('Updated description');
      expect(result.defaultColor).toBe('#00FF00');
    });
  });

  describe('remove', () => {
    it('그룹을 삭제해야 함', async () => {
      const groupId = 'group-1';
      const userId = 'user-1';

      mockPrismaService.group.delete.mockResolvedValue({
        id: groupId,
        name: 'Family',
        description: 'Family group',
        defaultColor: '#FF5733',
        inviteCode: 'ABC12345',
        inviteCodeExpiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.remove(groupId, userId);

      expect(prismaService.group.delete).toHaveBeenCalledWith({
        where: { id: groupId },
      });
      expect(result.message).toBe('그룹이 삭제되었습니다');
    });
  });
});
