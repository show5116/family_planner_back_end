import { Module } from '@nestjs/common';
import { GroupService } from '@/group/group.service';
import { GroupController } from '@/group/group.controller';
import { GroupMemberService } from '@/group/group-member.service';
import { GroupMemberController } from '@/group/group-member.controller';
import { GroupInviteService } from '@/group/group-invite.service';
import { GroupRoleController } from '@/group/group-role.controller';
import { GroupReportService } from '@/group/group-report.service';
import { GroupReportAdminController } from '@/group/group-report-admin.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { RoleService } from '@/role/role.service';
import { StorageModule } from '@/storage/storage.module';
import { EmailModule } from '@/email/email.module';
import { NotificationModule } from '@/notification/notification.module';
import { WebhookModule } from '@/webhook/webhook.module';
import { RedisModule } from '@/redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    EmailModule,
    NotificationModule,
    WebhookModule,
    RedisModule,
  ],
  controllers: [
    GroupMemberController,
    GroupController,
    GroupRoleController,
    GroupReportAdminController,
  ],
  providers: [
    GroupService,
    GroupMemberService,
    GroupInviteService,
    GroupReportService,
    RoleService,
  ],
  exports: [GroupService, GroupMemberService, GroupInviteService],
})
export class GroupModule {}
