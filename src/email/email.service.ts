import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  /**
   * 이메일 인증 메일 발송
   */
  async sendVerificationEmail(to: string, code: string, userName: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || `"Family Planner" <${process.env.SMTP_USER}>`,
        to,
        subject: '이메일 인증 코드입니다',
        html: this.getVerificationEmailTemplate(userName, code),
      });

      this.logger.log(`Verification email sent to: ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
      throw new Error('이메일 전송에 실패했습니다');
    }
  }

  /**
   * 비밀번호 재설정 이메일 발송
   */
  async sendPasswordResetEmail(to: string, code: string, userName: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || `"Family Planner" <${process.env.SMTP_USER}>`,
        to,
        subject: '비밀번호 재설정 인증 코드입니다',
        html: this.getPasswordResetEmailTemplate(userName, code),
      });

      this.logger.log(`Password reset email sent to: ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
      throw new Error('이메일 전송에 실패했습니다');
    }
  }

  /**
   * 이메일 인증 템플릿
   */
  private getVerificationEmailTemplate(userName: string, code: string): string {
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
            .code-box {
              background-color: #f0f0f0;
              border: 2px dashed #4CAF50;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
              text-align: center;
            }
            .code {
              font-size: 36px;
              font-weight: bold;
              color: #4CAF50;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
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
              <p>아래 6자리 인증 코드를 입력하여 이메일 인증을 완료해주세요.</p>

              <div class="code-box">
                <div style="font-size: 14px; color: #666; margin-bottom: 10px;">인증 코드</div>
                <div class="code">${code}</div>
              </div>

              <p style="text-align: center; color: #666;">위 코드를 앱 또는 웹사이트에 입력해주세요.</p>

              <div class="warning">
                <strong>주의:</strong> 이 인증 코드는 24시간 동안만 유효합니다.
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

  /**
   * 비밀번호 재설정 이메일 템플릿
   */
  private getPasswordResetEmailTemplate(userName: string, code: string): string {
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
              color: #FF5722;
              margin: 0;
            }
            .content {
              background-color: white;
              padding: 25px;
              border-radius: 8px;
            }
            .code-box {
              background-color: #fff3e0;
              border: 2px dashed #FF5722;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
              text-align: center;
            }
            .code {
              font-size: 36px;
              font-weight: bold;
              color: #FF5722;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .warning {
              background-color: #ffebee;
              border-left: 4px solid #f44336;
              padding: 15px;
              margin-top: 20px;
              border-radius: 4px;
            }
            .security-notice {
              background-color: #e3f2fd;
              border-left: 4px solid #2196F3;
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
              <p>비밀번호 재설정</p>
            </div>

            <div class="content">
              <h2>안녕하세요, ${userName}님!</h2>
              <p>비밀번호 재설정을 요청하셨습니다.</p>
              <p>아래 6자리 인증 코드를 입력하여 비밀번호를 재설정해주세요.</p>

              <div class="code-box">
                <div style="font-size: 14px; color: #666; margin-bottom: 10px;">인증 코드</div>
                <div class="code">${code}</div>
              </div>

              <p style="text-align: center; color: #666;">위 코드를 앱 또는 웹사이트에 입력해주세요.</p>

              <div class="warning">
                <strong>주의:</strong> 이 인증 코드는 1시간 동안만 유효합니다.
              </div>

              <div class="security-notice">
                <strong>보안 안내:</strong><br>
                본인이 요청하지 않은 비밀번호 재설정 이메일을 받으셨다면, 즉시 이 메일을 무시하고 계정 보안을 점검해주세요.
              </div>
            </div>

            <div class="footer">
              <p>본 메일은 비밀번호 재설정 요청 시 자동으로 발송되는 메일입니다.</p>
              <p>만약 비밀번호 재설정을 요청하지 않으셨다면 이 메일을 무시해주세요.</p>
              <p>&copy; 2025 Family Planner. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
