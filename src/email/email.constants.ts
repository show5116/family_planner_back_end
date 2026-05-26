export enum EmailTemplate {
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password-reset',
  GROUP_INVITE = 'group-invite',
}

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
