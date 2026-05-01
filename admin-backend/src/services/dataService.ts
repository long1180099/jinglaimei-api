/**
 * 数据服务层 - 统一管理API调用和数据状态
 */

import axios from 'axios';
import { message } from 'antd';
import type { SchoolQueryParams, LearningStatistics, SchoolStatsResponse } from '../types/school';
import { videoApi, bookApi, scriptApi, actionLogApi, pointsApi, statisticsApi, schoolApi } from '../api/schoolApi';
import { permissionApi } from '../api/permissionApi';

// 全局配置
const API_BASE = '/api';

// 创建统一的axios实例
export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加请求时间戳，防止缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    
    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => {
    // 标准化响应格式
    if (response.data && response.data.code !== undefined) {
      // 有业务code的响应
      if (response.data.code === 0 || response.data.code === 200) {
        return response.data.data || response.data;
      } else {
        message.error(response.data.message || '请求失败');
        return Promise.reject(new Error(response.data.message || '请求失败'));
      }
    }
    return response.data;
  },
  (error) => {
    console.error('API响应错误:', error);
    
    // 处理不同类型的错误
    if (error.response) {
      switch (error.response.status) {
        case 400:
          message.error('请求参数错误');
          break;
        case 401:
          message.error('未授权，请重新登录');
          // 触发登录弹窗或重定向
          break;
        case 403:
          message.error('权限不足');
          break;
        case 404:
          message.error('资源不存在');
          break;
        case 500:
          message.error('服务器内部错误');
          break;
        default:
          message.error(`请求失败 (${error.response.status})`);
      }
    } else if (error.request) {
      message.error('网络连接失败，请检查网络');
    } else {
      message.error('请求发送失败');
    }
    
    return Promise.reject(error);
  }
);

/**
 * 统一的分页响应接口
 */
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * 统一的API响应接口
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/**
 * 学习视频数据服务
 */
export class VideoDataService {
  static async getVideos(params?: SchoolQueryParams) {
    try {
      return await videoApi.getVideos(params);
    } catch (error) {
      console.error('获取视频列表失败:', error);
      throw error;
    }
  }

  static async getVideo(id: string) {
    try {
      return await videoApi.getVideo(id);
    } catch (error) {
      console.error('获取视频详情失败:', error);
      throw error;
    }
  }

  static async createVideo(video: any) {
    try {
      const result = await videoApi.createVideo(video);
      message.success('视频创建成功');
      return result;
    } catch (error) {
      message.error('视频创建失败');
      throw error;
    }
  }

  static async updateVideo(id: string, video: any) {
    try {
      const result = await videoApi.updateVideo(id, video);
      message.success('视频更新成功');
      return result;
    } catch (error) {
      message.error('视频更新失败');
      throw error;
    }
  }

  static async deleteVideo(id: string) {
    try {
      await videoApi.deleteVideo(id);
      message.success('视频删除成功');
    } catch (error) {
      message.error('视频删除失败');
      throw error;
    }
  }

  static async getVideoStatistics() {
    try {
      const [categoryStats, difficultyStats] = await Promise.all([
        videoApi.getVideoCategoryStats(),
        videoApi.getVideoDifficultyStats(),
      ]);
      return { categoryStats, difficultyStats };
    } catch (error) {
      console.error('获取视频统计失败:', error);
      throw error;
    }
  }
}

/**
 * 学习书籍数据服务
 */
export class BookDataService {
  static async getBooks(params?: SchoolQueryParams) {
    try {
      return await bookApi.getBooks(params);
    } catch (error) {
      console.error('获取书籍列表失败:', error);
      throw error;
    }
  }

  static async getBook(id: string) {
    try {
      return await bookApi.getBook(id);
    } catch (error) {
      console.error('获取书籍详情失败:', error);
      throw error;
    }
  }

  static async createBook(book: any) {
    try {
      const result = await bookApi.createBook(book);
      message.success('书籍创建成功');
      return result;
    } catch (error) {
      message.error('书籍创建失败');
      throw error;
    }
  }

