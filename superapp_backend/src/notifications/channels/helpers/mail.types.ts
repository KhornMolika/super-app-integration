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

/**
 * Outcome of a transactional email. Callers that must not pretend an email
 * went out (OTP codes) check `status`; fire-and-forget callers can ignore it.
 * - sent:    Resend accepted it (`id` is Resend's message id)
 * - skipped: not attempted (mail not configured, or a mock/test address)
 * - failed:  attempted (with retries for network errors) and refused or unreachable
 */
export interface MailDispatchResult {
  status: 'sent' | 'skipped' | 'failed';
  id?: string;
  /** not_configured | undeliverable_address, or the provider/network error */
  reason?: string;
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
