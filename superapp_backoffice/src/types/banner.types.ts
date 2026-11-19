export type BannerActionType =
  | 'NONE'
  | 'MINI_APP'
  | 'EXTERNAL_URL'
  | 'IN_APP_ROUTE';

export type BannerAudience = 'PUBLIC' | 'ALL_FSA_STAFF';

export interface SuperAppBanner {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  actionType: BannerActionType;
  actionValue?: string | null;
  displayOrder: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  targetAudience: BannerAudience;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerPayload {
  title: string;
  description?: string;
  imageUrl?: string;
  actionType?: BannerActionType;
  actionValue?: string;
  displayOrder?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  targetAudience?: BannerAudience;
}

export interface UpdateBannerPayload extends Partial<CreateBannerPayload> {}
