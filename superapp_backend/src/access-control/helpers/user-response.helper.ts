import { Identity } from '../../identities/entities/identity.entity';

export interface FormattedUserResponse {
  id: string;
  email: string;
  name: string;
  honorific?: string | null;
  avatarUrl?: string | null;
  status: string;
  isActive: boolean;
  roleId?: string | null;
  role?: any;
  roles: any[];
  organizationId?: string | null;
  organization?: any;
  position?: string | null;
  staffId?: string | null;
  phoneNumber?: string | null;
  externalId?: string | null;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  telegramConnectedAt?: Date | null;
  teamTelegramChatId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export function formatUserResponse(user: any): FormattedUserResponse {
  if (!user) return user;
  const staffProfile = user.staffProfile;
  const role = staffProfile?.role || user.role;
  const roles = (user as any).roles || (role ? [role] : []);
  const status = user.status || 'ACTIVE';
  const org = staffProfile?.organization || user.organization;
  return {
    ...user,
    id: user.id,
    email: user.email,
    name: user.name,
    honorific: user.honorific || null,
    avatarUrl: user.avatarKey ? `/api/avatars/${user.avatarKey}` : (user.avatarUrl || null),
    status,
    isActive: status === 'ACTIVE',
    roleId: staffProfile?.roleId || user.roleId || role?.id || null,
    role,
    roles,
    organizationId: staffProfile?.organizationId || user.organizationId || org?.id || null,
    organization: org || null,
    position: staffProfile?.position || user.position || null,
    staffId: staffProfile?.staffId || user.staffId || null,
    phoneNumber: staffProfile?.phoneNumber || user.phoneNumber || null,
    externalId: staffProfile?.externalId || user.externalId || null,
    telegramChatId: user.telegramChatId || null,
    telegramUsername: user.telegramUsername || null,
    telegramConnectedAt: user.telegramConnectedAt || null,
    teamTelegramChatId: user.telegramChatId || (user as any).teamTelegramChatId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
