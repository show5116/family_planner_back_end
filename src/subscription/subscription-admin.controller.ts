import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from '@/auth/admin.guard';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiNotFound,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';
import { SubscriptionAdminService } from './subscription-admin.service';
import {
  AdminUpdateSubscriptionDto,
  AdminUserQueryDto,
  AdminUserDto,
  AdminUserPageDto,
} from './dto/admin-subscription.dto';

@ApiTags('Subscription (ADMIN)')
@Controller('subscription/admin')
@UseGuards(AdminGuard)
@ApiCommonAuthResponses()
@ApiForbidden('운영자 권한이 필요합니다')
export class SubscriptionAdminController {
  constructor(
    private readonly subscriptionAdminService: SubscriptionAdminService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: '사용자 목록 조회 (ADMIN 전용)' })
  @ApiSuccess(AdminUserPageDto, '사용자 목록 조회 성공')
  getUsers(@Query() query: AdminUserQueryDto): Promise<AdminUserPageDto> {
    return this.subscriptionAdminService.getUsers(query);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: '사용자 상세 조회 (ADMIN 전용)' })
  @ApiSuccess(AdminUserDto, '사용자 조회 성공')
  @ApiNotFound('사용자를 찾을 수 없습니다')
  getUser(@Param('userId') userId: string): Promise<AdminUserDto> {
    return this.subscriptionAdminService.getUser(userId);
  }

  @Patch('users/:userId/subscription')
  @ApiOperation({ summary: '사용자 구독 직접 수정 (ADMIN 전용)' })
  @ApiSuccess(AdminUserDto, '구독 수정 성공')
  @ApiNotFound('사용자를 찾을 수 없습니다')
  updateUserSubscription(
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateSubscriptionDto,
  ): Promise<AdminUserDto> {
    return this.subscriptionAdminService.updateUserSubscription(userId, dto);
  }
}
