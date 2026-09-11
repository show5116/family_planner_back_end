import { registerAs } from '@nestjs/config';

export default registerAs('r2', () => ({
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME,
  // 일기 미디어·영수증처럼 공개되면 안 되는 파일용 (공개 개발 URL이 꺼진 버킷).
  // 설정이 없으면 기존 버킷을 그대로 쓴다 — 배포 순서에 걸리지 않게.
  privateBucketName:
    process.env.R2_PRIVATE_BUCKET_NAME || process.env.R2_BUCKET_NAME,
  publicUrl: process.env.R2_PUBLIC_URL,
}));
