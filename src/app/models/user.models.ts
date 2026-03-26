export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  LOGISTICS_STAFF = 'LOGISTICS_STAFF',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  totalLoginCount: number;
  preferredLanguage?: string;
  isTwoFactorEnabled: boolean;
}

export interface UserProfile {
  id: string;
  userId: string;
  avatarUrl?: string;
  preferredSchedule?: string;
  preferredSpaces?: string;
  dietaryPreferences?: string;
  accessibilityNeeds?: string;
  cvFileUrl?: string;
}

export interface UserStatistics {
  id: string;
  userId: string;
  totalLoginCount: number;
  totalHoursConnected: number;
  averageSessionDuration: number;
  totalDevicesUsed: number;
  mostUsedDevice?: string;
  mostVisitedPage?: string;
  peakUsageHour?: number;
  lastUpdated?: string;
}

export interface Session {
  id: string;
  userId: string;
  loginAt: string;
  logoutAt?: string;
  durationMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  operatingSystem?: string;
  browser?: string;
  location?: string;
  isActive: boolean;
}
