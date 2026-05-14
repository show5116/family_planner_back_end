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
import { FridgeService } from './fridge.service';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiCreated,
  ApiForbidden,
  ApiNotFound,
  ApiSuccess,
} from '@/common/decorators/api-responses.decorator';
import { MessageResponseDto } from '@/task/dto/common-response.dto';
import { CreateStorageDto } from './dto/create-storage.dto';
import { UpdateStorageDto } from './dto/update-storage.dto';
import { ReorderDto } from './dto/reorder.dto';
import { CreateFridgeItemDto } from './dto/create-fridge-item.dto';
import { UpdateFridgeItemDto } from './dto/update-fridge-item.dto';
import { UpdateQuantityDto } from './dto/update-quantity.dto';
import { CreateFrequentItemDto } from './dto/create-frequent-item.dto';
import { UpdateFrequentItemDto } from './dto/update-frequent-item.dto';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CompleteShoppingDto } from './dto/complete-shopping.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import {
  CartItemDto,
  FridgeItemDto,
  FrequentItemDto,
  PaginatedHistoryDto,
  ShoppingCartDto,
  ShoppingHistoryDto,
  StorageLocationDto,
} from './dto/fridge-response.dto';

@ApiTags('냉장고 & 장보기')
@Controller('fridge')
@ApiCommonAuthResponses()
export class FridgeController {
  constructor(private readonly fridgeService: FridgeService) {}

  // ── StorageLocation ──────────────────────────────────────────

  @Get('storages')
  @ApiOperation({ summary: '보관소 목록 조회' })
  @ApiSuccess(StorageLocationDto, '보관소 목록 조회 성공', { isArray: true })
  getStorages(@Request() req, @Query('groupId') groupId: string) {
    return this.fridgeService.getStorages(req.user.userId, groupId);
  }

  @Post('storages')
  @ApiOperation({ summary: '보관소 생성' })
  @ApiCreated(StorageLocationDto, '보관소 생성 성공')
  createStorage(@Request() req, @Body() dto: CreateStorageDto) {
    return this.fridgeService.createStorage(req.user.userId, dto.groupId, dto);
  }

  @Patch('storages/reorder')
  @ApiOperation({ summary: '보관소 순서 변경' })
  @ApiSuccess(StorageLocationDto, '순서 변경 성공', { isArray: true })
  reorderStorages(@Request() req, @Body() dto: ReorderDto) {
    return this.fridgeService.reorderStorages(
      req.user.userId,
      dto.groupId,
      dto,
    );
  }

  @Patch('storages/:storageId')
  @ApiOperation({ summary: '보관소 수정' })
  @ApiSuccess(StorageLocationDto, '보관소 수정 성공')
  @ApiNotFound('보관소를 찾을 수 없습니다')
  updateStorage(
    @Request() req,
    @Query('groupId') groupId: string,
    @Param('storageId') storageId: string,
    @Body() dto: UpdateStorageDto,
  ) {
    return this.fridgeService.updateStorage(
      req.user.userId,
      groupId,
      storageId,
      dto,
    );
  }

  @Delete('storages/:storageId')
  @ApiOperation({ summary: '보관소 삭제' })
  @ApiSuccess(MessageResponseDto, '보관소 삭제 성공')
  @ApiNotFound('보관소를 찾을 수 없습니다')
  deleteStorage(
    @Request() req,
    @Query('groupId') groupId: string,
    @Param('storageId') storageId: string,
  ) {
    return this.fridgeService.deleteStorage(
      req.user.userId,
      groupId,
      storageId,
    );
  }

  // ── FridgeItem ───────────────────────────────────────────────

  @Get('items')
  @ApiOperation({ summary: '냉장고 전체 품목 조회 (보관소별)' })
  @ApiSuccess(StorageLocationDto, '조회 성공', { isArray: true })
  getFridgeItems(@Request() req, @Query('groupId') groupId: string) {
    return this.fridgeService.getFridgeItems(req.user.userId, groupId);
  }