  static async updateBook(id: string, book: any) {
    try {
      const result = await bookApi.updateBook(id, book);
      message.success('书籍更新成功');
      return result;
    } catch (error) {
      message.error('书籍更新失败');
      throw error;
    }
  }

  static async deleteBook(id: string) {
    try {
      await bookApi.deleteBook(id);
      message.success('书籍删除成功');
    } catch (error) {
      message.error('书籍删除失败');
      throw error;
    }
  }

  static async uploadEbook(file: File, metadata: any) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', metadata.title);
      formData.append('author', metadata.author);
      formData.append('description', metadata.description || '');
      formData.append('category', metadata.category);
      formData.append('difficulty', metadata.difficulty);
      formData.append('pages', metadata.pages?.toString() || '100');
      
      if (metadata.isbn) formData.append('isbn', metadata.isbn);
      if (metadata.publisher) formData.append('publisher', metadata.publisher);
      if (metadata.publishedYear) formData.append('publishedYear', metadata.publishedYear.toString());
      if (metadata.tags) formData.append('tags', JSON.stringify(metadata.tags));
      if (metadata.summary) formData.append('summary', metadata.summary);
      if (metadata.keyPoints) formData.append('keyPoints', JSON.stringify(metadata.keyPoints));
      if (metadata.quality) formData.append('quality', metadata.quality);
      
      const response = await bookApi.uploadEbook(formData);
      
      message.success('电子书上传成功');
      return response;
    } catch (error: any) {
      console.error('电子书上传失败:', error);
      message.error('电子书上传失败: ' + (error.response?.data?.message || error.message || '未知错误'));
      throw error;
    }
  }

  static async downloadEbook(id: string) {
    try {
      const response = await apiClient.get(`/school/books/${id}/download`, {
        responseType: 'blob',
      });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ebook-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('电子书下载开始');
    } catch (error) {
      message.error('电子书下载失败');
      throw error;
    }
  }

  static async getBookStatistics() {
    try {
      return await bookApi.getBookCategoryStats();
    } catch (error) {
      console.error('获取书籍统计失败:', error);
      throw error;
    }
  }
}

/**
 * 话术数据服务
 */
export class ScriptDataService {
  static async getScripts(params?: SchoolQueryParams) {
    try {
      return await scriptApi.getScripts(params);
    } catch (error) {
      console.error('获取话术列表失败:', error);
      throw error;
    }
  }

  static async getScript(id: string) {
    try {
      return await scriptApi.getScript(id);
    } catch (error) {
      console.error('获取话术详情失败:', error);
      throw error;
    }
  }

  static async createScript(script: any) {
    try {
      const result = await scriptApi.createScript(script);
      message.success('话术创建成功');
      return result;
    } catch (error) {
      message.error('话术创建失败');
      throw error;
    }
  }

  static async updateScript(id: string, script: any) {
    try {
      const result = await scriptApi.updateScript(id, script);
      message.success('话术更新成功');
      return result;
    } catch (error) {
      message.error('话术更新失败');
      throw error;
    }
  }

  static async deleteScript(id: string) {
    try {
      await scriptApi.deleteScript(id);
      message.success('话术删除成功');
    } catch (error) {
      message.error('话术删除失败');
      throw error;
    }
  }

  static async trainAIScript(question: string) {
    try {
      return await scriptApi.trainAIScript(question);
    } catch (error) {
      console.error('AI话术训练失败:', error);
      throw error;
    }
  }

  static async getScriptStatistics() {
    try {
      const [sceneStats, personalityStats] = await Promise.all([
        scriptApi.getScriptSceneStats(),
        scriptApi.getScriptPersonalityStats(),
      ]);
      return { sceneStats, personalityStats };
    } catch (error) {
      console.error('获取话术统计失败:', error);
      throw error;
    }
  }
}

/**
 * 商学院统计服务
 */
