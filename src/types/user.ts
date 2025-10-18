export interface User {
  id: string;
  customerId: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export type UserRole = 'admin' | 'member' | 'viewer';

export interface UserPermissions {
  userId: string;
  customerId: string;
  permissions: string[];
  resourceAccess?: ResourceAccess[];
}

export interface ResourceAccess {
  resourceType: string;
  resourceId: string;
  actions: string[];
}

export interface UserSession {
  sessionId: string;
  userId: string;
  customerId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

