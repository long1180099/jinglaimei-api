import React, { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spin, Alert } from 'antd';
import useAuth from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children?: ReactNode;
  requiredPermissions?: string[];
  requiredRole?: string;
  fallbackPath?: string;
  showLoading?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requiredRole,
  fallbackPath = '/login',
  showLoading = true,
}) => {
  const { isAuthenticated, loading, user, hasPermission, hasRole } = useAuth();

  // 加载中状态
  if (loading && showLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #f5f5f5 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 20, color: '#666' }}>
            加载中...
          </div>
        </div>
      </div>
    );
  }

  // 未认证，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  // 检查角色权限
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div style={{ 
        padding: 40, 
        maxWidth: 600, 
        margin: '0 auto',
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        marginTop: 60
      }}>
        <Alert
          message="权限不足"
          description={
            <div>
              <p>您没有访问此页面的权限。</p>
              <p>需要的角色: <strong>{requiredRole}</strong></p>
              <p>您的角色: <strong>{user?.role || '未分配'}</strong></p>
            </div>
          }
          type="error"
          showIcon
          style={{ marginBottom: 20 }}
        />
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '10px 24px',
              background: '#00C896',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#00b886'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#00C896'}
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  // 检查具体权限
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );

    if (!hasAllPermissions) {
      return (
        <div style={{ 
          padding: 40, 
          maxWidth: 600, 
          margin: '0 auto',
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          marginTop: 60
        }}>
          <Alert
            message="权限不足"
            description={
              <div>
                <p>您没有访问此页面的权限。</p>
                <div>
                  <p>需要的权限:</p>
                  <ul style={{ marginLeft: 20, marginTop: 8 }}>
                    {requiredPermissions.map(permission => (
                      <li key={permission}>
                        <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>
                          {permission}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
                <p style={{ marginTop: 20 }}>
                  请联系管理员获取相应权限。
                </p>
              </div>
            }
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
          />
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => window.history.back()}
              style={{
                padding: '10px 24px',
                background: '#00C896',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#00b886'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#00C896'}
            >
              返回上一页
            </button>
          </div>
        </div>
      );
    }
  }

  // 所有检查通过，渲染子组件或Outlet
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;