export class SchoolStatisticsService {
  static async getLearningStatistics(userId?: string): Promise<LearningStatistics> {
    try {
      const response = await statisticsApi.getLearningStatistics(userId);
      return response.data as LearningStatistics;
    } catch (error) {
      console.error('获取学习统计失败:', error);
      throw error;
    }
  }

  static async getOverallStats(): Promise<SchoolStatsResponse> {
    try {
      const response = await schoolApi.getOverviewStats();
      return response.data as SchoolStatsResponse;
    } catch (error) {
      console.error('获取总览统计失败:', error);
      throw error;
    }
  }

  static async getWeeklyProgress(userId: string, weeks: number = 4) {
    try {
      return await statisticsApi.getWeeklyProgress(userId, weeks);
    } catch (error) {
      console.error('获取周进度失败:', error);
      throw error;
    }
  }

  static async getRecentActivities(limit: number = 10) {
    try {
      return await schoolApi.getRecentActivities(limit);
    } catch (error) {
      console.error('获取最近活动失败:', error);
      throw error;
    }
  }
}

/**
 * 缓存管理
 */
class CacheManager {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  protected static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

  static get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.DEFAULT_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  static set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  static clear() {
    this.cache.clear();
  }

  static remove(key: string) {
    this.cache.delete(key);
  }
}

/**
 * 增强缓存管理器
 */
class EnhancedCacheManager extends CacheManager {
  // 带缓存策略的获取方法
  static async getWithCache<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    options?: { ttl?: number; forceRefresh?: boolean }
  ): Promise<T> {
    const ttl = options?.ttl || this.DEFAULT_TTL;
    const forceRefresh = options?.forceRefresh || false;
    
    // 如果强制刷新或缓存过期，重新获取
    if (forceRefresh || !this.get(key)) {
      try {
        const data = await fetchFn();
        this.set(key, data);
        return data;
      } catch (error) {
        // 如果获取失败，返回缓存数据（如果有）
        const cached = this.get(key);
        if (cached) {
          console.warn(`获取 ${key} 失败，返回缓存数据`);
          return cached;
        }
        throw error;
      }
    }
    
    return this.get(key) as T;
  }

  // 批量获取多个缓存
  static async getMultiWithCache<T>(
    keys: string[],
    fetchFn: (missingKeys: string[]) => Promise<Record<string, T>>,
    options?: { ttl?: number; forceRefresh?: boolean }
  ): Promise<Record<string, T>> {
    const result: Record<string, T> = {};
    const missingKeys: string[] = [];
    
    // 检查现有缓存
    for (const key of keys) {
      const cached = this.get(key);
      if (cached && !options?.forceRefresh) {
        result[key] = cached;
      } else {
        missingKeys.push(key);
      }
    }
    
    // 获取缺失的数据
    if (missingKeys.length > 0) {
      try {
        const fetchedData = await fetchFn(missingKeys);
        
        // 存储新数据到缓存
        for (const key in fetchedData) {
          this.set(key, fetchedData[key]);
          result[key] = fetchedData[key];
        }
      } catch (error) {
        console.error('批量获取缓存数据失败:', error);
        // 继续返回已有的缓存数据
      }
    }
    
    return result;
  }

  // 预加载缓存
  static preloadCache<T>(
    key: string, 
    fetchPromise: Promise<T>, 
    options?: { ttl?: number }
  ): void {
    fetchPromise
      .then(data => {
        this.set(key, data);
      })
      .catch(error => {
        console.error(`预加载缓存 ${key} 失败:`, error);
      });
  }
}

/**
 * 全局数据管理
 */
export class GlobalDataService {
  // 清空指定类型的缓存
  static clearCache(type: 'video' | 'book' | 'script' | 'all' = 'all') {
    if (type === 'all') {
      EnhancedCacheManager.clear();
    } else {
      EnhancedCacheManager.remove(`${type}_list`);
      EnhancedCacheManager.remove(`${type}_stats`);
    }
  }

  // 获取缓存数据
  static getCachedData<T>(key: string): T | null {
    return EnhancedCacheManager.get(key);
  }

