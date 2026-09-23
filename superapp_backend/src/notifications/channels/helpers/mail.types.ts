export interface MailSendResult {
  success: boolean;
  message?: string;
  id?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface SecurityValidationFinding {
  severity: string;
  title: string;
  description: string;
  recommendation?: string;
}

export interface EmailLayoutOptions {
  category: string;
  categoryColor?: string;
  title: string;
  borderAccentColor?: string;
  contentHtml: string;
  signatureTeam?: string;
}
