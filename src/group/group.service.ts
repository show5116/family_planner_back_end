import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateGroupDto } from '@/group/dto/create-group.dto';
import { UpdateGroupDto } from '@/group/dto/update-group.dto';
import { GroupInviteService } from '@/group/group-invite.service';

@Injectable()
export class GroupService {
  constructor(
    private prisma: PrismaService,
    private groupInviteService: GroupInviteService,
  ) {}

  /**
   * OWNER 역할 조회 (공통 역할)
   */
  private async getOwnerRole() {
    const ownerRole = await this.prisma.role.findFirst({
      where: {
        name: 'OWNER',
        groupId: null, // 공통 역할
      },
    });

    if (!ownerRole) {
      throw new Error(
        'OWNER 역할을 찾을 수 없습니다. 데이터베이스 시드를 실행해주세요.',
      );
    }

    return ownerRole;
  }

  /**
   * 그룹 생성
   */
  async create(userId: string, createGroupDto: CreateGroupDto) {
    const inviteCode = await this.groupInviteService.generateUniqueInviteCode();
    const ownerRole = await this.getOwnerRole();

    const group = await this.prisma.group.create({
      data: {
        name: createGroupDto.name,
        description: createGroupDto.description,
        defaultColor: createGroupDto.defaultColor || '#6366F1', // 기본 색상
        inviteCode,
        members: {
          create: {
            userId,
            roleId: ownerRole.id, // OWNER 역할 부여
          },
        },
      },
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
    });

    return group;
  }

  /**
   * 내가 속한 그룹 목록 조회
   */
  async findMyGroups(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: {
            userId, // 내 멤버십 정보만 포함
          },
          include: {
            role: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 개인 커스텀 색상 또는 그룹 기본 색상 반환
    return groups.map((group) => ({
      ...group,
      myColor: group.members[0]?.customColor || group.defaultColor,
      myRole: group.members[0]?.role,
    }));
  }

  /**
   * 그룹 상세 조회
   */
  async findOne(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
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
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('그룹을 찾을 수 없습니다');
    }

    // 멤버인지 확인
    const isMember = group.members.some((member) => member.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('이 그룹에 접근할 권한이 없습니다');
    }

    return group;
  }

  /**
   * 그룹 정보 수정 (UPDATE_GROUP 권한 필요)
   */
  async update(
    groupId: string,
    userId: string,
    updateGroupDto: UpdateGroupDto,
  ) {
    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        name: updateGroupDto.name,
        description: updateGroupDto.description,
        defaultColor: updateGroupDto.defaultColor,
      },
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
    });

    return group;
  }

  /**
   * 그룹 삭제 (DELETE_GROUP 권한 필요 - 보통 OWNER만)
   */
  async remove(groupId: string, userId: string) {
    await this.prisma.group.delete({
      where: { id: groupId },
    });

    return { message: '그룹이 삭제되었습니다' };
  }
}
