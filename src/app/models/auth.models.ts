import { UserRole } from './user.models';

export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  department?: string;
  role?: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UserValidationResponse {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  isValid: boolean;
}
