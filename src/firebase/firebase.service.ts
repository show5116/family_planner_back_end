import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK 서비스
 * FCM 푸시 알림 전송을 위한 Firebase Admin 초기화 및 관리
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App;

  constructor(private configService: ConfigService) {}

  /**
   * 모듈 초기화 시 Firebase Admin SDK 초기화
   */
  onModuleInit() {
    try {
      const projectId = this.configService.get<string>('firebase.projectId');
      const clientEmail =
        this.configService.get<string>('firebase.clientEmail');
      const privateKey = this.configService.get<string>('firebase.privateKey');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase configuration is incomplete');
      }

      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
      throw error;
    }
  }

  /**
   * Firebase Admin App 인스턴스 반환
   */
  getApp(): admin.app.App {
    return this.app;
  }

  /**
   * Firebase Messaging 인스턴스 반환
   */
  getMessaging(): admin.messaging.Messaging {
    return admin.messaging(this.app);
  }
}
