/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupMembershipGuard, GroupPermissionGuard } from './guards';

describe('GroupController', () => {
  let controller: GroupController;
  let groupService: GroupService;

  const mockGroupService = {
    create: jest.fn(),
    findMyGroups: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupController],
      providers: [
        {
          provide: GroupService,
          useValue: mockGroupService,
        },
      ],
    })
      .overrideGuard(GroupMembershipGuard)
      .useValue(mockGuard)
      .overrideGuard(GroupPermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<GroupController>(GroupController);
    groupService = module.get<GroupService>(GroupService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('그룹을 생성해야 함', async () => {
      const userId = 'user-1';
      const createGroupDto: CreateGroupDto = {
        name: 'Family',
        description: 'Our family group',
        defaultColor: '#FF5733',
      };
      const req = { user: { userId } };
      const createdGroup = {
        id: 'group-1',
        name: createGroupDto.name,
        description: createGroupDto.description,
        defaultColor: createGroupDto.defaultColor,
        inviteCode: 'ABC12345',
        inviteCodeExpiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      };

      mockGroupService.create.mockResolvedValue(createdGroup);

      const result = await controller.create(req, createGroupDto);

      expect(groupService.create).toHaveBeenCalledWith(userId, createGroupDto);
      expect(result).toEqual(createdGroup);
    });
  });

  describe('findMyGroups', () => {
    it('내가 속한 그룹 목록을 조회해야 함', async () => {
      const userId = 'user-1';
      const req = { user: { userId } };
      const myGroups = [
        {
          id: 'group-1',
          name: 'Family',
          description: 'Family group',
          defaultColor: '#FF5733',
          inviteCode: 'ABC12345',
          inviteCodeExpiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          myColor: '#FF5733',
          myRole: { id: 'role-1', name: 'OWNER' },
          members: [],
          _count: { members: 5 },
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
          myColor: '#0000FF',
          myRole: { id: 'role-2', name: 'MEMBER' },
          members: [],
          _count: { members: 10 },
        },
      ];

      mockGroupService.findMyGroups.mockResolvedValue(myGroups);

      const result = await controller.findMyGroups(req);

      expect(groupService.findMyGroups).toHaveBeenCalledWith(userId);
      expect(result).toEqual(myGroups);
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('그룹 상세 정보를 조회해야 함', async () => {
      const groupId = 'group-1';
      const userId = 'user-1';
      const req = { user: { userId } };
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
              profileImageUrl: null,
            },
          },
        ],
      };

      mockGroupService.findOne.mockResolvedValue(group);

      const result = await controller.findOne(groupId, req);

      expect(groupService.findOne).toHaveBeenCalledWith(groupId, userId);
      expect(result).toEqual(group);
      expect(result.members).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('그룹 정보를 수정해야 함', async () => {
      const groupId = 'group-1';
      const userId = 'user-1';
      const req = { user: { userId } };
      const updateGroupDto: UpdateGroupDto = {
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
        members: [],
      };

      mockGroupService.update.mockResolvedValue(updatedGroup);

      const result = await controller.update(groupId, req, updateGroupDto);

      expect(groupService.update).toHaveBeenCalledWith(
        groupId,
        userId,
        updateGroupDto,
      );
      expect(result).toEqual(updatedGroup);
      expect(result.name).toBe('Updated Family');
    });
  });

  describe('remove', () => {
    it('그룹을 삭제해야 함', async () => {
      const groupId = 'group-1';
      const userId = 'user-1';
      const req = { user: { userId } };
      const response = { message: '그룹이 삭제되었습니다' };

      mockGroupService.remove.mockResolvedValue(response);

      const result = await controller.remove(groupId, req);

      expect(groupService.remove).toHaveBeenCalledWith(groupId, userId);
      expect(result).toEqual(response);
    });
  });
});
