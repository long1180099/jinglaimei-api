/**
 * 权限管理系统类型定义
 */

// 权限类型枚举
export enum PermissionType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  AUDIT = 'audit'
}

// 模块分类枚举
export enum ModuleCategory {
  USER = 'user',
  PRODUCT = 'product',
  ORDER = 'order',
  FINANCE = 'finance',
  COMMISSION = 'commission',
  TEAM = 'team',
  SCHOOL = 'school',
  SETTING = 'setting',
  PERMISSION = 'permission',
  DASHBOARD = 'dashboard'
}

// 权限资源接口
export interface PermissionResource {
  id: string;
  module: ModuleCategory;
  name: string;
  code: string;
  description: string;
  type: PermissionType;
  category: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

// 角色接口
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // 权限代码数组
  permissionIds: string[]; // 权限ID数组
  userCount: number;
  status: 'active' | 'inactive' | 'archived';
  isSystem: boolean;
  level: number; // 角色级别，数值越小权限越大
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// 用户角色关联接口
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  userName: string;
  userAvatar: string;
  roleName: string;
  assignedAt: string;
  assignedBy: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'revoked';
}

// 角色权限关联接口
export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permissionCode: string;
  assignedAt: string;
  assignedBy: string;
}

// 权限组接口
export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

// 系统配置接口
export interface SystemConfig {
  id: string;
  key: string;
  name: string;
  value: string | boolean | number;
  type: 'string' | 'boolean' | 'number' | 'select' | 'array' | 'json';
  description: string;
  category: string;
  options?: { label: string; value: string | number }[];
  isEncrypted: boolean;
  isReadonly: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

// 安全策略接口
export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  settings: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecialChars: boolean;
    passwordExpiryDays: number;
    loginAttempts: number;
    sessionTimeoutMinutes: number;
    twoFactorAuth: boolean;
    ipWhitelist: string[];
    allowedOrigins: string[];
  };
  createdAt: string;
  updatedAt: string;
}

// 审计日志接口
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  beforeValue?: any;
  afterValue?: any;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  timestamp: string;
  duration: number; // 毫秒
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  code: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 角色查询参数
export interface RoleQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 权限查询参数
export interface PermissionQueryParams {
  module?: ModuleCategory;
  category?: string;
  search?: string;
  isSystem?: boolean;
}

// 用户角色查询参数
export interface UserRoleQueryParams {
  userId?: string;
  roleId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

// 角色创建/更新参数
export interface RoleCreateParams {
  name: string;
  description: string;
  permissions: string[];
  status: 'active' | 'inactive';
  level?: number;
}

export interface RoleUpdateParams extends Partial<RoleCreateParams> {
  id: string;
}

// 权限创建参数
export interface PermissionCreateParams {
  module: ModuleCategory;
  name: string;
  code: string;
  description: string;
  type: PermissionType;
  category: string;
  isSystem?: boolean;
}

// 用户角色分配参数
export interface UserRoleAssignParams {
  userId: string;
  roleId: string;
  expiresAt?: string;
}

// 系统配置更新参数
export interface ConfigUpdateParams {
  key: string;
  value: string | boolean | number;
}

// 权限验证结果
export interface PermissionCheckResult {
  hasPermission: boolean;
  missingPermissions: string[];
  requiredPermissions: string[];
  userPermissions: string[];
}

// 系统统计信息
export interface SystemStats {
  totalRoles: number;
  totalPermissions: number;
  totalUserRoles: number;
  activeUsers: number;
  systemHealth: number;
  apiRequestsToday: number;
  avgResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastBackupTime: string;
}

// 默认角色定义
export const DEFAULT_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
} as const;

// 默认权限集合
export const DEFAULT_PERMISSIONS = {
  // 用户管理权限
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  USER_EXPORT: 'user:export',
  
  // 商品管理权限
  PRODUCT_READ: 'product:read',
  PRODUCT_WRITE: 'product:write',
  PRODUCT_DELETE: 'product:delete',
  
  // 订单管理权限
  ORDER_READ: 'order:read',
  ORDER_WRITE: 'order:write',
  ORDER_APPROVE: 'order:approve',
  
  // 财务管理权限
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',
  FINANCE_EXPORT: 'finance:export',
  
  // 收益管理权限
  COMMISSION_READ: 'commission:read',
  COMMISSION_WRITE: 'commission:write',
  COMMISSION_SETTLE: 'commission:settle',
  
  // 团队管理权限
  TEAM_READ: 'team:read',
  TEAM_WRITE: 'team:write',
  TEAM_ANALYZE: 'team:analyze',
  
  // 商学院权限
  SCHOOL_READ: 'school:read',
  SCHOOL_WRITE: 'school:write',
  SCHOOL_MANAGE: 'school:manage',
  
  // 系统设置权限
  SETTING_READ: 'setting:read',
  SETTING_WRITE: 'setting:write',
  
  // 权限管理权限
  PERMISSION_READ: 'permission:read',
  PERMISSION_WRITE: 'permission:write'
} as const;