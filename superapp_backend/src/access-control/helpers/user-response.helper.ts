import { User } from '../entities/user.entity';

export function formatUserResponse<T extends Partial<User>>(
  user: T,
): T & {
  isActive: boolean;
  roles: any[];
  teamTelegramChatId?: string;
} {
  if (!user) return user;
  const role = user.role;
  const roles = (user as any).roles || (role ? [role] : []);
  const status = user.status || 'ACTIVE';
  return {
    ...user,
    role,
    roles,
    roleId: user.roleId || role?.id,
    status,
    isActive: status === 'ACTIVE',
    teamTelegramChatId: user.telegramChatId || (user as any).teamTelegramChatId,
  };
}