  // 设置缓存数据
  static setCachedData(key: string, data: any) {
    EnhancedCacheManager.set(key, data);
  }

  // 带缓存的数据获取
  static async getWithCache<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    options?: { ttl?: number; forceRefresh?: boolean }
  ): Promise<T> {
    return EnhancedCacheManager.getWithCache(key, fetchFn, options);
  }

  // 批量获取初始数据（用于页面初始化）
  static async getInitialSchoolData() {
    try {
      const [overallStats, recentActivities, popularContent] = await Promise.all([
        EnhancedCacheManager.getWithCache('overall_stats', () => 
          SchoolStatisticsService.getOverallStats(),
          { ttl: 2 * 60 * 1000 } // 2分钟缓存
        ),
        EnhancedCacheManager.getWithCache('recent_activities', () => 
          SchoolStatisticsService.getRecentActivities(10),
          { ttl: 1 * 60 * 1000 } // 1分钟缓存
        ),
        EnhancedCacheManager.getWithCache('popular_content', () => 
          schoolApi.getPopularContent(),
          { ttl: 5 * 60 * 1000 } // 5分钟缓存
        ),
      ]);

      return {
        overallStats,
        recentActivities,
        popularContent,
      };
    } catch (error) {
      console.error('获取初始数据失败:', error);
      throw error;
    }
  }

  // 预加载常用数据
  static preloadCommonData(): void {
    // 预加载总览统计
    EnhancedCacheManager.preloadCache(
      'overall_stats', 
      SchoolStatisticsService.getOverallStats(),
      { ttl: 2 * 60 * 1000 }
    );
    
    // 预加载热门内容
    EnhancedCacheManager.preloadCache(
      'popular_content', 
      schoolApi.getPopularContent(),
      { ttl: 5 * 60 * 1000 }
    );
  }

  // 获取系统状态
  static async getSystemStatus(): Promise<{
    apiHealth: boolean;
    cacheStatus: { total: number; memoryUsage: number };
    lastUpdate: string;
  }> {
    try {
      // 检查API健康状态
      const apiHealth = await apiClient.get('/health')
        .then(() => true)
        .catch(() => false);
      
      // 获取缓存状态
      const cacheStatus = {
        total: EnhancedCacheManager['cache'].size,
        memoryUsage: JSON.stringify(EnhancedCacheManager['cache']).length,
      };
      
      return {
        apiHealth,
        cacheStatus,
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      return {
        apiHealth: false,
        cacheStatus: { total: 0, memoryUsage: 0 },
        lastUpdate: new Date().toISOString(),
      };
    }
  }
}

/**
 * 权限管理数据服务
 */
export class PermissionDataService {
  static async getRoles(params?: any) {
    try {
      return await EnhancedCacheManager.getWithCache(
        `roles_${JSON.stringify(params)}`,
        async () => {
          // 模拟API调用，实际应该调用 permissionApi.getRoles
          return {
            items: [
              {
                id: '1',
                name: '超级管理员',
                description: '拥有系统所有权限',
                permissions: ['*'],
                userCount: 1,
                status: 'active',
                createdAt: '2026-01-01',
                updatedAt: '2026-03-26'
              },
              {
                id: '2',
                name: '系统管理员',
                description: '管理用户和权限配置',
                permissions: ['user:read', 'user:write', 'role:read', 'role:write'],
                userCount: 3,
                status: 'active',
                createdAt: '2026-01-15',
                updatedAt: '2026-03-26'
              },
              {
                id: '3',
                name: '运营管理员',
                description: '负责内容管理和运营',
                permissions: ['content:read', 'content:write', 'order:read', 'product:read'],
                userCount: 5,
                status: 'active',
                createdAt: '2026-02-01',
                updatedAt: '2026-03-26'
              },
              {
                id: '4',
                name: '财务管理员',
                description: '管理财务和佣金结算',
                permissions: ['finance:read', 'finance:write', 'commission:read', 'commission:write'],
                userCount: 2,
                status: 'active',
                createdAt: '2026-02-10',
                updatedAt: '2026-03-26'
              },
              {
                id: '5',
                name: '查看者',
                description: '只能查看数据，无编辑权限',
                permissions: ['user:read', 'product:read', 'order:read', 'finance:read'],
                userCount: 12,
                status: 'active',
                createdAt: '2026-03-01',
                updatedAt: '2026-03-26'
              }
            ],
            total: 5,
            page: 1,
            pageSize: 10,
            totalPages: 1
          };
        },
        { ttl: 5 * 60 * 1000 }
      );
    } catch (error) {
      console.error('获取角色列表失败:', error);
      throw error;
    }
  }

