import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import { NodemailerExpressHandlebarsOptions } from 'nodemailer-express-handlebars';
import * as path from 'path';
import { EmailTemplate, EMAIL_THEME_COLORS } from './email.constants';
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

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
    const smtpConfig = {
      host: this.configService.get<string>('smtp.host'),
      port: this.configService.get<number>('smtp.port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('smtp.user'),
        pass: this.configService.get<string>('smtp.password'),
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
    this.smtpFrom = this.configService.get<string>('smtp.from');

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

  private t(key: string, lang: string, args?: Record<string, unknown>): string {
    return this.i18n.t(key, { lang, args });
  }

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

  async sendVerificationEmail(
    to: string,
    code: string,
    userName: string,
    lang = 'ko',
  ): Promise<void> {
    const template = EmailTemplate.VERIFICATION;
    const context: VerificationEmailContext = {
      userName,
      code,
      ...EMAIL_THEME_COLORS[template],
      headerSubtitle: this.t('email.verification.header_subtitle', lang),
      footerText1: this.t('email.verification.footer1', lang),
      footerText2: this.t('email.verification.footer2', lang),
      greeting: this.t('email.verification.greeting', lang, { userName }),
      body1: this.t('email.verification.body1', lang),
      body2: this.t('email.verification.body2', lang),
      codeLabel: this.t('email.verification.code_label', lang),
      body3: this.t('email.verification.body3', lang),
      warningLabel: this.t('email.verification.warning_label', lang),
      warningText: this.t('email.verification.warning_text', lang),
    };

    await this.sendEmail({
      to,
      subject: this.t('email.subject.verification', lang),
      template,
      context,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    code: string,
    userName: string,
    lang = 'ko',
  ): Promise<void> {
    const template = EmailTemplate.PASSWORD_RESET;
    const context: PasswordResetEmailContext = {
      userName,
      code,
      ...EMAIL_THEME_COLORS[template],
      headerSubtitle: this.t('email.password_reset.header_subtitle', lang),
      footerText1: this.t('email.password_reset.footer1', lang),
      footerText2: this.t('email.password_reset.footer2', lang),
      greeting: this.t('email.password_reset.greeting', lang, { userName }),
      body1: this.t('email.password_reset.body1', lang),
      body2: this.t('email.password_reset.body2', lang),
      codeLabel: this.t('email.password_reset.code_label', lang),
      body3: this.t('email.password_reset.body3', lang),
      warningLabel: this.t('email.password_reset.warning_label', lang),
      warningText: this.t('email.password_reset.warning_text', lang),
      securityLabel: this.t('email.password_reset.security_label', lang),
      securityText: this.t('email.password_reset.security_text', lang),
    };

    await this.sendEmail({
      to,
      subject: this.t('email.subject.password_reset', lang),
      template,
      context,
    });
  }

  async sendDataExportEmail(
    to: string,
    userName: string,
    zipBuffer: Buffer,
    filename: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.smtpFrom,
        to,
        subject: '[가족 플래너] 내 데이터 내보내기',
        html: `
          <p>${userName}님, 안녕하세요.</p>
          <p>요청하신 개인정보 내보내기 파일을 첨부해 드립니다.</p>
          <p>첨부 파일에는 계정 정보, 일정, 메모, 지출 내역이 포함되어 있습니다.</p>
          <br/>
          <p>가족 플래너 드림</p>
        `,
        attachments: [{ filename, content: zipBuffer }],
      });
      this.logger.log(`Data export email sent to: ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send data export email to ${to}`, error);
      throw new Error('이메일 전송에 실패했습니다');
    }
  }

  async sendGroupInviteEmail(
    to: string,
    groupName: string,
    inviterName: string,
    inviteCode: string,
    lang = 'ko',
  ): Promise<void> {
    const template = EmailTemplate.GROUP_INVITE;
    const context: GroupInviteEmailContext = {
      groupName,
      inviterName,
      inviteCode,
      ...EMAIL_THEME_COLORS[template],
      headerSubtitle: this.t('email.group_invite.header_subtitle', lang),
      footerText1: this.t('email.group_invite.footer1', lang),
      footerText2: this.t('email.group_invite.footer2', lang),
      title: this.t('email.group_invite.title', lang),
      body1: this.t('email.group_invite.body1', lang, { inviterName }),
      invitedGroupLabel: this.t('email.group_invite.invited_group_label', lang),
      body2: this.t('email.group_invite.body2', lang),
      codeLabel: this.t('email.group_invite.code_label', lang),
      howToJoinLabel: this.t('email.group_invite.how_to_join_label', lang),
      step1: this.t('email.group_invite.step1', lang),
      step2: this.t('email.group_invite.step2', lang),
      step3: this.t('email.group_invite.step3', lang),
      expiryText: this.t('email.group_invite.expiry_text', lang),
    };

    await this.sendEmail({
      to,
      subject: this.t('email.subject.group_invite', lang, { groupName }),
      template,
      context,
    });
  }
}
