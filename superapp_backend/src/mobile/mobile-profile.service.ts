import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EndUser,
  EndUserHonorific,
  EndUserStatus,
} from './entities/end-user.entity';
import { UpdateProfileDto } from './dto/profile.dto';

export interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  status: EndUserStatus;
  honorific: EndUserHonorific | null;
  position: string | null;
  organizationUnit: string | null;
  staffId: string | null;
  /** Changes whenever the avatar changes; null when there is none. */
  avatarVersion: string | null;
}

/** The ONLY projection of EndUser sent to the app (no hashes, secrets or object keys). */
export function toProfile(user: EndUser): ProfileResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: !!user.emailVerifiedAt,
    createdAt: user.createdAt,
    status: user.status,
    honorific: user.honorific ?? null,
    position: user.position ?? null,
    organizationUnit: user.organizationUnit ?? null,
    staffId: user.staffId ?? null,
    avatarVersion:
      user.avatarKey && user.avatarUpdatedAt
        ? new Date(user.avatarUpdatedAt).toISOString()
        : null,
  };
}

const NULLABLE_FIELDS = [
  'honorific',
  'position',
  'organizationUnit',
  'staffId',
] as const;

@Injectable()
export class MobileProfileService {
  constructor(
    @InjectRepository(EndUser) private readonly users: Repository<EndUser>,
  ) {}

  async getUser(userId: string): Promise<EndUser> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    return user;
  }

  async getProfile(userId: string): Promise<ProfileResponse> {
    return toProfile(await this.getUser(userId));
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    const user = await this.getUser(userId);
    const patch: Partial<EndUser> = {};
    if (typeof dto.name === 'string') patch.name = dto.name;
    for (const key of NULLABLE_FIELDS) {
      if (dto[key] !== undefined)
        (patch as Record<string, unknown>)[key] = dto[key];
    }
    if (Object.keys(patch).length) {
      await this.users.update({ id: userId }, patch);
      Object.assign(user, patch);
    }
    return toProfile(user);
  }
}
