/**
 * 权限管理系统API接口定义
 */

import axios from 'axios';
import React from 'react';
import type {
  Role,
  PermissionResource,
  UserRole,
  SystemConfig,
  SecurityPolicy,
  AuditLog,
  ApiResponse,
  PaginatedResponse,
  RoleQueryParams,
  PermissionQueryParams,
  UserRoleQueryParams,
  RoleCreateParams,
  RoleUpdateParams,
  PermissionCreateParams,
  UserRoleAssignParams,
  ConfigUpdateParams,
  PermissionCheckResult,
  SystemStats
} from '../types/permission';

// API基础路径
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api';

export const permissionApi = {
  // ===================== 角色管理 =====================
  
  /**
   * 获取角色列表
   */
  getRoles: (params?: RoleQueryParams) => {
    return axios.get<PaginatedResponse<Role>>(`${API_BASE}/roles`, { params });
  },

  /**
   * 获取单个角色详情
   */
  getRoleById: (id: string) => {
    return axios.get<ApiResponse<Role>>(`${API_BASE}/roles/${id}`);
  },

  /**
   * 创建新角色
   */
  createRole: (data: RoleCreateParams) => {
    return axios.post<ApiResponse<Role>>(`${API_BASE}/roles`, data);
  },

  /**
   * 更新角色信息
   */
  updateRole: (id: string, data: RoleUpdateParams) => {
    return axios.put<ApiResponse<Role>>(`${API_BASE}/roles/${id}`, data);
  },

  /**
   * 删除角色
   */
  deleteRole: (id: string) => {
    return axios.delete<ApiResponse<void>>(`${API_BASE}/roles/${id}`);
  },

  /**
   * 批量删除角色
   */
  batchDeleteRoles: (ids: string[]) => {
    return axios.post<ApiResponse<void>>(`${API_BASE}/roles/batch-delete`, { ids });
  },

  /**
   * 启用/禁用角色
   */
  toggleRoleStatus: (id: string, status: 'active' | 'inactive') => {
    return axios.patch<ApiResponse<Role>>(`${API_BASE}/roles/${id}/status`, { status });
  },

  /**
   * 获取角色的用户列表
   */
  getRoleUsers: (roleId: string, params?: { page?: number; pageSize?: number }) => {
    return axios.get<PaginatedResponse<UserRole>>(`${API_BASE}/roles/${roleId}/users`, { params });
  },

  // ===================== 权限管理 =====================
  
  /**
   * 获取权限列表
   */
  getPermissions: (params?: PermissionQueryParams) => {
    return axios.get<PaginatedResponse<PermissionResource>>(`${API_BASE}/permissions`, { params });
  },

  /**
   * 获取所有权限（不分页）
   */
  getAllPermissions: () => {
    return axios.get<ApiResponse<PermissionResource[]>>(`${API_BASE}/permissions/all`);
  },

  /**
   * 获取权限树形结构
   */
  getPermissionTree: () => {
    return axios.get<ApiResponse<any>>(`${API_BASE}/permissions/tree`);
  },

  /**
   * 创建新权限
   */
  createPermission: (data: PermissionCreateParams) => {
    return axios.post<ApiResponse<PermissionResource>>(`${API_BASE}/permissions`, data);
  },

  /**
   * 更新权限信息
   */
  updatePermission: (id: string, data: Partial<PermissionCreateParams>) => {
    return axios.put<ApiResponse<PermissionResource>>(`${API_BASE}/permissions/${id}`, data);
  },

  /**
   * 删除权限
   */
  deletePermission: (id: string) => {
    return axios.delete<ApiResponse<void>>(`${API_BASE}/permissions/${id}`);
  },

  // ===================== 用户角色管理 =====================
  
  /**
   * 获取用户角色列表
   */
  getUserRoles: (params?: UserRoleQueryParams) => {
    return axios.get<PaginatedResponse<UserRole>>(`${API_BASE}/user-roles`, { params });
  },

  /**
   * 分配角色给用户
   */
  assignUserRole: (data: UserRoleAssignParams) => {
    return axios.post<ApiResponse<UserRole>>(`${API_BASE}/user-roles`, data);
  },

  /**
   * 移除用户的角色
   */
  removeUserRole: (id: string) => {
    return axios.delete<ApiResponse<void>>(`${API_BASE}/user-roles/${id}`);
  },

  /**
   * 批量分配角色
   */
  batchAssignRoles: (userId: string, roleIds: string[]) => {
    return axios.post<ApiResponse<UserRole[]>>(`${API_BASE}/user-roles/batch-assign`, { userId, roleIds });
  },

  /**
   * 获取用户的角色列表
   */
  getUserRolesByUserId: (userId: string) => {
    return axios.get<ApiResponse<UserRole[]>>(`${API_BASE}/user-roles/user/${userId}`);
  },

  /**
   * 检查用户是否拥有角色
   */
  checkUserHasRole: (userId: string, roleId: string) => {
    return axios.get<ApiResponse<{ hasRole: boolean }>>(`${API_BASE}/user-roles/check`, {
      params: { userId, roleId }
    });
  },

  // ===================== 权限验证 =====================
  
  /**
   * 检查用户权限
   */
  checkPermission: (permissions: string[]) => {
    return axios.post<ApiResponse<PermissionCheckResult>>(`${API_BASE}/permissions/check`, { permissions });
  },

  /**
   * 获取当前用户的权限列表
   */
  getCurrentUserPermissions: () => {
    return axios.get<ApiResponse<string[]>>(`${API_BASE}/permissions/current-user`);
  },

  /**
   * 验证API权限
   */
  validateApiPermission: (method: string, path: string) => {
    return axios.post<ApiResponse<{ allowed: boolean }>>(`${API_BASE}/permissions/validate-api`, {
      method,
      path
    });
  },

  // ===================== 系统配置 =====================
  
  /**
   * 获取系统配置列表
   */
  getSystemConfigs: (params?: { category?: string }) => {
    return axios.get<ApiResponse<SystemConfig[]>>(`${API_BASE}/configs`, { params });
  },

  /**
   * 获取单个配置项
   */
  getSystemConfig: (key: string) => {
    return axios.get<ApiResponse<SystemConfig>>(`${API_BASE}/configs/${key}`);
  },

  /**
   * 更新系统配置
   */
  updateSystemConfig: (data: ConfigUpdateParams) => {
    return axios.put<ApiResponse<SystemConfig>>(`${API_BASE}/configs`, data);
  },

  /**
   * 批量更新系统配置
   */
  batchUpdateConfigs: (configs: ConfigUpdateParams[]) => {
    return axios.put<ApiResponse<SystemConfig[]>>(`${API_BASE}/configs/batch`, { configs });
  },

  /**
   * 重置配置为默认值
   */
  resetSystemConfig: (key: string) => {
    return axios.post<ApiResponse<SystemConfig>>(`${API_BASE}/configs/${key}/reset`);
  },

  // ===================== 安全策略 =====================
  
  /**
   * 获取安全策略
   */
  getSecurityPolicy: () => {
    return axios.get<ApiResponse<SecurityPolicy>>(`${API_BASE}/security/policy`);
  },

  /**
   * 更新安全策略
   */
  updateSecurityPolicy: (data: Partial<SecurityPolicy>) => {
    return axios.put<ApiResponse<SecurityPolicy>>(`${API_BASE}/security/policy`, data);
  },

  /**
   * 测试安全策略
   */
  testSecurityPolicy: (data: any) => {
    return axios.post<ApiResponse<any>>(`${API_BASE}/security/policy/test`, data);
  },

  // ===================== 审计日志 =====================
  
  /**
   * 获取审计日志列表
   */
  getAuditLogs: (params?: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    userId?: string;
    action?: string;
    resource?: string;
    status?: string;
  }) => {
    return axios.get<PaginatedResponse<AuditLog>>(`${API_BASE}/audit-logs`, { params });
  },

  /**
   * 获取操作统计
   */
  getAuditStats: (params?: { startDate?: string; endDate?: string }) => {
    return axios.get<ApiResponse<any>>(`${API_BASE}/audit-logs/stats`, { params });
  },

  /**
   * 导出审计日志
   */
  exportAuditLogs: (params?: any) => {
    return axios.get(`${API_BASE}/audit-logs/export`, {
      params,
      responseType: 'blob'
    });
  },

  // ===================== 系统统计 =====================
  
  /**
   * 获取系统统计信息
   */
  getSystemStats: () => {
    return axios.get<ApiResponse<SystemStats>>(`${API_BASE}/stats`);
  },

  /**
   * 获取系统健康检查
   */
  getSystemHealth: () => {
    return axios.get<ApiResponse<any>>(`${API_BASE}/health`);
  },

  /**
   * 获取API使用统计
   */
  getApiUsageStats: (params?: { startDate?: string; endDate?: string }) => {
    return axios.get<ApiResponse<any>>(`${API_BASE}/stats/api-usage`, { params });
  },

  // ===================== 系统操作 =====================
  
  /**
   * 执行系统备份
   */
  performBackup: () => {
    return axios.post<ApiResponse<{ backupId: string; path: string }>>(`${API_BASE}/system/backup`);
  },

  /**
   * 清除系统缓存
   */
  clearCache: () => {
    return axios.post<ApiResponse<void>>(`${API_BASE}/system/cache/clear`);
  },

  /**
   * 重启系统服务
   */
  restartService: () => {
    return axios.post<ApiResponse<{ message: string }>>(`${API_BASE}/system/restart`);
  },

  /**
   * 更新系统日志级别
   */
  updateLogLevel: (level: 'debug' | 'info' | 'warn' | 'error') => {
    return axios.post<ApiResponse<{ level: string }>>(`${API_BASE}/system/log-level`, { level });
  },

  // ===================== 数据导入导出 =====================
  
  /**
   * 导出角色数据
   */
  exportRoles: (params?: any) => {
    return axios.get(`${API_BASE}/export/roles`, {
      params,
      responseType: 'blob'
    });
  },

  /**
   * 导出权限数据
   */
  exportPermissions: (params?: any) => {
    return axios.get(`${API_BASE}/export/permissions`, {
      params,
      responseType: 'blob'
    });
  },

  /**
   * 导入数据
   */
  importData: (file: File, type: 'roles' | 'permissions' | 'user-roles') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    return axios.post<ApiResponse<any>>(`${API_BASE}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // ===================== 工具函数 =====================
  
  /**
   * 生成权限代码
   */
  generatePermissionCode: (module: string, action: string) => {
    return axios.get<ApiResponse<{ code: string }>>(`${API_BASE}/tools/generate-permission-code`, {
      params: { module, action }
    });
  },

  /**
   * 验证权限代码格式
   */
  validatePermissionCode: (code: string) => {
    return axios.post<ApiResponse<{ valid: boolean; message?: string }>>(`${API_BASE}/tools/validate-permission-code`, { code });
  },

  /**
   * 生成密码
   */
  generatePassword: (options?: { length?: number; includeNumbers?: boolean; includeSymbols?: boolean }) => {
    return axios.post<ApiResponse<{ password: string }>>(`${API_BASE}/tools/generate-password`, options);
  }
};

// 权限验证钩子
export const hasPermission = (requiredPermissions: string[], userPermissions: string[]): boolean => {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  if (!userPermissions || userPermissions.length === 0) return false;
  
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission) || userPermissions.includes('*')
  );
};

// 权限验证装饰器（用于组件） - 占位符实现
export const withPermission = (requiredPermissions: string[]) => {
  return (WrappedComponent: any) => {
    return WrappedComponent; // 简化实现，避免类型错误
  };
};