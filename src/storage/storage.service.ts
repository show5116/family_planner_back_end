import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { ImageOptimizerService } from '@/storage/image-optimizer.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl?: string;

  constructor(
    private configService: ConfigService,
    private imageOptimizer: ImageOptimizerService,
  ) {
    const accountId = this.configService.get<string>('r2.accountId');
    const accessKeyId = this.configService.get<string>('r2.accessKeyId');
    const secretAccessKey =
      this.configService.get<string>('r2.secretAccessKey');
    this.bucketName = this.configService.get<string>('r2.bucketName');
    this.publicUrl = this.configService.get<string>('r2.publicUrl');

    // Cloudflare R2는 S3 호환 API 사용
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log('StorageService initialized with Cloudflare R2');
  }

  /**
   * 파일 업로드
   * @param file - 업로드할 파일 (Buffer 또는 Multer 파일)
   * @param folder - 저장할 폴더 경로 (예: 'avatars', 'documents')
   * @param filename - 파일명 (제공하지 않으면 UUID 생성)
   * @returns 업로드된 파일의 키(key)와 URL
   */
  async uploadFile(
    file: Express.Multer.File | Buffer,
    folder: string,
    filename?: string,
  ): Promise<{ key: string; url: string }> {
    const isBuffer = Buffer.isBuffer(file);
    const buffer = isBuffer ? file : file.buffer;
    const originalName = isBuffer ? filename : file.originalname;
    const mimeType = isBuffer ? undefined : file.mimetype;

    // 파일명 생성: UUID + 원본 확장자
    const ext = originalName?.split('.').pop() || '';
    const key = `${folder}/${filename || randomUUID()}${ext ? `.${ext}` : ''}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      const url = this.getPublicUrl(key);
      this.logger.log(`File uploaded: ${key}`);

      return { key, url };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 이미지 업로드 (최적화 포함)
   * @param file - 업로드할 이미지 파일
   * @param folder - 저장할 폴더 경로
   * @param filename - 파일명 (제공하지 않으면 UUID 생성)
   * @returns 업로드된 파일의 키(key)와 URL
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
    filename?: string,
  ): Promise<{ key: string; url: string }> {
    try {
      // 이미지 유효성 검증
      const isValid = await this.imageOptimizer.validateImage(file.buffer);
      if (!isValid) {
        throw new Error('Invalid image file');
      }

      // 이미지 최적화
      const optimizedBuffer = await this.imageOptimizer.optimizeProfileImage(
        file.buffer,
      );

      // 파일명 생성: UUID + .jpg (최적화된 이미지는 항상 JPEG)
      const key = `${folder}/${filename || randomUUID()}.jpg`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: optimizedBuffer,
          ContentType: 'image/jpeg',
        }),
      );

      const url = this.getPublicUrl(key);
      this.logger.log(`Image uploaded and optimized: ${key}`);

      return { key, url };
    } catch (error) {
      this.logger.error(
        `Failed to upload image: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * URL에서 이미지 다운로드 후 최적화하여 업로드
   * @param imageUrl - 다운로드할 이미지 URL
   * @param folder - 저장할 폴더 경로
   * @param filename - 파일명 (제공하지 않으면 UUID 생성)
   * @returns 업로드된 파일의 키(key)와 URL
   */
  async uploadImageFromUrl(
    imageUrl: string,
    folder: string,
    filename?: string,
  ): Promise<{ key: string; url: string }> {
    try {
      // URL에서 이미지 다운로드
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to download image from URL: ${response.statusText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 이미지 유효성 검증
      const isValid = await this.imageOptimizer.validateImage(buffer);
      if (!isValid) {
        throw new Error('Downloaded file is not a valid image');
      }

      // 이미지 최적화
      const optimizedBuffer =
        await this.imageOptimizer.optimizeProfileImage(buffer);

      // 파일명 생성: UUID + .jpg
      const key = `${folder}/${filename || randomUUID()}.jpg`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: optimizedBuffer,
          ContentType: 'image/jpeg',
        }),
      );

      const url = this.getPublicUrl(key);
      this.logger.log(`Image downloaded from URL and uploaded: ${key}`);

      return { key, url };
    } catch (error) {
      this.logger.error(
        `Failed to upload image from URL: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 파일 다운로드 (Presigned URL 생성)
   * @param key - 파일 키
   * @param expiresIn - URL 유효 시간 (초, 기본 1시간)
   * @returns Presigned URL
   */
  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      this.logger.log(`Generated download URL for: ${key}`);

      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate download URL: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 파일 삭제
   * @param key - 삭제할 파일 키
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 파일 존재 여부 확인
   * @param key - 확인할 파일 키
   * @returns 파일 존재 여부
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Public URL 생성
   * @param key - 파일 키
   * @returns Public URL (Custom domain 또는 R2 기본 URL)
   */
  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    // Custom domain이 없으면 R2 기본 URL 사용
    // 주의: R2 버킷은 기본적으로 private이므로 public access 설정 필요
    const accountId = this.configService.get<string>('r2.accountId');
    return `https://${accountId}.r2.cloudflarestorage.com/${this.bucketName}/${key}`;
  }
}
