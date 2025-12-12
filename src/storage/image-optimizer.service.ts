import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

@Injectable()
export class ImageOptimizerService {
  private readonly logger = new Logger(ImageOptimizerService.name);

  /**
   * 이미지 최적화
   * @param buffer - 원본 이미지 버퍼
   * @param options - 최적화 옵션
   * @returns 최적화된 이미지 버퍼
   */
  async optimizeImage(
    buffer: Buffer,
    options: ImageOptimizationOptions = {},
  ): Promise<Buffer> {
    const {
      width = 300,
      height = 300,
      quality = 80,
      format = 'jpeg',
    } = options;

    try {
      const optimized = await sharp(buffer)
        .resize(width, height, {
          fit: 'cover', // 비율 유지하며 크롭
          position: 'center',
        })
        .toFormat(format, { quality })
        .toBuffer();

      this.logger.log(
        `Image optimized: ${buffer.length} bytes -> ${optimized.length} bytes (${Math.round((1 - optimized.length / buffer.length) * 100)}% reduction)`,
      );

      return optimized;
    } catch (error) {
      this.logger.error(`Failed to optimize image: ${error.message}`);
      throw error;
    }
  }

  /**
   * 프로필 이미지 최적화 (300x300px, JPEG)
   * @param buffer - 원본 이미지 버퍼
   * @returns 최적화된 이미지 버퍼
   */
  async optimizeProfileImage(buffer: Buffer): Promise<Buffer> {
    return this.optimizeImage(buffer, {
      width: 300,
      height: 300,
      quality: 80,
      format: 'jpeg',
    });
  }

  /**
   * 이미지 메타데이터 추출
   * @param buffer - 이미지 버퍼
   * @returns 이미지 메타데이터
   */
  async getImageMetadata(buffer: Buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
      };
    } catch (error) {
      this.logger.error(`Failed to get image metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * 이미지 유효성 검증
   * @param buffer - 이미지 버퍼
   * @returns 유효한 이미지인지 여부
   */
  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      await sharp(buffer).metadata();
      return true;
    } catch (error) {
      this.logger.warn(`Invalid image: ${error.message}`);
      return false;
    }
  }
}