  static async createRole(roleData: any) {
    try {
      // 模拟API调用，实际应该调用 permissionApi.createRole
      const newRole = {
        id: Date.now().toString(),
        ...roleData,
        userCount: 0,
        status: 'active',
        createdAt: '2026-03-26',
        updatedAt: '2026-03-26'
      };
      
      message.success('角色创建成功');
      EnhancedCacheManager.clear();
      return newRole;
    } catch (error) {
      message.error('角色创建失败');
      throw error;
    }
  }

  static async updateRole(id: string, roleData: any) {
    try {
      // 模拟API调用，实际应该调用 permissionApi.updateRole
      const updatedRole = {
        id,
        ...roleData,
        updatedAt: '2026-03-26'
      };
      
      message.success('角色更新成功');
      EnhancedCacheManager.clear();
      return updatedRole;
    } catch (error) {
      message.error('角色更新失败');
      throw error;
    }
  }

  static async deleteRole(id: string) {
    try {
      // 模拟API调用，实际应该调用 permissionApi.deleteRole
      message.success('角色删除成功');
      EnhancedCacheManager.clear();
    } catch (error) {
      message.error('角色删除失败');
      throw error;
    }
  }

  static async getPermissions(params?: any) {
    try {
      return await EnhancedCacheManager.getWithCache(
        `permissions_${JSON.stringify(params)}`,
        async () => {
          // 模拟API调用
          const permissions = [
            { id: '1', module: '用户管理', name: '查看用户', code: 'user:read', description: '可以查看用户列表和详情', category: 'user' },
            { id: '2', module: '用户管理', name: '编辑用户', code: 'user:write', description: '可以添加、修改、删除用户', category: 'user' },
            { id: '3', module: '商品管理', name: '查看商品', code: 'product:read', description: '可以查看商品列表和详情', category: 'product' },
            { id: '4', module: '商品管理', name: '编辑商品', code: 'product:write', description: '可以添加、修改、删除商品', category: 'product' },
            { id: '5', module: '订单管理', name: '查看订单', code: 'order:read', description: '可以查看订单列表和详情', category: 'order' },
            { id: '6', module: '订单管理', name: '处理订单', code: 'order:write', description: '可以审核、发货、退款订单', category: 'order' },
            { id: '7', module: '财务管理', name: '查看财务', code: 'finance:read', description: '可以查看财务报表', category: 'finance' },
            { id: '8', module: '财务管理', name: '编辑财务', code: 'finance:write', description: '可以处理财务数据', category: 'finance' },
            { id: '9', module: '收益管理', name: '查看收益', code: 'commission:read', description: '可以查看佣金收益', category: 'commission' },
            { id: '10', module: '收益管理', name: '结算收益', code: 'commission:write', description: '可以进行收益结算', category: 'commission' },
            { id: '11', module: '团队管理', name: '查看团队', code: 'team:read', description: '可以查看团队结构', category: 'team' },
            { id: '12', module: '团队管理', name: '管理团队', code: 'team:write', description: '可以调整团队结构', category: 'team' },
            { id: '13', module: '商学院', name: '查看内容', code: 'school:read', description: '可以查看学习内容', category: 'school' },
            { id: '14', module: '商学院', name: '管理内容', code: 'school:write', description: '可以管理学习内容', category: 'school' },
            { id: '15', module: '系统设置', name: '查看设置', code: 'setting:read', description: '可以查看系统设置', category: 'setting' },
            { id: '16', module: '系统设置', name: '修改设置', code: 'setting:write', description: '可以修改系统设置', category: 'setting' },
            { id: '17', module: '权限管理', name: '查看权限', code: 'permission:read', description: '可以查看权限配置', category: 'permission' },
            { id: '18', module: '权限管理', name: '管理权限', code: 'permission:write', description: '可以管理权限配置', category: 'permission' }
          ];
          
          return {
            items: params?.search 
              ? permissions.filter(p => 
                  p.name.includes(params.search) || 
                  p.code.includes(params.search) ||
                  p.description.includes(params.search)
                )
              : permissions,
            total: permissions.length,
            page: 1,
            pageSize: 20,
            totalPages: 1
          };
        },
        { ttl: 10 * 60 * 1000 }
      );
    } catch (error) {
      console.error('获取权限列表失败:', error);
      throw error;
    }
  }

