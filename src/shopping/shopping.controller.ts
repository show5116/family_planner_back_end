import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShoppingService } from './shopping.service';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiCreated,
  ApiForbidden,
  ApiNotFound,
  ApiSuccess,
} from '@/common/decorators/api-responses.decorator';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { SyncCartItemsDto } from './dto/sync-cart-items.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CompleteShoppingDto } from './dto/complete-shopping.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { GroupIdQueryDto } from './dto/group-id-query.dto';
import {
  CartItemDto,
  PaginatedHistoryDto,
  ShoppingCartDto,
  ShoppingHistoryDto,
} from './dto/shopping-response.dto';

@ApiTags('스마트 장보기')
@Controller('shopping')
@ApiCommonAuthResponses()
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  // ── ShoppingCart ─────────────────────────────────────────────

  @Get('cart')
  @ApiOperation({ summary: '활성 장바구니 조회' })
  @ApiSuccess(ShoppingCartDto, '장바구니 조회 성공')
  getCart(@Request() req, @Query() query: GroupIdQueryDto) {
    return this.shoppingService.getCart(req.user.userId, query.groupId);
  }

  @Patch('cart/items/bulk')
  @ApiOperation({ summary: '장바구니 품목 일괄 동기화 (추가/수정/삭제)' })
  @ApiSuccess(ShoppingCartDto, '일괄 동기화 성공')
  syncCartItems(@Request() req, @Body() dto: SyncCartItemsDto) {
    return this.shoppingService.syncCartItems(
      req.user.userId,
      dto.groupId,
      dto,
    );
  }

  @Patch('cart/items/:itemId')
  @ApiOperation({ summary: '장바구니 품목 수정 (수량, 체크 등)' })
  @ApiSuccess(CartItemDto, '품목 수정 성공')
  @ApiNotFound('품목을 찾을 수 없습니다')
  updateCartItem(
    @Request() req,
    @Query() query: GroupIdQueryDto,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.shoppingService.updateCartItem(
      req.user.userId,
      query.groupId,
      itemId,
      dto,
    );
  }

  @Delete('cart/items/:itemId')
  @ApiOperation({ summary: '장바구니 품목 삭제' })
  @ApiSuccess(MessageResponseDto, '품목 삭제 성공')
  @ApiNotFound('품목을 찾을 수 없습니다')
  removeCartItem(
    @Request() req,
    @Query() query: GroupIdQueryDto,
    @Param('itemId') itemId: string,
  ) {
    return this.shoppingService.removeCartItem(
      req.user.userId,
      query.groupId,
      itemId,
    );
  }

  @Post('cart/complete')
  @ApiOperation({ summary: '장보기 완료 — 이력 저장 및 냉장고 이관' })
  @ApiCreated(ShoppingHistoryDto, '장보기 완료 성공')
  @ApiNotFound('장바구니가 비어 있습니다')
  @ApiForbidden('그룹 멤버만 접근할 수 있습니다')
  completeShopping(@Request() req, @Body() dto: CompleteShoppingDto) {
    return this.shoppingService.completeShopping(
      req.user.userId,
      dto.groupId,
      dto,
    );
  }

  // ── ShoppingHistory ──────────────────────────────────────────

  @Get('history')
  @ApiOperation({ summary: '구매 이력 목록 조회 (페이지네이션)' })
  @ApiSuccess(PaginatedHistoryDto, '이력 조회 성공')
  getHistories(@Request() req, @Query() query: HistoryQueryDto) {
    return this.shoppingService.getHistories(
      req.user.userId,
      query.groupId,
      query,
    );
  }

  @Get('history/:historyId')
  @ApiOperation({ summary: '구매 이력 상세 조회' })
  @ApiSuccess(ShoppingHistoryDto, '이력 상세 조회 성공')
  @ApiNotFound('구매 이력을 찾을 수 없습니다')
  getHistory(
    @Request() req,
    @Query() query: GroupIdQueryDto,
    @Param('historyId') historyId: string,
  ) {
    return this.shoppingService.getHistory(
      req.user.userId,
      query.groupId,
      historyId,
    );
  }

  @Delete('history/:historyId')
  @ApiOperation({ summary: '구매 이력 삭제 (오입력 정정용)' })
  @ApiSuccess(MessageResponseDto, '이력 삭제 성공')
  @ApiNotFound('구매 이력을 찾을 수 없습니다')
  deleteHistory(
    @Request() req,
    @Query() query: GroupIdQueryDto,
    @Param('historyId') historyId: string,
  ) {
    return this.shoppingService.deleteHistory(
      req.user.userId,
      query.groupId,
      historyId,
    );
  }
}
