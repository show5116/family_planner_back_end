/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { PrismaService } from '@/prisma/prisma.service';
import { PermissionCategory, PermissionCode } from '@prisma/client';

describe('PermissionService', () => {
  let service: PermissionService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    permission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllPermissions', () => {
    it('활성화된 모든 권한을 조회하고 카테고리별로 그룹화해야 함', async () => {
      const mockPermissions = [
        {
          id: '1',
          code: PermissionCode.UPDATE_GROUP,
          name: '그룹 조회',
          description: '그룹 정보 조회',
          category: PermissionCategory.GROUP,
        },
        {
          id: '2',
          code: PermissionCode.UPDATE_GROUP,
          name: '그룹 수정',
          description: '그룹 정보 수정',
          category: PermissionCategory.GROUP,
        },
        {
          id: '3',
          code: PermissionCode.INVITE_MEMBER,
          name: '멤버 초대',
          description: '새 멤버 초대',
          category: PermissionCategory.GROUP,
        },
      ];

      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getAllPermissions();

      expect(prismaService.permission.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          category: true,
        },
      });
      expect(result.permissions).toHaveLength(3);
      expect(result.groupedByCategory[PermissionCategory.GROUP]).toHaveLength(
        3,
      );
      expect(result.categories).toEqual(Object.values(PermissionCategory));
    });

    it('특정 카테고리만 필터링하여 조회해야 함', async () => {
      const mockPermissions = [
        {
          id: '1',
          code: PermissionCode.UPDATE_GROUP,
          name: '그룹 조회',
          description: '그룹 정보 조회',
          category: PermissionCategory.GROUP,
        },
      ];

      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      await service.getAllPermissions(PermissionCategory.GROUP);

      expect(prismaService.permission.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          category: PermissionCategory.GROUP,
        },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }],
        select: expect.any(Object),
      });
    });
  });

  describe('validatePermissions', () => {
    it('모든 권한 코드가 유효하면 true를 반환해야 함', async () => {
      const permissionCodes = [
        PermissionCode.UPDATE_GROUP,
        PermissionCode.UPDATE_GROUP,
      ];
      const mockPermissions = [
        { code: PermissionCode.UPDATE_GROUP },
        { code: PermissionCode.UPDATE_GROUP },
      ];

      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.validatePermissions(permissionCodes);

      expect(result).toBe(true);
      expect(prismaService.permission.findMany).toHaveBeenCalledWith({
        where: {
          code: { in: permissionCodes },
          isActive: true,
        },
        select: { code: true },
      });
    });

    it('일부 권한 코드가 유효하지 않으면 false를 반환해야 함', async () => {
      const permissionCodes = [
        PermissionCode.UPDATE_GROUP,
        PermissionCode.UPDATE_GROUP,
      ];
      const mockPermissions = [
        { code: PermissionCode.UPDATE_GROUP },
        // UPDATE_GROUP이 누락됨
      ];

      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.validatePermissions(permissionCodes);

      expect(result).toBe(false);
    });

    it('모든 권한 코드가 유효하지 않으면 false를 반환해야 함', async () => {
      const permissionCodes = [
        PermissionCode.UPDATE_GROUP,
        PermissionCode.UPDATE_GROUP,
      ];

      mockPrismaService.permission.findMany.mockResolvedValue([]);

      const result = await service.validatePermissions(permissionCodes);

      expect(result).toBe(false);
    });
  });

  describe('getPermissionNames', () => {
    it('권한 코드 배열을 이름 배열로 변환해야 함', async () => {
      const permissionCodes = [
        PermissionCode.UPDATE_GROUP,
        PermissionCode.UPDATE_GROUP,
      ];
      const mockPermissions = [{ name: '그룹 조회' }, { name: '그룹 수정' }];

      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getPermissionNames(permissionCodes);

      expect(result).toEqual(['그룹 조회', '그룹 수정']);
      expect(prismaService.permission.findMany).toHaveBeenCalledWith({
        where: {
          code: { in: permissionCodes },
          isActive: true,
        },
        select: { name: true },
      });
    });

    it('빈 배열이 입력되면 빈 배열을 반환해야 함', async () => {
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      const result = await service.getPermissionNames([]);

      expect(result).toEqual([]);
    });
  });
});
