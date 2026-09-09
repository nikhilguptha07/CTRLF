export * from './user';
export * from './camera';
export * from './video';
export * from './search';
export * from './detection';

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  status: 'SUCCESS' | 'FAILURE';
  detailsJson?: string | null;
  previousHash?: string | null;
  currentHash?: string | null;
  createdAt: Date;
}
