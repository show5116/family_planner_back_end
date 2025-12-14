import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateRoleDto } from '@/role/dto/create-role.dto';
import { UpdateRoleDto } from '@/role/dto/update-role.dto';
import { BulkUpdateRoleSortOrderDto } from '@/role/dto/bulk-update-sort-order.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  /**
   * 공통 역할 전체 조회 (운영자 전용)
   * groupId=null인 공통 역할만 조회
   */
  async findAllCommon(userId: string) {
    const roles = await this.prisma.role.findMany({
      where: {
        groupId: null,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return roles.map((role) => ({
      ...role,
      permissions: JSON.parse(role.permissions as string),
    }));
  }

  /**
   * 그룹별 역할 전체 조회 (그룹 멤버 전용)
   */
  async findAllByGroup(userId: string, groupId: string) {
    // 그룹 멤버십 확인
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('이 그룹에 접근할 권한이 없습니다.');
    }

    // 공통 역할 + 해당 그룹의 커스텀 역할 조회
    const roles = await this.prisma.role.findMany({
      where: {
        OR: [{ groupId: null }, { groupId }],
      },
      orderBy: [{ groupId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return roles.map((role) => ({
      ...role,
      permissions: JSON.parse(role.permissions as string),
    }));
  }

  /**
   * 역할 생성 (운영자 전용 - 공통 역할만)
   */
  async create(userId: string, createRoleDto: CreateRoleDto) {
    // groupId가 제공된 경우 에러 (그룹별 역할은 다른 엔드포인트 사용)
    if (createRoleDto.groupId) {
      throw new BadRequestException(
        '공통 역할만 생성할 수 있습니다. 그룹별 역할은 /groups/:groupId/roles 엔드포인트를 사용하세요.',
      );
    }

    // 역할명 중복 체크 (공통 역할 내에서)
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: createRoleDto.name,
        groupId: null,
      },
    });

    if (existingRole) {
      throw new ConflictException(
        `'${createRoleDto.name}' 역할이 이미 존재합니다.`,
      );
    }

    // defaultRole을 true로 설정하려는 경우, 이미 defaultRole이 존재하는지 확인
    if (createRoleDto.isDefaultRole) {
      const existingDefaultRole = await this.prisma.role.findFirst({
        where: {
          groupId: null,
          isDefaultRole: true,
        },
      });

      if (existingDefaultRole) {
        throw new ConflictException(
          '공통 역할 중 이미 기본 역할이 존재합니다. 기본 역할은 하나만 설정할 수 있습니다.',
        );
      }
    }

    const role = await this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        groupId: null, // 공통 역할은 항상 null
        isDefaultRole: createRoleDto.isDefaultRole || false,
        permissions: JSON.stringify(createRoleDto.permissions),
        sortOrder: createRoleDto.sortOrder ?? 0,
      },
    });

    return {
      ...role,
      permissions: JSON.parse(role.permissions as string),
    };
  }

  /**
   * 역할 수정 (운영자 전용 - 공통 역할만)
   */
  async update(userId: string, id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('역할을 찾을 수 없습니다.');
    }

    // 공통 역할만 수정 가능
    if (role.groupId !== null) {
      throw new BadRequestException(
        '공통 역할만 수정할 수 있습니다. 그룹별 역할은 /groups/:groupId/roles 엔드포인트를 사용하세요.',
      );
    }

    // 역할명 변경 시 중복 체크
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          name: updateRoleDto.name,
          groupId: null,
          id: { not: id },
        },
      });

      if (existingRole) {
        throw new ConflictException(
          `'${updateRoleDto.name}' 역할이 이미 존재합니다.`,
        );
      }
    }

    // defaultRole을 true로 변경하려는 경우, 이미 다른 defaultRole이 존재하는지 확인
    if (updateRoleDto.isDefaultRole === true && role.isDefaultRole !== true) {
      const existingDefaultRole = await this.prisma.role.findFirst({
        where: {
          groupId: null,
          isDefaultRole: true,
          id: { not: id },
        },
      });

      if (existingDefaultRole) {
        throw new ConflictException(
          '공통 역할 중 이미 기본 역할이 존재합니다. 기본 역할은 하나만 설정할 수 있습니다.',
        );
      }
    }

    const updateData: any = {};
    if (updateRoleDto.name) updateData.name = updateRoleDto.name;
    if (updateRoleDto.isDefaultRole !== undefined)
      updateData.isDefaultRole = updateRoleDto.isDefaultRole;
    if (updateRoleDto.permissions)
      updateData.permissions = JSON.stringify(updateRoleDto.permissions);
    if (updateRoleDto.sortOrder !== undefined)
      updateData.sortOrder = updateRoleDto.sortOrder;

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updatedRole,
      permissions: JSON.parse(updatedRole.permissions as string),
    };
  }

  /**
   * 역할 삭제 (운영자 전용 - 공통 역할만)
   */
  async remove(userId: string, id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            groupMembers: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('역할을 찾을 수 없습니다.');
    }

    // 공통 역할만 삭제 가능
    if (role.groupId !== null) {
      throw new BadRequestException(
        '공통 역할만 삭제할 수 있습니다. 그룹별 역할은 /groups/:groupId/roles 엔드포인트를 사용하세요.',
      );
    }

    // OWNER 역할은 삭제 불가
    if (role.name === 'OWNER') {
      throw new BadRequestException('OWNER 역할은 삭제할 수 없습니다.');
    }

    // 사용 중인 역할인지 확인
    if (role._count.groupMembers > 0) {
      throw new BadRequestException(
        `이 역할을 사용 중인 멤버가 ${role._count.groupMembers}명 있습니다. 삭제할 수 없습니다.`,
      );
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return {
      message: '역할이 삭제되었습니다.',
      deletedRole: {
        ...role,
        permissions: JSON.parse(role.permissions as string),
      },
    };
  }

  // ==================== 그룹별 역할 관리 (그룹 OWNER 전용) ====================

  /**
   * 그룹별 역할 생성 (그룹 OWNER 전용)
   */
  async createForGroup(
    userId: string,
    groupId: string,
    createRoleDto: CreateRoleDto,
  ) {
    // 역할명 중복 체크 (같은 그룹 내에서)
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: createRoleDto.name,
        groupId,
      },
    });

    if (existingRole) {
      throw new ConflictException(
        `'${createRoleDto.name}' 역할이 이미 존재합니다.`,
      );
    }

    // defaultRole을 true로 설정하려는 경우, 이미 defaultRole이 존재하는지 확인
    if (createRoleDto.isDefaultRole) {
      const existingDefaultRole = await this.prisma.role.findFirst({
        where: {
          groupId,
          isDefaultRole: true,
        },
      });

      if (existingDefaultRole) {
        throw new ConflictException(
          '이 그룹에 이미 기본 역할이 존재합니다. 기본 역할은 하나만 설정할 수 있습니다.',
        );
      }
    }

    const role = await this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        groupId,
        isDefaultRole: createRoleDto.isDefaultRole || false,
        permissions: JSON.stringify(createRoleDto.permissions),
        sortOrder: createRoleDto.sortOrder ?? 0,
      },
    });

    return {
      ...role,
      permissions: JSON.parse(role.permissions as string),
    };
  }

  /**
   * 그룹별 역할 수정 (그룹 OWNER 전용)
   */
  async updateForGroup(
    userId: string,
    groupId: string,
    id: string,
    updateRoleDto: UpdateRoleDto,
  ) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('역할을 찾을 수 없습니다.');
    }

    // 해당 그룹의 역할인지 확인
    if (role.groupId !== groupId) {
      throw new ForbiddenException('이 역할은 해당 그룹에 속하지 않습니다.');
    }

    // 역할명 변경 시 중복 체크
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          name: updateRoleDto.name,
          groupId,
          id: { not: id },
        },
      });

      if (existingRole) {
        throw new ConflictException(
          `'${updateRoleDto.name}' 역할이 이미 존재합니다.`,
        );
      }
    }

    // defaultRole을 true로 변경하려는 경우, 이미 다른 defaultRole이 존재하는지 확인
    if (updateRoleDto.isDefaultRole === true && role.isDefaultRole !== true) {
      const existingDefaultRole = await this.prisma.role.findFirst({
        where: {
          groupId,
          isDefaultRole: true,
          id: { not: id },
        },
      });

      if (existingDefaultRole) {
        throw new ConflictException(
          '이 그룹에 이미 기본 역할이 존재합니다. 기본 역할은 하나만 설정할 수 있습니다.',
        );
      }
    }

    const updateData: any = {};
    if (updateRoleDto.name) updateData.name = updateRoleDto.name;
    if (updateRoleDto.isDefaultRole !== undefined)
      updateData.isDefaultRole = updateRoleDto.isDefaultRole;
    if (updateRoleDto.permissions)
      updateData.permissions = JSON.stringify(updateRoleDto.permissions);
    if (updateRoleDto.sortOrder !== undefined)
      updateData.sortOrder = updateRoleDto.sortOrder;

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updatedRole,
      permissions: JSON.parse(updatedRole.permissions as string),
    };
  }

  /**
   * 그룹별 역할 삭제 (그룹 OWNER 전용)
   */
  async removeForGroup(userId: string, groupId: string, id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            groupMembers: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('역할을 찾을 수 없습니다.');
    }

    // 해당 그룹의 역할인지 확인
    if (role.groupId !== groupId) {
      throw new ForbiddenException('이 역할은 해당 그룹에 속하지 않습니다.');
    }

    // 사용 중인 역할인지 확인
    if (role._count.groupMembers > 0) {
      throw new BadRequestException(
        `이 역할을 사용 중인 멤버가 ${role._count.groupMembers}명 있습니다. 삭제할 수 없습니다.`,
      );
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return {
      message: '역할이 삭제되었습니다.',
      deletedRole: {
        ...role,
        permissions: JSON.parse(role.permissions as string),
      },
    };
  }

  // ==================== 일괄 정렬 순서 업데이트 ====================

  /**
   * 공통 역할 일괄 정렬 순서 업데이트 (운영자 전용)
   */
  async bulkUpdateSortOrder(
    userId: string,
    bulkUpdateDto: BulkUpdateRoleSortOrderDto,
  ) {
    // 트랜잭션으로 일괄 업데이트
    const updates = bulkUpdateDto.items.map((item) =>
      this.prisma.role.update({
        where: { id: item.id, groupId: null }, // 공통 역할만
        data: { sortOrder: item.sortOrder },
      }),
    );

    await this.prisma.$transaction(updates);

    return {
      message: '역할 정렬 순서가 업데이트되었습니다.',
      updatedCount: bulkUpdateDto.items.length,
    };
  }

  /**
   * 그룹별 역할 일괄 정렬 순서 업데이트 (그룹 OWNER 전용)
   */
  async bulkUpdateSortOrderForGroup(
    userId: string,
    groupId: string,
    bulkUpdateDto: BulkUpdateRoleSortOrderDto,
  ) {
    // 트랜잭션으로 일괄 업데이트
    const updates = bulkUpdateDto.items.map((item) =>
      this.prisma.role.update({
        where: { id: item.id, groupId }, // 해당 그룹의 역할만
        data: { sortOrder: item.sortOrder },
      }),
    );

    await this.prisma.$transaction(updates);

    return {
      message: '역할 정렬 순서가 업데이트되었습니다.',
      updatedCount: bulkUpdateDto.items.length,
    };
  }
}
