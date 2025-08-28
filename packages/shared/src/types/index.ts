export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  features: {
    priceLock: boolean;
    bidPredictor: boolean;
    collaboration: boolean;
  };
  branding?: {
    primaryColor?: string;
    logo?: string;
  };
}

export interface User {
  id: string;
  email: string;
  tenantId: string;
  role: UserRole;
  companyName?: string;
  rating?: number;
  profile: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
}

export type UserRole = 'carrier' | 'account_manager' | 'admin' | 'super_admin';

export interface Opportunity {
  id: string;
  tenantId: string;
  createdBy: string;
  origin: Location;
  destination: Location;
  cargoDetails: CargoDetails;
  equipment: EquipmentType[];
  pickupDate: Date;
  deliveryDate: Date;
  status: OpportunityStatus;
  visibilityRules?: VisibilityRule[];
  currentBestBid?: number;
  minimumRate?: number;
  buyNowRate?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface CargoDetails {
  weight: number;
  weightUnit: 'lbs' | 'kg';
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'ft' | 'm';
  };
  commodity: string;
  hazmat: boolean;
  temperature?: {
    min: number;
    max: number;
    unit: 'F' | 'C';
  };
  specialInstructions?: string;
}

export type EquipmentType = 'dry_van' | 'reefer' | 'flatbed' | 'step_deck' | 'rgn' | 'power_only';

export type OpportunityStatus = 'draft' | 'active' | 'pending' | 'awarded' | 'completed' | 'cancelled';

export interface VisibilityRule {
  type: 'include' | 'exclude';
  field: 'carrierId' | 'rating' | 'region';
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface Bid {
  id: string;
  opportunityId: string;
  carrierId: string;
  amount: number;
  status: BidStatus;
  lockedUntil?: Date;
  lockFee?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BidStatus = 'active' | 'accepted' | 'rejected' | 'withdrawn' | 'expired' | 'locked';

export interface PriceLock {
  id: string;
  bidId: string;
  fee: number;
  expiresAt: Date;
  applied: boolean;
  createdAt: Date;
}

export interface OpportunityMessage {
  id: string;
  opportunityId: string;
  senderId: string;
  message: string;
  attachments?: Attachment[];
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface OpportunityActivity {
  id: string;
  opportunityId: string;
  userId: string;
  activityType: ActivityType;
  details: Record<string, any>;
  createdAt: Date;
}

export type ActivityType = 
  | 'bid_placed' 
  | 'bid_updated' 
  | 'bid_withdrawn'
  | 'message_sent'
  | 'document_uploaded'
  | 'status_changed'
  | 'price_locked';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OpportunityFilters extends PaginationParams {
  status?: OpportunityStatus[];
  origin?: string;
  destination?: string;
  equipment?: EquipmentType[];
  pickupDateFrom?: Date;
  pickupDateTo?: Date;
  minRate?: number;
  maxRate?: number;
}