  static async getUserRoles(params?: any) {
    try {
      return await EnhancedCacheManager.getWithCache(
        `user_roles_${JSON.stringify(params)}`,
        async () => {
          // 模拟API调用
          const userRoles = [
            { id: '1', userId: '1001', roleId: '1', userName: '管理员', userAvatar: 'https://i.pravatar.cc/150?img=1', assignedAt: '2026-01-01', assignedBy: '系统' },
            { id: '2', userId: '1002', roleId: '2', userName: '张经理', userAvatar: 'https://i.pravatar.cc/150?img=2', assignedAt: '2026-01-15', assignedBy: '管理员' },
            { id: '3', userId: '1003', roleId: '2', userName: '李主管', userAvatar: 'https://i.pravatar.cc/150?img=3', assignedAt: '2026-02-01', assignedBy: '张经理' },
            { id: '4', userId: '1004', roleId: '3', userName: '王运营', userAvatar: 'https://i.pravatar.cc/150?img=4', assignedAt: '2026-02-10', assignedBy: '李主管' },
            { id: '5', userId: '1005', roleId: '4', userName: '赵会计', userAvatar: 'https://i.pravatar.cc/150?img=5', assignedAt: '2026-03-01', assignedBy: '管理员' },
            { id: '6', userId: '1006', roleId: '5', userName: '刘查看', userAvatar: 'https://i.pravatar.cc/150?img=6', assignedAt: '2026-03-15', assignedBy: '王运营' }
          ];
          
          return {
            items: userRoles,
            total: userRoles.length,
            page: 1,
            pageSize: 10,
            totalPages: 1
          };
        },
        { ttl: 5 * 60 * 1000 }
      );
    } catch (error) {
      console.error('获取用户角色列表失败:', error);
      throw error;
    }
  }

  static async assignUserRole(userId: string, roleId: string) {
    try {
      // 模拟API调用
      const newUserRole = {
        id: Date.now().toString(),
        userId,
        roleId,
        userName: `用户${userId}`,
        userAvatar: 'https://i.pravatar.cc/150?img=7',
        assignedAt: '2026-03-26',
        assignedBy: '管理员'
      };
      
      message.success('角色分配成功');
      EnhancedCacheManager.clear();
      return newUserRole;
    } catch (error) {
      message.error('角色分配失败');
      throw error;
    }
  }

  static async removeUserRole(id: string) {
    try {
      // 模拟API调用
      message.success('用户角色已移除');
      EnhancedCacheManager.clear();
    } catch (error) {
      message.error('移除用户角色失败');
      throw error;
    }
  }

