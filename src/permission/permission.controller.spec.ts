/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { AdminGuard } from '@/auth/admin.guard';
import { PermissionCategory, PermissionCode } from '@prisma/client';

describe('PermissionController', () => {
  let controller: PermissionController;
  let permissionService: PermissionService;

  const mockPermissionService = {
    getAllPermissions: jest.fn(),
    validatePermissions: jest.fn(),
    getPermissionNames: jest.fn(),
  };

  const mockAdminGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue(mockAdminGuard)
      .compile();

    controller = module.get<PermissionController>(PermissionController);
    permissionService = module.get<PermissionService>(PermissionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllPermissions', () => {
    it('모든 권한을 조회해야 함', async () => {
      const mockResult = {
        permissions: [
          {
            id: '1',
            code: PermissionCode.UPDATE_GROUP,
            name: '그룹 수정',
            description: '그룹 정보 수정',
            category: PermissionCategory.GROUP,
          },
        ],
        groupedByCategory: {
          [PermissionCategory.GROUP]: [
            {
              id: '1',
              code: PermissionCode.UPDATE_GROUP,
              name: '그룹 수정',
              description: '그룹 정보 수정',
              category: PermissionCategory.GROUP,
            },
          ],
        },
        categories: Object.values(PermissionCategory),
      };

      mockPermissionService.getAllPermissions.mockResolvedValue(mockResult);

      const result = await controller.getAllPermissions();

      expect(permissionService.getAllPermissions).toHaveBeenCalledWith(
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it('특정 카테고리의 권한만 조회해야 함', async () => {
      const category = PermissionCategory.GROUP;
      const mockResult = {
        permissions: [
          {
            id: '1',
            code: PermissionCode.UPDATE_GROUP,
            name: '그룹 수정',
            description: '그룹 정보 수정',
            category: PermissionCategory.GROUP,
          },
        ],
        groupedByCategory: {
          [PermissionCategory.GROUP]: [],
        },
        categories: Object.values(PermissionCategory),
      };

      mockPermissionService.getAllPermissions.mockResolvedValue(mockResult);

      const result = await controller.getAllPermissions(category);

      expect(permissionService.getAllPermissions).toHaveBeenCalledWith(
        category,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
