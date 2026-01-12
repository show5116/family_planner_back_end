/**
 * 이메일 템플릿 타입
 */
export enum EmailTemplate {
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password-reset',
  GROUP_INVITE = 'group-invite',
}

/**
 * 이메일 템플릿별 테마 색상
 */
export const EMAIL_THEME_COLORS = {
  [EmailTemplate.VERIFICATION]: {
    headerColor: '#4CAF50',
    codeBoxBg: '#f0f0f0',
    codeBoxBorder: '#4CAF50',
    codeColor: '#4CAF50',
  },
  [EmailTemplate.PASSWORD_RESET]: {
    headerColor: '#FF5722',
    codeBoxBg: '#fff3e0',
    codeBoxBorder: '#FF5722',
    codeColor: '#FF5722',
  },
  [EmailTemplate.GROUP_INVITE]: {
    headerColor: '#6366F1',
    codeBoxBg: '#fff',
    codeBoxBorder: '#6366F1',
    codeColor: '#6366F1',
  },
} as const;

/**
 * 이메일 템플릿별 문구
 */
export const EMAIL_MESSAGES = {
  [EmailTemplate.VERIFICATION]: {
    headerSubtitle: '가족 플래너에 오신 것을 환영합니다!',
    footerText1: '본 메일은 회원가입 시 자동으로 발송되는 메일입니다.',
    footerText2: '만약 회원가입을 하지 않으셨다면 이 메일을 무시해주세요.',
  },
  [EmailTemplate.PASSWORD_RESET]: {
    headerSubtitle: '비밀번호 재설정',
    footerText1: '본 메일은 비밀번호 재설정 요청 시 자동으로 발송되는 메일입니다.',
    footerText2:
      '만약 비밀번호 재설정을 요청하지 않으셨다면 이 메일을 무시해주세요.',
  },
  [EmailTemplate.GROUP_INVITE]: {
    headerSubtitle: '그룹 초대',
    footerText1: '본 메일은 그룹 초대 시 자동으로 발송되는 메일입니다.',
    footerText2: '만약 그룹 가입을 원하지 않으시면 이 메일을 무시해주세요.',
  },
} as const;
