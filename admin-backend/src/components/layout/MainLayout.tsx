import React, { useState } from 'react';
import { 
  Layout, 
  Menu, 
  Button, 
  Avatar, 
  Dropdown, 
  Typography, 
  Space,
  Badge,
  theme,
  Input,
  Tooltip,
  message
} from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  TeamOutlined,
  BookOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  UserSwitchOutlined,
  SearchOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  HomeOutlined,
  AppstoreOutlined,
  PieChartOutlined,
  RocketOutlined,
  FireOutlined,
  TrophyOutlined,
  NotificationOutlined,
  ExperimentOutlined,
  InboxOutlined,
  PictureOutlined,
  SkinOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import type { MenuProps } from 'antd';
import { useAuthContext } from '../../contexts/AuthContext';
import './MainLayout.css';
import './MainLayout.enhanced.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { user, hasPermission, hasRole, logout } = useAuthContext();

  // 菜单项权限配置: 每个菜单需要的权限码（空数组=所有人可见）
  const menuPermissionMap: Record<string, string[]> = {
    '/dashboard': [],                          // 数据看板 - 所有人可见
    '/users':     ['user:read'],               // 用户管理
    '/products':  ['product:read'],            // 商品管理
    '/orders':    ['order:read'],              // 订单管理
    '/commissions': ['commission:read'],       // 收益管理
    '/teams':     ['team:read'],               // 团队管理
    '/school':    ['school:read'],             // 商学院
    '/ai-training': ['school:write'],          // AI话术训练
    '/skin-analysis': ['user:write'],           // 皮肤分析
    '/announcements': ['setting:write'],        // 公告管理
    '/inventory': ['inventory:read'],           // 库存管理
    '/banners':   ['setting:write'],           // 轮播图管理
    '/rankings':  ['finance:read'],            // 排行榜管理
    '/action-log': ['team:write'],             // 行动日志
    '/usage-logs': ['user:read'],              // 产品使用日志
    '/settings':  ['setting:read'],            // 系统设置（仅super_admin/operator）
  };

  // 侧边栏菜单项
  const allMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined className="menu-icon" />,
      label: '数据看板',
      description: '系统概览与统计'
    },
    {
      key: '/users',
      icon: <UserOutlined className="menu-icon" />,
      label: '用户管理',
      description: '代理商与客户管理'
    },
    {
      key: '/products',
      icon: <ShoppingOutlined className="menu-icon" />,
      label: '商品管理',
      description: '商品上下架与定价'
    },
    {
      key: '/orders',
      icon: <ShoppingCartOutlined className="menu-icon" />,
      label: '订单管理',
      description: '订单审核与发货'
    },
    {
      key: '/commissions',
      icon: <DollarOutlined className="menu-icon" />,
      label: '收益管理',
      description: '佣金结算与提现'
    },
    {
      key: '/teams',
      icon: <TeamOutlined className="menu-icon" />,
      label: '团队管理',
      description: '团队结构与分析'
    },
    {
      key: '/school',
      icon: <BookOutlined className="menu-icon" />,
      label: '商学院',
      description: '学习培训与成长'
    },
    {
      key: '/ai-training',
      icon: <ExperimentOutlined className="menu-icon" style={{ color: '#722ED1' }} />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          AI话术训练
          <span style={{
            background: 'linear-gradient(135deg, #722ED1, #B37FEB)',
            color: '#fff',
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 8,
            fontWeight: 700,
            marginLeft: 6,
            lineHeight: '16px'
          }}>NEW</span>
        </span>
      ),
      description: 'AI训练与话术管理'
    },
    {
      key: '/skin-analysis',
      icon: <SkinOutlined className="menu-icon" style={{ color: '#e94560' }} />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          皮肤分析
          <span style={{
            background: 'linear-gradient(135deg, #e94560, #ff6b81)',
            color: '#fff',
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 8,
            fontWeight: 700,
            marginLeft: 6,
            lineHeight: '16px'
          }}>NEW</span>
        </span>
      ),
      description: 'AI皮肤诊断与分析'
    },
    {
      key: '/announcements',
      icon: <NotificationOutlined className="menu-icon" style={{ color: '#1890ff' }} />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          公告管理
          <span style={{
            background: 'linear-gradient(135deg, #1890ff, #69c0ff)',
            color: '#fff',
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 8,
            fontWeight: 700,
            marginLeft: 6,
            lineHeight: '16px'
          }}>NEW</span>
        </span>
      ),
      description: '企业公告与资讯'
    },
    {
      key: '/inventory',
      icon: <InboxOutlined className="menu-icon" style={{ color: '#722ED1' }} />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          库存管理
          <span style={{
            background: 'linear-gradient(135deg, #722ED1, #B37FEB)',
            color: '#fff',
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 8,
            fontWeight: 700,
            marginLeft: 6,
            lineHeight: '16px'
          }}>NEW</span>
        </span>
      ),
      description: '入库出库与数据报表'
    },
    {
      key: '/banners',
      icon: <PictureOutlined className="menu-icon" style={{ color: '#722ED1' }} />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          轮播图管理
        </span>
      ),
      description: '首页轮播图设置与维护'
    },
    {
      key: '/rankings',
      icon: <TrophyOutlined className="menu-icon" style={{ color: '#faad14' }} />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          排行榜管理
          <span style={{
            background: 'linear-gradient(135deg, #faad14, #ffd666)',
            color: '#fff',
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 8,
            fontWeight: 700,
            marginLeft: 6,
            lineHeight: '16px'
          }}>HOT</span>
        </span>
      ),
      description: '业绩排行与展示配置'
    },
    {
      key: '/action-log',
      icon: <RocketOutlined className="menu-icon" style={{ color: '#00C896' }} />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          行动日志
          <span style={{
            background: 'linear-gradient(135deg, #00C896, #00a876)',
            color: '#fff',
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 8,
            fontWeight: 700,
            marginLeft: 6,
            lineHeight: '16px'
          }}>NEW</span>
        </span>
      ),
      description: '目标管理与行动追踪'
    },
    {
      key: '/usage-logs',
      icon: <FileTextOutlined className="menu-icon" style={{ color: '#1890ff' }} />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          使用日志
          <span style={{
            background: 'linear-gradient(135deg, #1890ff, #69c0ff)',
            color: '#fff',
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 8,
            fontWeight: 700,
            marginLeft: 6,
            lineHeight: '16px'
          }}>NEW</span>
        </span>
      ),
      description: '产品使用记录管理'
    },
    {
      key: '/settings',
      icon: <SettingOutlined className="menu-icon" />,
      label: '系统设置',
      description: '配置与权限管理'
    },
  ];

  // ========== 根据角色/权限过滤菜单 ==========
  // super_admin 看到所有菜单
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  
  // 过滤后的菜单列表
  const menuItems = isSuperAdmin 
    ? allMenuItems 
    : allMenuItems.filter(item => {
        const required = menuPermissionMap[item.key] || [];
        if (required.length === 0) return true; // 无权限要求的菜单(如dashboard)
        return required.some((perm: string) => hasPermission(perm));
      });

  // 用户下拉菜单 — 自定义渲染头部卡片

  // 用户下拉菜单 — 自定义渲染头部卡片
  const userMenuHeader = (
    <div className="user-dropdown-header">
      <Avatar
        size={44}
        src="https://randomuser.me/api/portraits/men/32.jpg"
        className="dropdown-avatar"
      />
      <div className="dropdown-user-info">
        <div className="dropdown-user-name">{user?.username || '管理员'}</div>
        <div className="dropdown-user-email">{user?.email || 'admin@jinglaimei.com'}</div>
        <div className="dropdown-user-role">
          <span className="role-badge">超级管理员</span>
        </div>
      </div>
    </div>
  );

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'header',
      label: userMenuHeader,
      disabled: true,
      className: 'user-menu-header-item',
    },
    {
      type: 'divider',
    },
    {
      key: 'profile',
      label: '个人中心',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: '账号设置',
      icon: <SettingOutlined />,
    },
    {
      key: 'switch',
      label: '切换角色',
      icon: <UserSwitchOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'help',
      label: '帮助中心',
      icon: <QuestionCircleOutlined />,
    },
    {
      key: 'feedback',
      label: '问题反馈',
      icon: <MessageOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  // 通知菜单项
  const notificationItems: MenuProps['items'] = [
    {
      key: 'orders',
      label: (
        <div className="notification-item">
          <div className="notification-title">新订单通知</div>
          <div className="notification-content">用户张三下单 ¥2,580.00</div>
          <div className="notification-time">2分钟前</div>
        </div>
      ),
      icon: <ShoppingCartOutlined style={{ color: 'var(--color-success)' }} />,
    },
    {
      key: 'withdraw',
      label: (
        <div className="notification-item">
          <div className="notification-title">提现申请</div>
          <div className="notification-content">李四申请提现 ¥5,000.00</div>
          <div className="notification-time">30分钟前</div>
        </div>
      ),
      icon: <DollarOutlined style={{ color: 'var(--color-warning)' }} />,
    },
    {
      key: 'system',
      label: (
        <div className="notification-item">
          <div className="notification-title">系统公告</div>
          <div className="notification-content">新版本v2.0即将发布</div>
          <div className="notification-time">2小时前</div>
        </div>
      ),
      icon: <BellOutlined style={{ color: 'var(--color-info)' }} />,
    },
    {
      key: 'team',
      label: (
        <div className="notification-item">
          <div className="notification-title">团队动态</div>
          <div className="notification-content">王五团队新增3名成员</div>
          <div className="notification-time">5小时前</div>
        </div>
      ),
      icon: <TeamOutlined style={{ color: 'var(--color-primary)' }} />,
    },
  ];

  // 处理菜单点击
  const handleMenuClick = (e: any) => {
    navigate(e.key);
  };

  // 处理用户菜单点击
  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'profile':
        navigate('/profile');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'switch':
        message.info('角色切换功能正在开发中');
        break;
      case 'help':
        window.open('https://help.jinglaimei.com', '_blank');
        break;
      case 'feedback':
        message.info('问题反馈功能正在开发中');
        break;
      case 'logout':
        logout();
        navigate('/login');
        break;
      default:
        break;
    }
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    if (value.trim()) {
      // 这里可以跳转到搜索页面或显示搜索结果
      console.log('搜索:', value);
    }
  };

  // 获取当前选中的菜单项
  const selectedKeys = [location.pathname];

  return (
    <Layout className="main-layout-wrapper" style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={260}
        className={`sidebar-modern ${collapsed ? 'collapsed' : ''}`}
        style={{
          position: 'relative',
          zIndex: 100,
        }}
      >
        {/* Logo区域 */}
        <div className="logo-container-modern">
          {collapsed ? (
            <div className="logo-mini">
              <div className="logo-icon-modern">
                静
              </div>
            </div>
          ) : (
            <div className="logo-full">
              <div className="logo-icon-modern">
                静
              </div>
              <div className="logo-text-modern">
                <Title level={4} className="logo-title-modern">静莱美</Title>
                <Text className="logo-subtitle-modern">代理商管理系统</Text>
              </div>
            </div>
          )}
        </div>

        {/* 搜索框 */}
        {!collapsed && (
          <div className="sidebar-search-modern">
            <Search
              placeholder="搜索功能或内容..."
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
            />
          </div>
        )}

        {/* 菜单区域 */}
        <div className="menu-container-modern">
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            items={menuItems.map(item => ({
              ...item,
              icon: React.cloneElement(item.icon as React.ReactElement, { className: 'menu-icon-modern' }),
              label: typeof item.label === 'string' ? (
                <div className="menu-label-modern">
                  <span className="menu-title-modern">{item.label}</span>
                  {'description' in item && <span className="menu-desc-modern">{(item as any).description}</span>}
                </div>
              ) : item.label
            }))}
            onClick={handleMenuClick}
            className="sidebar-menu-modern"
          />
        </div>

        {/* 折叠按钮 */}
        <div className="sidebar-footer-modern">
          <Tooltip title={collapsed ? "展开菜单" : "折叠菜单"} placement="right">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="collapse-button-modern"
            />
          </Tooltip>
        </div>
      </Sider>

      <Layout className="main-content">
        {/* 顶部导航栏 */}
        <Header className="header-modern">
          {/* 左侧：面包屑和快速操作 */}
          <div className="header-left-modern">
            <Tooltip title={collapsed ? "展开菜单" : "折叠菜单"}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                className="menu-toggle-button-modern"
              />
            </Tooltip>
            
            <div className="breadcrumb-modern">
              <Space>
                <HomeOutlined style={{ fontSize: 14, color: 'var(--text-tertiary)' }} />
                <Text type="secondary">/</Text>
                <Text style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {menuItems.find(item => item.key === location.pathname)?.label || '数据看板'}
                </Text>
              </Space>
            </div>
          </div>

          {/* 右侧：用户操作 */}
          <div className="header-right-modern">
            {/* 全局搜索 */}
            <Search
              placeholder="搜索订单、用户或商品..."
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              className="header-search-modern"
            />

            {/* 通知按钮 */}
            <Dropdown
              menu={{ items: notificationItems }}
              placement="bottomRight"
              trigger={['click']}
              overlayClassName="notification-dropdown dropdown-menu-modern"
            >
              <Badge count={4} size="small" className="notification-badge-modern">
                <Button 
                  type="text" 
                  icon={<BellOutlined />}
                  className="header-icon-button-modern notification-btn"
                />
              </Badge>
            </Dropdown>

            {/* 帮助按钮 */}
            <Tooltip title="帮助中心">
              <Button 
                type="text" 
                icon={<QuestionCircleOutlined />}
                className="header-icon-button-modern"
                onClick={() => window.open('https://help.jinglaimei.com', '_blank')}
              />
            </Tooltip>

            {/* 用户信息 */}
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              trigger={['click']}
              overlayClassName="user-dropdown-overlay dropdown-menu-modern"
              placement="bottomRight"
            >
              <div className="user-info-modern">
                <Badge dot status="success" offset={[-3, 36]}>
                  <Avatar 
                    size="default" 
                    src="https://randomuser.me/api/portraits/men/32.jpg"
                    className="user-avatar-modern"
                  />
                </Badge>
                <div className="user-details-modern">
                  <div className="user-name-modern">{user?.username || '管理员'}</div>
                  <div className="user-role-modern">{user?.role || '超级管理员'}</div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 主要内容区域 */}
        <Content className="content-modern">
          <div className="content-inner-modern">
            {children || <Outlet />}
          </div>
        </Content>

        {/* 页脚 */}
        <div className="footer-modern">
          <div className="footer-content-modern">
            <Space>
              <Text className="footer-text-modern">© 2026 静莱美代理商系统</Text>
              <Text className="footer-text-modern">·</Text>
              <a href="#" className="footer-link-modern">用户协议</a>
              <Text className="footer-text-modern">·</Text>
              <a href="#" className="footer-link-modern">隐私政策</a>
              <Text className="footer-text-modern">·</Text>
              <a href="#" className="footer-link-modern">联系我们</a>
            </Space>
            <Text className="footer-text-modern">版本 v2.0.0</Text>
          </div>
        </div>
      </Layout>
    </Layout>
  );
};

export default MainLayout;