import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagementNew from './pages/UserManagementNew';
import ProductManagementNew from './pages/ProductManagementNew';
import OrderManagementNew from './pages/OrderManagementNew';
import CommissionManagementNew from './pages/CommissionManagementNew';
import TeamManagementNew from './pages/TeamManagementNew';
import SchoolManagementNew from './pages/SchoolManagementNew';
import SettingsManagementNew from './pages/SettingsManagementNew';
import ProfileCenter from './pages/ProfileCenter';
import ActionLog from './pages/ActionLog';
import AnnouncementManagement from './pages/AnnouncementManagement';
import AITrainingManagement from './pages/AITrainingManagement';
import InventoryManagement from './pages/InventoryManagement';
import RankingManagement from './pages/RankingManagement';
import BannerManagement from './pages/BannerManagement';
import SkinAnalysisManagement from './pages/SkinAnalysisManagement';
import ProductUsageManagement from './pages/ProductUsageManagement';
import ProtectedRoute from './components/auth/ProtectedRoute';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* 公开路由 - 登录页面 */}
            <Route path="/login" element={<Login />} />
            
            {/* 默认重定向 */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 受保护的路由 - 带权限控制 */}
            <Route element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<ProtectedRoute requiredPermissions={['user:read']}><UserManagementNew /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute requiredPermissions={['product:read']}><ProductManagementNew /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute requiredPermissions={['order:read']}><OrderManagementNew /></ProtectedRoute>} />
              <Route path="/commissions" element={<ProtectedRoute requiredPermissions={['commission:read']}><CommissionManagementNew /></ProtectedRoute>} />
              <Route path="/teams" element={<ProtectedRoute requiredPermissions={['team:read']}><TeamManagementNew /></ProtectedRoute>} />
              <Route path="/school" element={<ProtectedRoute requiredPermissions={['school:read']}><SchoolManagementNew /></ProtectedRoute>} />
              <Route path="/announcements" element={<ProtectedRoute requiredPermissions={['setting:write']}><AnnouncementManagement /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute requiredRole="super_admin"><SettingsManagementNew /></ProtectedRoute>} />
              <Route path="/profile" element={<ProfileCenter />} />
              <Route path="/action-log" element={<ProtectedRoute requiredPermissions={['team:write']}><ActionLog /></ProtectedRoute>} />
              <Route path="/ai-training" element={<ProtectedRoute requiredPermissions={['school:write']}><AITrainingManagement /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute requiredPermissions={['inventory:read']}><InventoryManagement /></ProtectedRoute>} />
              <Route path="/rankings" element={<ProtectedRoute requiredPermissions={['finance:read']}><RankingManagement /></ProtectedRoute>} />
              <Route path="/banners" element={<ProtectedRoute requiredPermissions={['setting:write']}><BannerManagement /></ProtectedRoute>} />
              <Route path="/skin-analysis" element={<ProtectedRoute requiredPermissions={['user:write']}><SkinAnalysisManagement /></ProtectedRoute>} />
              <Route path="/usage-logs" element={<ProtectedRoute requiredPermissions={['user:read']}><ProductUsageManagement /></ProtectedRoute>} />
            </Route>
            
            {/* 404 页面 */}
            <Route path="*" element={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                flexDirection: 'column',
                padding: 40,
                background: 'linear-gradient(135deg, #f0f9ff 0%, #f5f5f5 100%)'
              }}>
                <h1 style={{ fontSize: 48, marginBottom: 20, color: '#ddd' }}>404</h1>
                <p style={{ fontSize: 18, color: '#666', marginBottom: 30 }}>页面未找到</p>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  style={{
                    padding: '12px 28px',
                    background: '#00C896',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 16,
                    fontWeight: 500,
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#00b886'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#00C896'}
                >
                  返回首页
                </button>
              </div>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;