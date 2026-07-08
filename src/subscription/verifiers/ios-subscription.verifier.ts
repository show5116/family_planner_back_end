import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  Environment,
  SignedDataVerifier,
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library';
import { SubscriptionPlatform, SubscriptionStatus } from '@prisma/client';
import { resolveTierByProductId } from '../subscription-product.map';
import {
  SubscriptionVerifier,
  VerifiedPurchase,
} from './subscription-verifier.interface';

const APPLE_ROOT_CA_DIR = path.join(
  process.cwd(),
  'assets',
  'apple-root-certs',
);

@Injectable()
export class IosSubscriptionVerifier implements SubscriptionVerifier {
  private readonly logger = new Logger(IosSubscriptionVerifier.name);
  private verifier: SignedDataVerifier;

  constructor(private readonly configService: ConfigService) {}

  getVerifier(): SignedDataVerifier {
    if (this.verifier) return this.verifier;

    const bundleId = this.configService.get<string>('iap.ios.bundleId');
    const environment =
      this.configService.get<string>('iap.ios.environment') === 'Sandbox'
        ? Environment.SANDBOX
        : Environment.PRODUCTION;

    const rootCertificates = fs
      .readdirSync(APPLE_ROOT_CA_DIR)
      .filter((f) => f.endsWith('.cer'))
      .map((f) => fs.readFileSync(path.join(APPLE_ROOT_CA_DIR, f)));

    this.verifier = new SignedDataVerifier(
      rootCertificates,
      true,
      environment,
      bundleId,
    );
    return this.verifier;
  }

  async verify(signedTransaction: string): Promise<VerifiedPurchase> {
    let payload: JWSTransactionDecodedPayload;
    try {
      payload =
        await this.getVerifier().verifyAndDecodeTransaction(signedTransaction);
    } catch (error) {
      this.logger.warn(`iOS 구독 검증 실패: ${error.message}`);
      throw new UnprocessableEntityException(
        'subscription.errors.verification_failed',
      );
    }

    return this.toVerifiedPurchase(payload);
  }

  /**
   * App Store Server Notifications V2의 signedPayload를 검증/디코딩한다.
   */
  async verifyAndDecodeNotification(
    signedPayload: string,
  ): Promise<ResponseBodyV2DecodedPayload> {
    return this.getVerifier().verifyAndDecodeNotification(signedPayload);
  }

  toVerifiedPurchase(payload: JWSTransactionDecodedPayload): VerifiedPurchase {
    if (!payload.originalTransactionId || !payload.productId) {
      throw new UnprocessableEntityException(
        'subscription.errors.verification_failed',
      );
    }

    const status = this.resolveStatus(payload);

    return {
      platform: SubscriptionPlatform.IOS,
      productId: payload.productId,
      originalTransactionId: payload.originalTransactionId,
      latestTransactionId: payload.transactionId,
      tier: resolveTierByProductId(payload.productId),
      expiresAt: payload.expiresDate ? new Date(payload.expiresDate) : null,
      autoRenewing: status === SubscriptionStatus.active,
      status,
    };
  }

  private resolveStatus(
    payload: JWSTransactionDecodedPayload,
  ): SubscriptionStatus {
    if (payload.revocationDate) return SubscriptionStatus.revoked;
    if (payload.expiresDate && payload.expiresDate < Date.now()) {
      return SubscriptionStatus.expired;
    }
    return SubscriptionStatus.active;
  }
}
