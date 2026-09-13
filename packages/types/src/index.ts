export type RoleType = 'Super Admin' | 'Admin' | 'Support Admin' | 'Content Admin' | 'Analyst' | 'User';

export type UserStatus = 'Active' | 'Suspended' | 'Pending';

export type MembershipTier = 'Free' | 'Pro' | 'Unlimited';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  membership: MembershipTier;
  membershipExpiresAt?: string | null;
  status: UserStatus;
  avatarUrl?: string | null;
  totalProjects: number;
  totalProcesses: number;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export type ProcessStatus = 'Queued' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled';

export interface BackgroundProcess {
  id: string;
  userId?: string | null;
  userName?: string | null;
  fileName: string;
  fileSize: number;
  modelUsed: string;
  processingTimeMs?: number | null;
  status: ProcessStatus;
  errorMessage?: string | null;
  log?: string | null;
  resultUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  userName?: string;
  name: string;
  originalImageUrl: string;
  processedImageUrl?: string | null;
  thumbnailUrl: string;
  format: string;
  width: number;
  height: number;
  status: 'Draft' | 'Completed' | 'Pending' | 'In Progress';
  settings?: PhotoEditorSettings | null;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoBasicSettings {
  exposure: number;   // -100 to 100
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  highlights: number; // -100 to 100
  shadows: number;    // -100 to 100
  whites: number;     // -100 to 100
  blacks: number;     // -100 to 100
}

export interface PhotoColorSettings {
  temperature: number; // -100 to 100 (warm/cool)
  tint: number;        // -100 to 100 (green/magenta)
  saturation: number;  // -100 to 100
  vibrance: number;    // -100 to 100
  hue: number;         // -180 to 180
  colorIntensity: number; // 0 to 100
}

export interface PhotoDetailSettings {
  sharpness: number;  // 0 to 100
  clarity: number;    // -100 to 100
  blur: number;       // 0 to 100
  grain: number;      // 0 to 100
  vignette: number;   // 0 to 100
}

export interface PhotoTransformSettings {
  crop?: { x: number; y: number; width: number; height: number } | null;
  rotate: number; // 0, 90, 180, 270
  flipHorizontal: boolean;
  flipVertical: boolean;
  aspectRatio: string; // 'Original' | '1:1' | '4:5' | '3:4' | '9:16' | '16:9'
}

export type BackgroundMode = 'transparent' | 'solid' | 'gradient' | 'image' | 'blur';

export interface BackgroundSettings {
  mode: BackgroundMode;
  color?: string;
  gradient?: string;
  imageUrl?: string;
  blurLevel?: number;
}

export interface PhotoEditorSettings {
  basic: PhotoBasicSettings;
  color: PhotoColorSettings;
  detail: PhotoDetailSettings;
  transform: PhotoTransformSettings;
  activeFilter?: string | null;
  background: BackgroundSettings;
  shadow?: ProductShadowSettings;
  watermark?: WatermarkSettings;
}

export interface PresetFilter {
  id: string;
  name: string;
  category?: string;
  basic?: Partial<PhotoBasicSettings>;
  color?: Partial<PhotoColorSettings>;
  detail?: Partial<PhotoDetailSettings>;
  previewUrl?: string;
  isActive: boolean;
}

export interface BackgroundPreset {
  id: string;
  name: string;
  type: 'solid' | 'gradient' | 'image';
  value: string; // hex color, css gradient, or image url
  blurLevel?: number;
  previewUrl?: string;
  isActive: boolean;
}

export interface AspectRatioOption {
  id: string;
  name: string;
  ratio: string;
  width: number;
  height: number;
  isActive: boolean;
}

export type TransactionStatus = 'Pending' | 'Paid' | 'Failed' | 'Cancelled' | 'Expired' | 'Refunded';

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  tier: MembershipTier;
  amount: number;
  status: TransactionStatus;
  paymentMethod: string;
  invoiceNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipPlan {
  id: string;
  name: MembershipTier;
  price: number;
  periodDays: number;
  dailyBgRemovalLimit: number;
  features: string[];
  isActive: boolean;
}

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TicketStatus = 'Pending' | 'In Progress' | 'Waiting for User' | 'Resolved' | 'Closed';
export type TicketCategory =
  | 'Upload error'
  | 'Background removal error'
  | 'Export error'
  | 'Account'
  | 'Membership'
  | 'Payment'
  | 'Preset'
  | 'Other';

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
  status: TicketStatus;
  lastMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  attachmentUrl?: string | null;
  isInternalNote: boolean;
  createdAt: string;
}

