import { EmailTemplate } from './email.constants';

interface BaseEmailContext {
  headerColor: string;
  headerSubtitle: string;
  codeBoxBg: string;
  codeBoxBorder: string;
  codeColor: string;
  footerText1: string;
  footerText2: string;
}

export interface VerificationEmailContext extends BaseEmailContext {
  userName: string;
  code: string;
  greeting: string;
  body1: string;
  body2: string;
  codeLabel: string;
  body3: string;
  warningLabel: string;
  warningText: string;
}

export interface PasswordResetEmailContext extends BaseEmailContext {
  userName: string;
  code: string;
  greeting: string;
  body1: string;
  body2: string;
  codeLabel: string;
  body3: string;
  warningLabel: string;
  warningText: string;
  securityLabel: string;
  securityText: string;
}

export interface GroupInviteEmailContext extends BaseEmailContext {
  groupName: string;
  inviterName: string;
  inviteCode: string;
  title: string;
  body1: string;
  invitedGroupLabel: string;
  body2: string;
  codeLabel: string;
  howToJoinLabel: string;
  step1: string;
  step2: string;
  step3: string;
  expiryText: string;
}

export type EmailContext =
  | VerificationEmailContext
  | PasswordResetEmailContext
  | GroupInviteEmailContext;

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: EmailTemplate;
  context: EmailContext;
}

declare module 'nodemailer/lib/mailer' {
  interface Options {
    template?: string;
    context?: Record<string, any>;
  }
}
