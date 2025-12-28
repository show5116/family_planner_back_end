import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import {
  DeviceTokenDto,
  NotificationSettingDto,
  NotificationDto,
  PaginatedNotificationsDto,
  UnreadCountResponseDto,
  MessageResponseDto,
} from './dto/notification-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';
import { AdminGuard } from '@/auth/admin.guard';

/**
 * 알림 컨트롤러
 * FCM 푸시 알림 및 알림 히스토리 관리 API
 */
@ApiTags('알림')
@Controller('notifications')
@ApiCommonAuthResponses()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('token')
  @ApiOperation({ summary: 'FCM 디바이스 토큰 등록' })
  @ApiCreated(DeviceTokenDto, 'FCM 토큰 등록 성공')
  registerToken(@Request() req, @Body() dto: RegisterTokenDto) {
    return this.notificationService.registerToken(req.user.userId, dto);
  }

  @Delete('token/:token')
  @ApiOperation({ summary: 'FCM 디바이스 토큰 삭제' })
  @ApiSuccess(MessageResponseDto, 'FCM 토큰 삭제 성공')
  @ApiNotFound('토큰을 찾을 수 없음')
  deleteToken(@Request() req, @Param('token') token: string) {
    return this.notificationService.deleteToken(req.user.userId, token);
  }

  @Get('settings')
  @ApiOperation({ summary: '알림 설정 조회' })
  @ApiSuccess(NotificationSettingDto, '알림 설정 목록 반환', {
    isArray: true,
  })
  getSettings(@Request() req) {
    return this.notificationService.getSettings(req.user.userId);
  }

  @Put('settings')
  @ApiOperation({ summary: '알림 설정 업데이트' })
  @ApiSuccess(NotificationSettingDto, '알림 설정 업데이트 성공')
  updateSettings(@Request() req, @Body() dto: UpdateSettingsDto) {
    return this.notificationService.updateSettings(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '알림 목록 조회 (페이지네이션)' })
  @ApiSuccess(PaginatedNotificationsDto, '알림 목록 및 페이지네이션 정보 반환')
  getNotifications(@Request() req, @Query() query: QueryNotificationsDto) {
    return this.notificationService.getNotifications(req.user.userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '읽지 않은 알림 개수 조회' })
  @ApiSuccess(UnreadCountResponseDto, '읽지 않은 알림 개수 반환')
  getUnreadCount(@Request() req) {
    return this.notificationService.getUnreadCount(req.user.userId);
  }

  @Put(':id/read')
  @ApiOperation({ summary: '알림 읽음 처리' })
  @ApiSuccess(NotificationDto, '알림 읽음 처리 성공')
  @ApiNotFound('알림을 찾을 수 없음')
  markAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationService.markAsRead(req.user.userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '알림 삭제' })
  @ApiSuccess(MessageResponseDto, '알림 삭제 성공')
  @ApiNotFound('알림을 찾을 수 없음')
  deleteNotification(@Request() req, @Param('id') id: string) {
    return this.notificationService.deleteNotification(req.user.userId, id);
  }

  @Post('test')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '테스트 알림 전송 (운영자 전용)' })
  @ApiSuccess(MessageResponseDto, '테스트 알림 전송 성공')
  @ApiForbidden('운영자 권한 필요')
  sendTestNotification(@Request() req) {
    return this.notificationService.sendTestNotification(req.user.userId);
  }
}
