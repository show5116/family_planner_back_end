import {
  Controller,
  Post,
  Get,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { StorageService } from '@/storage/storage.service';
import { FileUploadResponseDto } from '@/storage/dto/storage-response.dto';
import { ApiCommonAuthResponses } from '@/common/decorators/api-common-responses.decorator';
import {
  ApiCreated,
  ApiBadRequest,
} from '@/common/decorators/api-responses.decorator';

/**
 * 스토리지 컨트롤러
 * 파일 업로드, 다운로드, 삭제 API
 */
@ApiTags('Storage')
@ApiBearerAuth()
@ApiCommonAuthResponses()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('editor-upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '에디터 이미지 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'type',
    description: '업로드 타입',
    enum: ['qna', 'announcements'],
    required: true,
    example: 'qna',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '업로드할 이미지 파일',
        },
      },
      required: ['file'],
    },
  })
  @ApiCreated(FileUploadResponseDto, '이미지 업로드 성공')
  @ApiBadRequest('파일이 제공되지 않음 또는 유효하지 않은 타입')
  uploadEditorImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: 'qna' | 'announcements',
  ) {
    if (!file) {
      throw new BadRequestException('파일이 필요합니다');
    }

    if (!['qna', 'announcements'].includes(type)) {
      throw new BadRequestException('유효하지 않은 타입입니다');
    }

    return this.storageService.uploadEditorImage(file, type);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: '파일 업로드',
    description: 'Cloudflare R2에 파일을 업로드합니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '업로드할 파일',
        },
        folder: {
          type: 'string',
          description: '저장할 폴더 경로 (예: avatars, documents)',
          default: 'uploads',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: '파일 업로드 성공',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'avatars/uuid-123.jpg' },
        url: {
          type: 'string',
          example: 'https://files.example.com/avatars/uuid-123.jpg',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '파일이 제공되지 않음' })
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string = 'uploads',
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.storageService.uploadFile(file, folder);
  }

  @Get('download')
  @ApiOperation({
    summary: '파일 다운로드 URL 생성',
    description: '파일 다운로드를 위한 Presigned URL을 생성합니다.',
  })
  @ApiQuery({
    name: 'key',
    description: '파일 키 (예: avatars/uuid-123.jpg)',
    required: true,
    type: String,
    example: 'avatars/uuid-123.jpg',
  })
  @ApiQuery({
    name: 'expiresIn',
    description: 'URL 유효 시간 (초)',
    required: false,
    type: Number,
    example: 3600,
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL 생성 성공',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example: 'https://...presigned-url...',
        },
      },
    },
  })
  getDownloadUrl(
    @Query('key') key: string,
    @Query('expiresIn', new ParseIntPipe({ optional: true }))
    expiresIn?: number,
  ) {
    if (!key) {
      throw new BadRequestException('File key is required');
    }
    return this.storageService.getDownloadUrl(key, expiresIn).then((url) => ({
      url,
    }));
  }

  @Delete()
  @ApiOperation({
    summary: '파일 삭제',
    description: 'R2에서 파일을 삭제합니다.',
  })
  @ApiQuery({
    name: 'key',
    description: '삭제할 파일 키',
    required: true,
    type: String,
    example: 'avatars/uuid-123.jpg',
  })
  @ApiResponse({ status: 200, description: '파일 삭제 성공' })
  deleteFile(@Query('key') key: string) {
    if (!key) {
      throw new BadRequestException('File key is required');
    }
    return this.storageService.deleteFile(key).then(() => ({
      message: 'File deleted successfully',
    }));
  }

  @Get('exists')
  @ApiOperation({
    summary: '파일 존재 여부 확인',
    description: 'R2에 파일이 존재하는지 확인합니다.',
  })
  @ApiQuery({
    name: 'key',
    description: '확인할 파일 키',
    required: true,
    type: String,
    example: 'avatars/uuid-123.jpg',
  })
  @ApiResponse({
    status: 200,
    description: '파일 존재 여부',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean' },
      },
    },
  })
  fileExists(@Query('key') key: string) {
    if (!key) {
      throw new BadRequestException('File key is required');
    }
    return this.storageService.fileExists(key).then((exists) => ({ exists }));
  }
}
