import { config } from 'dotenv';
import { resolve } from 'path';

// E2E 테스트용 환경 변수 로드
// .env.test 파일이 있으면 로드, 없으면 .env 사용
const envPath = resolve(process.cwd(), '.env.test');
config({ path: envPath });

// 환경 변수가 로드되지 않았으면 기본 .env 로드
if (!process.env.DATABASE_URL) {
  config();
}

// 테스트 환경 확인
console.log('🧪 E2E Test Environment:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'test'}`);
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@') || 'NOT SET'}`);
console.log('');
