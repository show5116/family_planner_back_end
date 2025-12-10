import { Module } from '@nestjs/common';
import { StorageService } from '@/storage/storage.service';
import { StorageController } from '@/storage/storage.controller';

@Module({
  providers: [StorageService],
  controllers: [StorageController],
  exports: [StorageService], // 다른 모듈에서 사용 가능하도록 export
})
export class StorageModule {}
