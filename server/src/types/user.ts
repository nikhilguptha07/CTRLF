export type UserRole = 'ADMIN' | 'OPERATOR' | 'USER' | 'VIEWER';

export enum Permission {
  CAMERA_VIEW = 'CAMERA_VIEW',
  CAMERA_MANAGE = 'CAMERA_MANAGE',
  SEARCH_CREATE = 'SEARCH_CREATE',
  SEARCH_CANCEL = 'SEARCH_CANCEL',
  VIDEO_UPLOAD = 'VIDEO_UPLOAD',
  DETECTION_VIEW = 'DETECTION_VIEW',
  EVIDENCE_VIEW = 'EVIDENCE_VIEW',
  AUDIT_VIEW = 'AUDIT_VIEW',
  USER_MANAGE = 'USER_MANAGE',
  SYSTEM_CONFIGURE = 'SYSTEM_CONFIGURE',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    Permission.CAMERA_VIEW,
    Permission.CAMERA_MANAGE,
    Permission.SEARCH_CREATE,
    Permission.SEARCH_CANCEL,
    Permission.VIDEO_UPLOAD,
    Permission.DETECTION_VIEW,
    Permission.EVIDENCE_VIEW,
    Permission.AUDIT_VIEW,
    Permission.USER_MANAGE,
    Permission.SYSTEM_CONFIGURE,
  ],
  OPERATOR: [
    Permission.CAMERA_VIEW,
    Permission.SEARCH_CREATE,
    Permission.SEARCH_CANCEL,
    Permission.VIDEO_UPLOAD,
    Permission.DETECTION_VIEW,
    Permission.EVIDENCE_VIEW,
  ],
  USER: [
    Permission.CAMERA_VIEW,
    Permission.SEARCH_CREATE,
    Permission.VIDEO_UPLOAD,
    Permission.DETECTION_VIEW,
    Permission.EVIDENCE_VIEW,
  ],
  VIEWER: [
    Permission.CAMERA_VIEW,
    Permission.DETECTION_VIEW,
    Permission.EVIDENCE_VIEW,
  ],
};

export interface User {
  id: string;
  username?: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  refreshTokenHash?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  username?: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface JwtPayload {
  userId: string;
  email: string;
  username?: string;
  role: UserRole;
}

