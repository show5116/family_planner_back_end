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

export type EmailContext = VerificationEmailContext | PasswordResetEmailContext;

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