  static async getSystemConfigs() {
    try {
      return await EnhancedCacheManager.getWithCache(
        'system_configs',
        async () => {
          // 模拟API调用
          return [
            { key: 'system_name', name: '系统名称', value: '静莱美代理商系统', type: 'string', description: '显示在页面标题和LOGO旁的系统名称', category: 'general' },
            { key: 'company_name', name: '公司名称', value: '静莱美生物科技有限公司', type: 'string', description: '企业的正式名称', category: 'general' },
            { key: 'system_version', name: '系统版本', value: '2.5.0', type: 'string', description: '当前系统的版本号', category: 'general' },
            { key: 'maintenance_mode', name: '维护模式', value: false, type: 'boolean', description: '开启后系统进入维护状态，用户无法访问', category: 'general' },
            { key: 'allow_registration', name: '允许注册', value: true, type: 'boolean', description: '是否允许新用户注册', category: 'user' },
            { key: 'login_attempts', name: '登录尝试次数', value: 5, type: 'number', description: '允许的最大登录失败次数', category: 'security' },
            { key: 'session_timeout', name: '会话超时时间', value: 30, type: 'number', description: '用户会话过期时间（分钟）', category: 'security' },
            { key: 'two_factor_auth', name: '双重认证', value: false, type: 'boolean', description: '是否启用双重身份验证', category: 'security' },
            { key: 'file_upload_limit', name: '文件上传限制', value: 50, type: 'number', description: '单个文件最大上传大小（MB）', category: 'system' },
            { key: 'api_rate_limit', name: 'API频率限制', value: 100, type: 'number', description: '每分钟API请求限制次数', category: 'system' },
            { key: 'backup_interval', name: '备份间隔', value: 24, type: 'number', description: '自动备份间隔时间（小时）', category: 'system' },
            { key: 'email_notifications', name: '邮件通知', value: true, type: 'boolean', description: '是否启用邮件通知功能', category: 'notification' },
            { key: 'sms_notifications', name: '短信通知', value: true, type: 'boolean', description: '是否启用短信通知功能', category: 'notification' },
            { key: 'push_notifications', name: '推送通知', value: true, type: 'boolean', description: '是否启用推送通知功能', category: 'notification' }
          ];
        },
        { ttl: 10 * 60 * 1000 }
      );
    } catch (error) {
      console.error('获取系统配置失败:', error);
      throw error;
    }
  }

  static async updateSystemConfig(key: string, value: any) {
    try {
      // 模拟API调用
      message.success(`配置"${key}"已更新`);
      EnhancedCacheManager.clear();
      return { key, value, updatedAt: '2026-03-26' };
    } catch (error) {
      message.error('配置更新失败');
      throw error;
    }
  }

  static async getSystemStats() {
    try {
      return await EnhancedCacheManager.getWithCache(
        'system_stats',
        async () => {
          // 模拟API调用
          return {
            totalRoles: 5,
            totalPermissions: 18,
            totalUserRoles: 6,
            activeUsers: 24,
            systemHealth: 98,
            apiRequestsToday: 1542,
            avgResponseTime: 23,
            memoryUsage: 68,
            cpuUsage: 42,
            lastBackupTime: '2026-03-26 08:00:00'
          };
        },
        { ttl: 2 * 60 * 1000 }
      );
    } catch (error) {
      console.error('获取系统统计失败:', error);
      throw error;
    }
  }

  // 检查当前用户权限
  static async checkCurrentUserPermission(permission: string): Promise<boolean> {
    try {
      // 模拟API调用，实际应该从用户信息或API获取
      const currentUserPermissions = ['*']; // 假设当前用户是超级管理员
      return currentUserPermissions.includes(permission) || currentUserPermissions.includes('*');
    } catch (error) {
      console.error('检查用户权限失败:', error);
      return false;
    }
  }

  // 批量检查权限
  static async checkPermissions(permissions: string[]): Promise<{ [key: string]: boolean }> {
    try {
      const results: { [key: string]: boolean } = {};
      for (const permission of permissions) {
        results[permission] = await this.checkCurrentUserPermission(permission);
      }
      return results;
    } catch (error) {
      console.error('批量检查权限失败:', error);
      return {};
    }
  }
}

// 默认导出
export default {
  VideoDataService,
  BookDataService,
  ScriptDataService,
  SchoolStatisticsService,
  GlobalDataService,
  PermissionDataService,
  apiClient,
};