  @Post('items')
  @ApiOperation({ summary: '냉장고 품목 등록' })
  @ApiCreated(FridgeItemDto, '품목 등록 성공')
  @ApiNotFound('보관소를 찾을 수 없습니다')
  createFridgeItem(@Request() req, @Body() dto: CreateFridgeItemDto) {
    return this.fridgeService.createFridgeItem(
      req.user.userId,
      dto.groupId,
      dto,
    );
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: '냉장고 품목 수정' })
  @ApiSuccess(FridgeItemDto, '품목 수정 성공')
  @ApiNotFound('품목을 찾을 수 없습니다')
  updateFridgeItem(
    @Request() req,
    @Query('groupId') groupId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateFridgeItemDto,
  ) {
    return this.fridgeService.updateFridgeItem(
      req.user.userId,
      groupId,
      itemId,
      dto,
    );
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: '냉장고 품목 삭제' })
  @ApiSuccess(MessageResponseDto, '품목 삭제 성공')
  @ApiNotFound('품목을 찾을 수 없습니다')
  deleteFridgeItem(
    @Request() req,
    @Query('groupId') groupId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.fridgeService.deleteFridgeItem(
      req.user.userId,
      groupId,
      itemId,
    );
  }

  @Patch('items/:itemId/quantity')
  @ApiOperation({ summary: '냉장고 품목 수량 변경 (소진 시 자동 카트 등재)' })
  @ApiSuccess(FridgeItemDto, '수량 변경 성공')
  @ApiNotFound('품목을 찾을 수 없습니다')
  updateQuantity(
    @Request() req,
    @Query('groupId') groupId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateQuantityDto,
  ) {
    return this.fridgeService.updateQuantity(
      req.user.userId,
      groupId,
      itemId,
      dto,
    );
  }

  // ── FrequentItem ─────────────────────────────────────────────

  @Get('frequent-items')
  @ApiOperation({ summary: '자주 사는 항목 목록 조회' })
  @ApiSuccess(FrequentItemDto, '조회 성공', { isArray: true })
  getFrequentItems(@Request() req, @Query('groupId') groupId: string) {
    return this.fridgeService.getFrequentItems(req.user.userId, groupId);
  }

  @Post('frequent-items')
  @ApiOperation({ summary: '자주 사는 항목 생성' })
  @ApiCreated(FrequentItemDto, '생성 성공')
  createFrequentItem(@Request() req, @Body() dto: CreateFrequentItemDto) {
    return this.fridgeService.createFrequentItem(
      req.user.userId,
      dto.groupId,
      dto,
    );
  }

  @Patch('frequent-items/reorder')
  @ApiOperation({ summary: '자주 사는 항목 순서 변경' })
  @ApiSuccess(FrequentItemDto, '순서 변경 성공', { isArray: true })
  reorderFrequentItems(@Request() req, @Body() dto: ReorderDto) {
    return this.fridgeService.reorderFrequentItems(
      req.user.userId,
      dto.groupId,
      dto,
    );
  }

  @Patch('frequent-items/:itemId')
  @ApiOperation({ summary: '자주 사는 항목 수정 (autoAdd 토글 포함)' })
  @ApiSuccess(FrequentItemDto, '수정 성공')
  @ApiNotFound('자주 사는 항목을 찾을 수 없습니다')
  updateFrequentItem(
    @Request() req,
    @Query('groupId') groupId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateFrequentItemDto,
  ) {
    return this.fridgeService.updateFrequentItem(
      req.user.userId,
      groupId,
      itemId,
      dto,
    );
  }

  @Delete('frequent-items/:itemId')
  @ApiOperation({ summary: '자주 사는 항목 삭제' })
  @ApiSuccess(MessageResponseDto, '삭제 성공')
  @ApiNotFound('자주 사는 항목을 찾을 수 없습니다')
  deleteFrequentItem(
    @Request() req,
    @Query('groupId') groupId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.fridgeService.deleteFrequentItem(
      req.user.userId,
      groupId,
      itemId,
    );
  }

  // ── ShoppingCart ─────────────────────────────────────────────

  @Get('cart')
  @ApiOperation({ summary: '활성 장바구니 조회' })
  @ApiSuccess(ShoppingCartDto, '장바구니 조회 성공')
  getCart(@Request() req, @Query('groupId') groupId: string) {
    return this.fridgeService.getCart(req.user.userId, groupId);
  }

  @Post('cart/items')
  @ApiOperation({ summary: '장바구니 품목 추가' })
  @ApiCreated(CartItemDto, '품목 추가 성공')
  addCartItem(@Request() req, @Body() dto: AddCartItemDto) {
    return this.fridgeService.addCartItem(req.user.userId, dto.groupId, dto);
  }

  @Patch('cart/items/:itemId')
  @ApiOperation({ summary: '장바구니 품목 수정 (수량, 체크 등)' })
  @ApiSuccess(CartItemDto, '품목 수정 성공')
  @ApiNotFound('품목을 찾을 수 없습니다')
  updateCartItem(
    @Request() req,
    @Query('groupId') groupId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.fridgeService.updateCartItem(
      req.user.userId,
      groupId,
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
    @Query('groupId') groupId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.fridgeService.removeCartItem(req.user.userId, groupId, itemId);
  }

  @Post('cart/complete')
  @ApiOperation({ summary: '장보기 완료 — 이력 저장 및 냉장고 이관' })
  @ApiCreated(ShoppingHistoryDto, '장보기 완료 성공')
  @ApiNotFound('장바구니가 비어 있습니다')
  @ApiForbidden('그룹 멤버만 접근할 수 있습니다')
  completeShopping(@Request() req, @Body() dto: CompleteShoppingDto) {
    return this.fridgeService.completeShopping(
      req.user.userId,
      dto.groupId,
      dto,
    );
  }

  // ── ShoppingHistory ──────────────────────────────────────────

  @Get('shopping-history')
  @ApiOperation({ summary: '구매 이력 목록 조회 (페이지네이션)' })
  @ApiSuccess(PaginatedHistoryDto, '이력 조회 성공')
  getHistories(@Request() req, @Query() query: HistoryQueryDto) {
    return this.fridgeService.getHistories(
      req.user.userId,
      query.groupId,
      query,
    );
  }

  @Get('shopping-history/:historyId')
  @ApiOperation({ summary: '구매 이력 상세 조회' })
  @ApiSuccess(ShoppingHistoryDto, '이력 상세 조회 성공')
  @ApiNotFound('구매 이력을 찾을 수 없습니다')
  getHistory(
    @Request() req,
    @Query('groupId') groupId: string,
    @Param('historyId') historyId: string,
  ) {
    return this.fridgeService.getHistory(req.user.userId, groupId, historyId);
  }
}