export type ReportType =
  | 'Bug aplikasi'
  | 'AI salah mengenali objek'
  | 'Background removal tidak rapi'
  | 'File hasil rusak'
  | 'Preset bermasalah'
  | 'Pelanggaran penggunaan'
  | 'Other';

export type ReportStatus = 'Pending' | 'Reviewing' | 'Need More Information' | 'Accepted' | 'Rejected' | 'Resolved';

export interface Report {
  id: string;
  userId?: string | null;
  userName?: string | null;
  type: ReportType;
  title: string;
  description: string;
  imageUrl?: string | null;
  status: ReportStatus;
  assignedAdminId?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NotificationTarget = 'All' | 'Free' | 'Pro' | 'Inactive' | 'Specific';

export interface NotificationBroadcast {
  id: string;
  title: string;
  content: string;
  link?: string | null;
  target: NotificationTarget;
  targetUserId?: string | null;
  status: 'Draft' | 'Sent';
  sentCount: number;
  scheduledAt?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AppSettings {
  // General
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  description: string;
  language: string;
  timezone: string;
  // Upload
  maxFileSizeMb: number;
  supportedFormats: string[];
  dailyFreeLimit: number;
  tempRetentionHours: number;
  // AI
  activeModel: string;
  mockMode: boolean;
  confidenceThreshold: number;
  retryLimit: number;
  processingTimeoutSec: number;
  // Membership
  defaultTier: MembershipTier;
  proPriceMonthly: number;
  unlimitedPriceMonthly: number;
  // Security
  jwtExpiresIn: string;
  sessionTimeoutMinutes: number;
  rateLimitPerMinute: number;
  maintenanceMode: boolean;
  allowedAdminDomains: string[];
  // Appearance
  primaryColor: string;
  defaultTheme: 'light' | 'dark' | 'system';
}

export interface OverviewStats {
  totalUsers: number;
  totalUsersTrend: number;
  activeUsers: number;
  newUsersToday: number;
  totalProjects: number;
  totalProjectsTrend: number;
  imagesProcessed: number;
  imagesProcessedTrend: number;
  backgroundRemovals: number;
  backgroundRemovalsTrend: number;
  failedProcessing: number;
  failedProcessingTrend: number;
  activeMemberships: {
    free: number;
    pro: number;
    unlimited: number;
  };
  revenueSimulation: number;
  revenueSimulationTrend: number;
  pendingReports: number;
  pendingTickets: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  secondaryValue?: number;
}

export interface ExportModalOptions {
  format: 'PNG' | 'JPG' | 'WEBP';
  quality: number; // 0.1 to 1.0
  size: 'Original' | 'Medium' | 'Small';
  backgroundType: 'transparent' | 'solid';
  backgroundColor?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  discount_amount: number;
  max_uses: number;
  used_count: number;
  expires_at?: string | null;
  is_active: number | boolean;
  created_at: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotKnowledgeItem {
  id: string;
  keyword: string;
  title: string;
  response: string;
  actionType?: string;
  actionPayload?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProductShadowSettings {
  enabled: boolean;
  type: 'drop' | 'floor' | 'reflection';
  blur: number; // 0 to 50
  opacity: number; // 0 to 100
  offsetX: number; // -50 to 50
  offsetY: number; // -50 to 50
  scale?: number; // 50 to 160
  color?: string; // hex
}

export interface WatermarkSettings {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  imageUrl?: string | null;
  logoUrl?: string | null;
  opacity: number; // 10 to 100
  scale?: number; // 10 to 100
  size?: number; // 10 to 100
  color?: string; // hex
  position: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

