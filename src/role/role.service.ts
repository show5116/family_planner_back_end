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

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  /**
   * 운영자 권한 확인 (공통 메서드)
   */
  private async checkAdminPermission(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user || !user.isAdmin) {
      throw new ForbiddenException('운영자 권한이 필요합니다.');
    }
  }

  /**
   * 역할 전체 조회
   * @param type - 'common' (공통 역할만) 또는 undefined (전체)
   * @param groupId - 특정 그룹 역할만 조회
   */
  async findAll(
    userId: string,
    type?: 'common',
    groupId?: string,
  ) {
    await this.checkAdminPermission(userId);

    const where: any = {};

    if (type === 'common') {
      where.groupId = null;
    } else if (groupId) {
      where.groupId = groupId;
    }

    const roles = await this.prisma.role.findMany({
      where,
      orderBy: [{ groupId: 'asc' }, { name: 'asc' }],
    });

    return roles.map((role) => ({
      ...role,
      permissions: JSON.parse(role.permissions as string),
    }));
  }

  /**
   * 역할 단건 조회
   */
  async findOne(userId: string, id: string) {
    await this.checkAdminPermission(userId);

    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('역할을 찾을 수 없습니다.');
    }

    return {
      ...role,
      permissions: JSON.parse(role.permissions as string),
    };
  }

  /**
   * 역할 생성
   */
  async create(userId: string, createRoleDto: CreateRoleDto) {
    await this.checkAdminPermission(userId);

    // 역할명 중복 체크 (같은 그룹 내에서)
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: createRoleDto.name,
        groupId: createRoleDto.groupId || null,
      },
    });

    if (existingRole) {
      throw new ConflictException(
        `'${createRoleDto.name}' 역할이 이미 존재합니다.`,
      );
    }

    const role = await this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        groupId: createRoleDto.groupId || null,
        isDefaultRole: createRoleDto.isDefaultRole || false,
        permissions: JSON.stringify(createRoleDto.permissions),
      },
    });

    return {
      ...role,
      permissions: JSON.parse(role.permissions as string),
    };
  }

  /**
   * 역할 수정
   */
  async update(
    userId: string,
    id: string,
    updateRoleDto: UpdateRoleDto,
  ) {
    await this.checkAdminPermission(userId);

    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('역할을 찾을 수 없습니다.');
    }

    // OWNER 역할은 수정 불가
    if (role.name === 'OWNER' && role.groupId === null) {
      throw new BadRequestException('OWNER 역할은 수정할 수 없습니다.');
    }

    // 역할명 변경 시 중복 체크
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          name: updateRoleDto.name,
          groupId: role.groupId,
          id: { not: id },
        },
      });

      if (existingRole) {
        throw new ConflictException(
          `'${updateRoleDto.name}' 역할이 이미 존재합니다.`,
        );
      }
    }

    const updateData: any = {};
    if (updateRoleDto.name) updateData.name = updateRoleDto.name;
    if (updateRoleDto.isDefaultRole !== undefined)
      updateData.isDefaultRole = updateRoleDto.isDefaultRole;
    if (updateRoleDto.permissions)
      updateData.permissions = JSON.stringify(updateRoleDto.permissions);

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
   * 역할 삭제
   */
  async remove(userId: string, id: string) {
    await this.checkAdminPermission(userId);

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

    // OWNER 역할은 삭제 불가
    if (role.name === 'OWNER' && role.groupId === null) {
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
}
