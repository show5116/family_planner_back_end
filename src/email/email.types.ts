import { EmailTemplate } from './email.constants';

/**
 * 이메일 템플릿 컨텍스트 기본 타입
 */
interface BaseEmailContext {
  headerColor: string;
  headerSubtitle: string;
  codeBoxBg: string;
  codeBoxBorder: string;
  codeColor: string;
  footerText1: string;
  footerText2: string;
}

/**
 * 인증 이메일 컨텍스트
 */
export interface VerificationEmailContext extends BaseEmailContext {
  userName: string;
  code: string;
}

/**
 * 비밀번호 재설정 이메일 컨텍스트
 */
export interface PasswordResetEmailContext extends BaseEmailContext {
  userName: string;
  code: string;
}

/**
 * 그룹 초대 이메일 컨텍스트
 */
export interface GroupInviteEmailContext extends BaseEmailContext {
  groupName: string;
  inviterName: string;
  inviteCode: string;
}

/**
 * 이메일 컨텍스트 유니온 타입
 */
export type EmailContext =
  | VerificationEmailContext
  | PasswordResetEmailContext
  | GroupInviteEmailContext;

/**
 * 이메일 발송 옵션
 */
export interface SendEmailOptions {
  to: string;
  subject: string;
  template: EmailTemplate;
  context: EmailContext;
}

/**
 * nodemailer-express-handlebars 타입 확장
 */
declare module 'nodemailer/lib/mailer' {
  interface Options {
    template?: string;
    context?: Record<string, any>;
  }
}
