import { Module } from '@nestjs/common';
import { GroupService } from '@/group/group.service';
import { GroupController } from '@/group/group.controller';
import { GroupMemberService } from '@/group/group-member.service';
import { GroupMemberController } from '@/group/group-member.controller';
import { GroupInviteService } from '@/group/group-invite.service';
import { GroupRoleController } from '@/group/group-role.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { RoleService } from '@/role/role.service';

@Module({
  imports: [PrismaModule],
  controllers: [GroupController, GroupMemberController, GroupRoleController],
  providers: [
    GroupService,
    GroupMemberService,
    GroupInviteService,
    RoleService,
  ],
  exports: [GroupService, GroupMemberService, GroupInviteService],
})
export class GroupModule {}
