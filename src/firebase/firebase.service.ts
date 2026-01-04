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
      const clientEmail = this.configService.get<string>(
        'firebase.clientEmail',
      );
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

  /**
   * FCM 토큰을 Topic에 구독
   *
   * @param tokens - 디바이스 토큰 배열
   * @param topic - Topic 이름
   * @returns 구독 결과
   */
  async subscribeToTopic(tokens: string[], topic: string) {
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    try {
      const response = await this.getMessaging().subscribeToTopic(
        tokens,
        topic,
      );

      this.logger.log(
        `Topic subscription: ${response.successCount} success, ${response.failureCount} failures for topic "${topic}"`,
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic "${topic}"`, error);
      throw error;
    }
  }

  /**
   * FCM 토큰의 Topic 구독 해제
   *
   * @param tokens - 디바이스 토큰 배열
   * @param topic - Topic 이름
   * @returns 구독 해제 결과
   */
  async unsubscribeFromTopic(tokens: string[], topic: string) {
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    try {
      const response = await this.getMessaging().unsubscribeFromTopic(
        tokens,
        topic,
      );

      this.logger.log(
        `Topic unsubscription: ${response.successCount} success, ${response.failureCount} failures for topic "${topic}"`,
      );

      return response;
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic "${topic}"`, error);
      throw error;
    }
  }

  /**
   * Topic으로 메시지 전송
   *
   * @param topic - Topic 이름
   * @param notification - 알림 메시지
   * @param data - 추가 데이터
   * @returns 전송 결과
   */
  async sendToTopic(
    topic: string,
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ) {
    try {
      const message = {
        topic,
        notification,
        data: data || {},
      };

      const response = await this.getMessaging().send(message);

      this.logger.log(`Message sent to topic "${topic}": ${response}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to send message to topic "${topic}"`, error);
      throw error;
    }
  }
}
