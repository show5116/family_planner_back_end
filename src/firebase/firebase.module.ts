import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseService } from './firebase.service';
import firebaseConfig from './firebase.config';

/**
 * Firebase 모듈
 * Global 모듈로 설정하여 전체 애플리케이션에서 사용 가능
 */
@Global()
@Module({
  imports: [ConfigModule.forFeature(firebaseConfig)],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
