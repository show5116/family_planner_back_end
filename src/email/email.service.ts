import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import { NodemailerExpressHandlebarsOptions } from 'nodemailer-express-handlebars';
import * as path from 'path';
import {
  EmailTemplate,
  EMAIL_THEME_COLORS,
  EMAIL_MESSAGES,
} from './email.constants';
import {
  SendEmailOptions,
  VerificationEmailContext,
  PasswordResetEmailContext,
  GroupInviteEmailContext,
} from './email.types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly smtpFrom: string;

  constructor(private readonly configService: ConfigService) {
    const smtpConfig = {
      host: this.configService.get<string>('smtp.host'),
      port: this.configService.get<number>('smtp.port'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('smtp.user'),
        pass: this.configService.get<string>('smtp.password'),
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
    this.smtpFrom = this.configService.get<string>('smtp.from');

    // Handlebars 템플릿 엔진 설정
    const templatesDir = path.join(__dirname, 'templates');
    const handlebarOptions: NodemailerExpressHandlebarsOptions = {
      viewEngine: {
        extname: '.hbs',
        layoutsDir: path.join(templatesDir, 'layouts'),
        partialsDir: path.join(templatesDir, 'partials'),
        defaultLayout: 'main',
      },
      viewPath: templatesDir,
      extName: '.hbs',
    };

    this.transporter.use('compile', hbs(handlebarOptions));
  }

  /**
   * 공통 이메일 발송 메서드
   */
  private async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.smtpFrom,
        to: options.to,
        subject: options.subject,
        template: options.template,
        context: options.context,
      });

      this.logger.log(
        `Email sent to: ${options.to} (template: ${options.template})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to} (template: ${options.template})`,
        error,
      );
      throw new Error('이메일 전송에 실패했습니다');
    }
  }

  /**
   * 이메일 인증 메일 발송
   */
  async sendVerificationEmail(
    to: string,
    code: string,
    userName: string,
  ): Promise<void> {
    const template = EmailTemplate.VERIFICATION;
    const context: VerificationEmailContext = {
      userName,
      code,
      ...EMAIL_THEME_COLORS[template],
      ...EMAIL_MESSAGES[template],
    };

    await this.sendEmail({
      to,
      subject: '이메일 인증 코드입니다',
      template,
      context,
    });
  }

  /**
   * 비밀번호 재설정 이메일 발송
   */
  async sendPasswordResetEmail(
    to: string,
    code: string,
    userName: string,
  ): Promise<void> {
    const template = EmailTemplate.PASSWORD_RESET;
    const context: PasswordResetEmailContext = {
      userName,
      code,
      ...EMAIL_THEME_COLORS[template],
      ...EMAIL_MESSAGES[template],
    };

    await this.sendEmail({
      to,
      subject: '비밀번호 재설정 인증 코드입니다',
      template,
      context,
    });
  }

  /**
   * 그룹 초대 이메일 발송
   */
  async sendGroupInviteEmail(
    to: string,
    groupName: string,
    inviterName: string,
    inviteCode: string,
  ): Promise<void> {
    const template = EmailTemplate.GROUP_INVITE;
    const context: GroupInviteEmailContext = {
      groupName,
      inviterName,
      inviteCode,
      ...EMAIL_THEME_COLORS[template],
      ...EMAIL_MESSAGES[template],
    };

    await this.sendEmail({
      to,
      subject: `[Family Planner] ${groupName} 그룹에 초대되었습니다`,
      template,
      context,
    });
  }
}
