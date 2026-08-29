import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

describe('WebhookController', () => {
  let controller: WebhookController;

  const mockWebhookService = {
    handleGoogleWebhook: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: WebhookService, useValue: mockWebhookService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    jest.resetAllMocks();
  });

  describe('handleGoogleWebhook (토큰 검증)', () => {
    const body = { message: { data: 'payload' } };

    it('GOOGLE_WEBHOOK_SECRET이 설정되지 않았으면 토큰 없이도 통과 (하위 호환)', () => {
      mockConfigService.get.mockReturnValue(undefined);

      void controller.handleGoogleWebhook(body, undefined);

      expect(mockWebhookService.handleGoogleWebhook).toHaveBeenCalledWith(body);
    });

    it('토큰이 일치하면 통과', () => {
      mockConfigService.get.mockReturnValue('secret-value');

      void controller.handleGoogleWebhook(body, 'secret-value');

      expect(mockWebhookService.handleGoogleWebhook).toHaveBeenCalledWith(body);
    });

    it('토큰이 없으면 401을 던지고 서비스는 호출되지 않음', () => {
      mockConfigService.get.mockReturnValue('secret-value');

      expect(() => controller.handleGoogleWebhook(body, undefined)).toThrow(
        UnauthorizedException,
      );
      expect(mockWebhookService.handleGoogleWebhook).not.toHaveBeenCalled();
    });

    it('토큰이 불일치하면 401을 던지고 서비스는 호출되지 않음', () => {
      mockConfigService.get.mockReturnValue('secret-value');

      expect(() => controller.handleGoogleWebhook(body, 'wrong-value')).toThrow(
        UnauthorizedException,
      );
      expect(mockWebhookService.handleGoogleWebhook).not.toHaveBeenCalled();
    });

    it('길이가 다른 토큰도 401 (timingSafeEqual 길이 불일치 처리 확인)', () => {
      mockConfigService.get.mockReturnValue('secret-value');

      expect(() => controller.handleGoogleWebhook(body, 'short')).toThrow(
        UnauthorizedException,
      );
    });
  });
});
