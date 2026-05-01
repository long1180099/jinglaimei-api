import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';

export interface UserInfo {
  username: string;
  role: string;
  permissions: string[];
  avatar?: string;
  email?: string;
  phone?: string;
  department?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
}

const AUTH_KEY = 'jlm_auth_token';
const USER_KEY = 'jlm_user_info';
const REMEMBER_KEY = 'jlm_remember_me';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
  });

  // 初始化时检查本地存储
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem(AUTH_KEY);
        const userData = localStorage.getItem(USER_KEY);
        
        if (token && userData) {
          const user = JSON.parse(userData);
          setAuthState({
            isAuthenticated: true,
            user,
            token,
            loading: false,
          });
        } else {
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('认证初始化失败:', error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  // 登录函数
  const login = useCallback(async (username: string, password: string, rememberMe: boolean = false) => {
    setAuthState(prev => ({ ...prev, loading: true }));
    
    try {
      const { default: apiClient } = await import('../utils/apiClient');
      const result: any = await apiClient.post('/auth/login', { username, password });
      
      const { token, userInfo } = result;
      
      // 保存到本地存储
      localStorage.setItem(AUTH_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
      localStorage.setItem('admin_token', token);
      
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, 'true');
      }
      
      setAuthState({
        isAuthenticated: true,
        user: userInfo,
        token,
        loading: false,
      });
      
      return { success: true, user: userInfo };
      
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, loading: false }));
      const errMsg = error?.message || '登录失败，请检查用户名和密码';
      return { success: false, error: errMsg };
    }
  }, []);

  // 退出登录函数
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    const rememberMe = localStorage.getItem(REMEMBER_KEY);
    if (!rememberMe) {
      localStorage.removeItem(REMEMBER_KEY);
    }
    
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
    });
    
    message.success('已退出登录');
  }, []);

  // 检查权限
  const hasPermission = useCallback((permission: string) => {
    if (!authState.user) return false;
    
    // 超级管理员拥有所有权限
    if (authState.user.role === 'super_admin' || authState.user.role === 'admin') return true;
    
    const perms = authState.user.permissions || [];
    // 通配符 * 或 all 拥有所有权限
    if (perms.includes('*') || perms.includes('all')) return true;
    
    // 检查具体权限
    return perms.includes(permission);
  }, [authState.user]);

  // 检查角色
  const hasRole = useCallback((role: string) => {
    return authState.user?.role === role;
  }, [authState.user]);

  // 刷新用户信息（模拟）
  const refreshUserInfo = useCallback(async () => {
    try {
      // 模拟API请求
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (authState.user) {
        const updatedUser = { ...authState.user };
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        setAuthState(prev => ({ ...prev, user: updatedUser }));
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
    }
  }, [authState.user]);

  return {
    ...authState,
    login,
    logout,
    hasPermission,
    hasRole,
    refreshUserInfo,
  };
};

export default useAuth;