/**
 * Masks an email for display: developer@fintech.com.kh -> d•••••••r@fintech.com.kh
 */
export function maskEmail(str: string): string {
  if (!str || !str.includes('@')) return 'your email';
  const [user, domain] = str.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'•'.repeat(Math.min(user.length - 2, 7))}${user[user.length - 1]}@${domain}`;
}
