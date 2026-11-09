import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Identity,
  IdentityHonorific,
  IdentityStatus,
} from '../identities/entities/identity.entity';
import { StaffProfile } from '../staff/entities/staff-profile.entity';
import { ConsumerProfile } from '../consumers/entities/consumer-profile.entity';
import { UpdateProfileDto } from './dto/profile.dto';

export interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: Date;
  status: any;
  honorific: string | null;
  position: string | null;
  organizationUnit: string | null;
  staffId: string | null;
  /** Changes whenever the avatar changes; null when there is none. */
  avatarVersion: string | null;
}

/** The ONLY projection of Identity sent to the mobile app (no hashes, secrets or object keys). */
export function toProfile(user: Identity): ProfileResponse {
  const staffProfile = user.staffProfile;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: !!user.emailVerifiedAt,
    createdAt: user.createdAt,
    status: user.status as any,
    honorific: user.honorific ?? null,
    position: staffProfile?.position ?? (user as any).position ?? null,
    organizationUnit:
      staffProfile?.organization?.name ??
      (staffProfile as any)?.organizationUnit ??
      (user as any).organizationUnit ??
      null,
    staffId: staffProfile?.staffId ?? (user as any).staffId ?? null,
    avatarVersion:
      user.avatarKey && user.avatarUpdatedAt
        ? new Date(user.avatarUpdatedAt).toISOString()
        : null,
  };
}

const NULLABLE_STAFF_FIELDS = [
  'position',
  'organizationUnit',
  'staffId',
] as const;

@Injectable()
export class MobileProfileService {
  constructor(
    @InjectRepository(Identity) private readonly users: Repository<Identity>,
    @Optional()
    @InjectRepository(StaffProfile)
    private readonly staffProfiles?: Repository<StaffProfile>,
  ) {}

  async getUser(userId: string): Promise<Identity> {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: {
        staffProfile: { organization: true },
        consumerProfile: true,
      },
    });
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
    const identityPatch: Partial<Identity> = {};

    if (typeof dto.name === 'string') {
      identityPatch.name = dto.name;
    }
    if (dto.honorific !== undefined) {
      identityPatch.honorific = dto.honorific;
    }
    if (dto.position !== undefined) {
      (user as any).position = dto.position;
    }
    if (dto.organizationUnit !== undefined) {
      (user as any).organizationUnit = dto.organizationUnit;
    }
    if (dto.staffId !== undefined) {
      (user as any).staffId = dto.staffId;
    }

    if (Object.keys(identityPatch).length > 0) {
      await this.users.update({ id: userId }, identityPatch);
      Object.assign(user, identityPatch);
    }

    if (this.staffProfiles) {
      let staffProfile = user.staffProfile;
      if (!staffProfile) {
        staffProfile = this.staffProfiles.create({
          identityId: userId,
          identity: user,
          position: dto.position ?? null,
          staffId: dto.staffId ?? null,
          status: 'ACTIVE',
        });
      } else {
        if (dto.position !== undefined) staffProfile.position = dto.position;
        if (dto.staffId !== undefined) staffProfile.staffId = dto.staffId;
      }
      try {
        await this.staffProfiles.save(staffProfile);
        user.staffProfile = staffProfile;
      } catch {}
    }

    return toProfile(user);
  }
}
