import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CategoryService } from './category.service';
import { RecurringService } from './recurring.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryDto,
  CreateTaskDto,
  UpdateTaskDto,
  QueryTasksDto,
  CompleteTaskDto,
  SkipRecurringDto,
  TaskDto,
  TaskDetailDto,
  PaginatedTaskDto,
  RecurringDto,
  TaskSkipDto,
  MessageResponseDto,
} from './dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiSuccess,
  ApiCreated,
  ApiNotFound,
  ApiForbidden,
} from '@/common/decorators/api-responses.decorator';

/**
 * Task 관리 컨트롤러
 * 카테고리, Task CRUD, 반복 일정 관리
 */
@ApiTags('일정 및 할일')
@Controller('tasks')
@ApiCommonAuthResponses()
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly categoryService: CategoryService,
    private readonly recurringService: RecurringService,
  ) {}

  // ==================== 카테고리 API ====================

  @Get('categories')
  @ApiOperation({ summary: '카테고리 목록 조회' })
  @ApiSuccess(CategoryDto, '카테고리 목록 조회 성공', { isArray: true })
  getCategories(@Request() req, @Query('groupId') groupId?: string) {
    return this.categoryService.getCategories(req.user.userId, groupId);
  }

  @Post('categories')
  @ApiOperation({ summary: '카테고리 생성' })
  @ApiCreated(CategoryDto, '카테고리 생성 성공')
  createCategory(@Request() req, @Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(req.user.userId, dto);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: '카테고리 수정' })
  @ApiSuccess(CategoryDto, '카테고리 수정 성공')
  @ApiNotFound('카테고리를 찾을 수 없음')
  @ApiForbidden('본인 작성 카테고리만 수정 가능')
  updateCategory(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.updateCategory(req.user.userId, id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: '카테고리 삭제' })
  @ApiSuccess(MessageResponseDto, '카테고리 삭제 성공')
  @ApiNotFound('카테고리를 찾을 수 없음')
  @ApiForbidden('연결된 Task가 있으면 삭제 불가')
  deleteCategory(@Param('id') id: string, @Request() req) {
    return this.categoryService.deleteCategory(req.user.userId, id);
  }

  // ==================== Task API ====================

  @Get()
  @ApiOperation({ summary: 'Task 목록 조회 (캘린더/할일 뷰)' })
  @ApiSuccess(PaginatedTaskDto, 'Task 목록 조회 성공')
  getTasks(@Request() req, @Query() query: QueryTasksDto) {
    return this.taskService.getTasks(req.user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Task 상세 조회' })
  @ApiSuccess(TaskDetailDto, 'Task 상세 조회 성공')
  @ApiNotFound('Task를 찾을 수 없음')
  @ApiForbidden('그룹 Task는 그룹 멤버만 조회 가능')
  getTaskById(@Param('id') id: string, @Request() req) {
    return this.taskService.getTaskById(req.user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Task 생성' })
  @ApiCreated(TaskDto, 'Task 생성 성공')
  createTask(@Request() req, @Body() dto: CreateTaskDto) {
    return this.taskService.createTask(req.user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Task 수정' })
  @ApiSuccess(TaskDto, 'Task 수정 성공')
  @ApiNotFound('Task를 찾을 수 없음')
  @ApiForbidden('본인 작성 Task만 수정 가능')
  updateTask(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateTaskDto,
    @Query('updateScope') updateScope?: 'current' | 'future',
  ) {
    return this.taskService.updateTask(req.user.userId, id, dto, updateScope);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Task 완료/미완료 처리' })
  @ApiSuccess(TaskDto, 'Task 완료 처리 성공')
  @ApiNotFound('Task를 찾을 수 없음')
  completeTask(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.taskService.completeTask(req.user.userId, id, dto.isCompleted);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Task 삭제' })
  @ApiSuccess(MessageResponseDto, 'Task 삭제 성공')
  @ApiNotFound('Task를 찾을 수 없음')
  @ApiForbidden('본인 작성 Task만 삭제 가능')
  deleteTask(
    @Param('id') id: string,
    @Request() req,
    @Query('deleteScope') deleteScope?: 'current' | 'future' | 'all',
  ) {
    return this.taskService.deleteTask(req.user.userId, id, deleteScope);
  }

  // ==================== 반복 일정 API ====================

  @Patch('recurrings/:id/pause')
  @ApiOperation({ summary: '반복 일정 일시정지/재개' })
  @ApiSuccess(RecurringDto, '반복 일정 상태 변경 성공')
  @ApiNotFound('반복 규칙을 찾을 수 없음')
  @ApiForbidden('본인 작성 반복 규칙만 변경 가능')
  pauseRecurring(@Param('id') id: string, @Request() req) {
    return this.recurringService.pauseRecurring(req.user.userId, id);
  }

  @Post('recurrings/:id/skip')
  @ApiOperation({ summary: '반복 일정 건너뛰기' })
  @ApiCreated(TaskSkipDto, '반복 일정 건너뛰기 성공')
  @ApiNotFound('반복 규칙을 찾을 수 없음')
  @ApiForbidden('본인 작성 반복 규칙만 건너뛰기 가능')
  skipRecurring(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: SkipRecurringDto,
  ) {
    return this.recurringService.skipRecurring(req.user.userId, id, dto);
  }
}
