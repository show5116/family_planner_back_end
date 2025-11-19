import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * 이메일 인증 메일 발송
   */
  async sendVerificationEmail(to: string, token: string, userName: string) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Family Planner" <noreply@familyplanner.com>',
        to,
        subject: '이메일 인증을 완료해주세요',
        html: this.getVerificationEmailTemplate(userName, verificationUrl),
      });

      this.logger.log(`Verification email sent to: ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
      throw new Error('이메일 전송에 실패했습니다');
    }
  }

  /**
   * 이메일 인증 템플릿
   */
  private getVerificationEmailTemplate(userName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #4CAF50;
              margin: 0;
            }
            .content {
              background-color: white;
              padding: 25px;
              border-radius: 8px;
            }
            .button {
              display: inline-block;
              padding: 15px 30px;
              background-color: #4CAF50;
              color: white !important;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .button:hover {
              background-color: #45a049;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin-top: 20px;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Family Planner</h1>
              <p>가족 플래너에 오신 것을 환영합니다!</p>
            </div>

            <div class="content">
              <h2>안녕하세요, ${userName}님!</h2>
              <p>가족 플래너 회원가입을 완료하기 위해 이메일 인증이 필요합니다.</p>
              <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>

              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">이메일 인증하기</a>
              </div>

              <p>버튼이 작동하지 않는 경우, 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
              <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>

              <div class="warning">
                <strong>주의:</strong> 이 인증 링크는 24시간 동안만 유효합니다.
              </div>
            </div>

            <div class="footer">
              <p>본 메일은 회원가입 시 자동으로 발송되는 메일입니다.</p>
              <p>만약 회원가입을 하지 않으셨다면 이 메일을 무시해주세요.</p>
              <p>&copy; 2025 Family Planner. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
