import React, { useState } from 'react';
import {
  Row, Col, Card, Avatar, Typography, Button, Form,
  Input, Select, Tabs, Tag, Progress, Switch,
  Divider, Space, Upload, message, Badge, Timeline,
  Statistic, Tooltip, Modal
} from 'antd';
import {
  UserOutlined, EditOutlined, SaveOutlined, LockOutlined,
  BellOutlined, SafetyOutlined, CameraOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ShoppingOutlined, DollarOutlined,
  TeamOutlined, TrophyOutlined, StarOutlined, FireOutlined,
  PhoneOutlined, MailOutlined, EnvironmentOutlined,
  IdcardOutlined, CalendarOutlined, LogoutOutlined,
  EyeOutlined, EyeInvisibleOutlined, KeyOutlined,
  MobileOutlined, QrcodeOutlined, AppstoreOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import './ProfileCenter.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const ProfileCenter: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();

  // 模拟用户数据
  const profileData = {
    name: user?.username || '管理员',
    role: '超级管理员',
    level: 'VIP',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    email: user?.email || 'admin@jinglaimei.com',
    phone: '138****8888',
    region: '广东省 深圳市',
    joinDate: '2025-01-10',
    lastLogin: '2026-03-28 19:00',
    bio: '静莱美代理商系统管理员，负责平台运营与维护。',
    badges: ['创始成员', '优秀管理员', '月度之星'],
    stats: {
      orders: 1286,
      revenue: 328500,
      team: 45,
      score: 98
    }
  };

  // 操作记录
  const operationLogs = [
    { time: '03-28 19:00', action: '登录系统', type: 'info', detail: 'IP: 192.168.1.100' },
    { time: '03-28 18:45', action: '修改商品价格', type: 'edit', detail: '胶原蛋白口服液 ¥298→¥318' },
    { time: '03-28 17:30', action: '审核订单', type: 'approve', detail: '订单 JL202603280089 通过' },
    { time: '03-28 16:00', action: '新增代理商', type: 'create', detail: '用户 李明 注册成为会员' },
    { time: '03-28 14:20', action: '导出报表', type: 'export', detail: '3月销售报表.xlsx' },
    { time: '03-28 10:05', action: '调整权限', type: 'security', detail: '修改角色权限配置' },
  ];

  const logTypeConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    info: { color: '#1890ff', icon: <ClockCircleOutlined /> },
    edit: { color: '#faad14', icon: <EditOutlined /> },
    approve: { color: '#52c41a', icon: <CheckCircleOutlined /> },
    create: { color: '#00C896', icon: <UserOutlined /> },
    export: { color: '#722ED1', icon: <DollarOutlined /> },
    security: { color: '#f5222d', icon: <SafetyOutlined /> },
  };

  // 通知设置
  const [notifySettings, setNotifySettings] = useState({
    newOrder: true,
    withdraw: true,
    teamJoin: false,
    systemAlert: true,
    weeklyReport: true,
    marketingNews: false,
  });

  const notifyItems = [
    { key: 'newOrder', label: '新订单提醒', desc: '有新订单时推送通知' },
    { key: 'withdraw', label: '提现申请', desc: '代理商提现申请通知' },
    { key: 'teamJoin', label: '团队新成员', desc: '新成员加入团队时通知' },
    { key: 'systemAlert', label: '系统预警', desc: '系统异常或告警通知' },
    { key: 'weeklyReport', label: '周报推送', desc: '每周一推送数据周报' },
    { key: 'marketingNews', label: '营销资讯', desc: '行业动态与营销技巧' },
  ];

  const handleSaveProfile = () => {
    form.validateFields().then(() => {
      message.success('个人信息保存成功');
      setEditMode(false);
    });
  };

  const handleSavePassword = () => {
    pwdForm.validateFields().then(() => {
      message.success('密码修改成功，请重新登录');
      pwdForm.resetFields();
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="profile-container">
      {/* 顶部 Banner */}
      <div className="profile-banner">
        <div className="banner-bg" />
        <div className="banner-content">
          {/* 头像区域 */}
          <div className="avatar-section">
            <div className="avatar-wrapper">
              <Avatar
                size={96}
                src={profileData.avatar}
                className="profile-avatar"
              />
              <Tooltip title="更换头像">
                <div className="avatar-edit-btn">
                  <CameraOutlined />
                </div>
              </Tooltip>
            </div>
            <div className="profile-identity">
              <div className="profile-name">
                {profileData.name}
                <Tag color="gold" className="level-tag">
                  <StarOutlined /> {profileData.level}
                </Tag>
              </div>
              <div className="profile-role">
                <SafetyOutlined /> {profileData.role}
              </div>
              <div className="profile-badges">
                {profileData.badges.map(badge => (
                  <Tag key={badge} className="badge-tag">
                    <TrophyOutlined /> {badge}
                  </Tag>
                ))}
              </div>
            </div>
          </div>

          {/* 核心统计 */}
          <div className="banner-stats">
            <div className="banner-stat-item">
              <Statistic
                title={<span className="stat-label">累计订单</span>}
                value={profileData.stats.orders}
                suffix="笔"
                prefix={<ShoppingOutlined />}
                valueStyle={{ color: '#fff', fontSize: 22 }}
              />
            </div>
            <div className="banner-stat-divider" />
            <div className="banner-stat-item">
              <Statistic
                title={<span className="stat-label">累计收益</span>}
                value={profileData.stats.revenue}
                prefix={<><DollarOutlined /> ¥</>}
                valueStyle={{ color: '#fff', fontSize: 22 }}
              />
            </div>
            <div className="banner-stat-divider" />
            <div className="banner-stat-item">
              <Statistic
                title={<span className="stat-label">团队规模</span>}
                value={profileData.stats.team}
                suffix="人"
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#fff', fontSize: 22 }}
              />
            </div>
            <div className="banner-stat-divider" />
            <div className="banner-stat-item">
              <Statistic
                title={<span className="stat-label">信用评分</span>}
                value={profileData.stats.score}
                suffix="分"
                prefix={<FireOutlined />}
                valueStyle={{ color: '#FFD700', fontSize: 22 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="profile-main">
        <Row gutter={[20, 20]}>
          {/* 左侧卡片：快捷信息 */}
          <Col xs={24} lg={6}>
            {/* 基础信息卡 */}
            <Card className="profile-side-card" bordered={false}>
              <div className="side-info-item">
                <MailOutlined className="side-icon" />
                <div>
                  <div className="side-label">邮箱</div>
                  <div className="side-value">{profileData.email}</div>
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="side-info-item">
                <PhoneOutlined className="side-icon" />
                <div>
                  <div className="side-label">手机</div>
                  <div className="side-value">{profileData.phone}</div>
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="side-info-item">
                <EnvironmentOutlined className="side-icon" />
                <div>
                  <div className="side-label">地区</div>
                  <div className="side-value">{profileData.region}</div>
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="side-info-item">
                <CalendarOutlined className="side-icon" />
                <div>
                  <div className="side-label">加入时间</div>
                  <div className="side-value">{profileData.joinDate}</div>
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="side-info-item">
                <ClockCircleOutlined className="side-icon" />
                <div>
                  <div className="side-label">上次登录</div>
                  <div className="side-value">{profileData.lastLogin}</div>
                </div>
              </div>
            </Card>

            {/* 账号安全评分 */}
            <Card
              className="profile-side-card security-card"
              bordered={false}
              title={<><SafetyOutlined /> 账号安全</>}
              style={{ marginTop: 16 }}
            >
              <div className="security-score-wrap">
                <Progress
                  type="circle"
                  percent={85}
                  strokeColor={{ '0%': '#00C896', '100%': '#1890ff' }}
                  format={() => (
                    <div className="security-score-center">
                      <div className="score-num">85</div>
                      <div className="score-label">安全分</div>
                    </div>
                  )}
                  size={100}
                />
              </div>
              <div className="security-checklist">
                <div className="security-check-item ok">
                  <CheckCircleOutlined /> 已绑定手机号
                </div>
                <div className="security-check-item ok">
                  <CheckCircleOutlined /> 已设置登录密码
                </div>
                <div className="security-check-item ok">
                  <CheckCircleOutlined /> 已绑定邮箱
                </div>
                <div className="security-check-item warn">
                  <SafetyOutlined /> 未开启两步验证
                </div>
              </div>
              <Button
                type="primary"
                ghost
                block
                icon={<SafetyOutlined />}
                style={{ marginTop: 12 }}
                onClick={() => setActiveTab('security')}
              >
                提升安全等级
              </Button>
            </Card>

            {/* 退出登录 */}
            <Button
              danger
              block
              icon={<LogoutOutlined />}
              style={{ marginTop: 16, height: 44, borderRadius: 10 }}
              onClick={() => setLogoutModalVisible(true)}
            >
              退出登录
            </Button>
          </Col>

          {/* 右侧主要内容 */}
          <Col xs={24} lg={18}>
            <Card bordered={false} className="profile-main-card">
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                className="profile-tabs"
                tabBarExtraContent={
                  activeTab === 'info' && (
                    <Space>
                      {editMode ? (
                        <>
                          <Button onClick={() => setEditMode(false)}>取消</Button>
                          <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSaveProfile}
                          >
                            保存
                          </Button>
                        </>
                      ) : (
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => setEditMode(true)}
                        >
                          编辑资料
                        </Button>
                      )}
                    </Space>
                  )
                }
                items={[
                  {
                    key: 'info',
                    label: <span><IdcardOutlined /> 基本资料</span>,
                    children: (
                      <div className="tab-content">
                        <Form
                          form={form}
                          layout="vertical"
                          initialValues={{
                            name: profileData.name,
                            email: profileData.email,
                            phone: '13800008888',
                            region: '广东省',
                            city: '深圳市',
                            bio: profileData.bio,
                          }}
                          disabled={!editMode}
                        >
                          <Row gutter={[20, 0]}>
                            <Col xs={24} sm={12}>
                              <Form.Item label="姓名 / 昵称" name="name" rules={[{ required: true }]}>
                                <Input prefix={<UserOutlined />} placeholder="请输入姓名" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item label="手机号码" name="phone" rules={[{ required: true }]}>
                                <Input prefix={<MobileOutlined />} placeholder="请输入手机号" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item label="邮箱地址" name="email" rules={[{ type: 'email' }]}>
                                <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item label="所在省份" name="region">
                                <Select placeholder="请选择省份">
                                  <Option value="广东省">广东省</Option>
                                  <Option value="北京市">北京市</Option>
                                  <Option value="上海市">上海市</Option>
                                  <Option value="浙江省">浙江省</Option>
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}>
                              <Form.Item label="所在城市" name="city">
                                <Input prefix={<EnvironmentOutlined />} placeholder="请输入城市" />
                              </Form.Item>
                            </Col>
                            <Col xs={24}>
                              <Form.Item label="个人简介" name="bio">
                                <Input.TextArea
                                  rows={3}
                                  placeholder="介绍一下自己..."
                                  maxLength={200}
                                  showCount
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Form>

                        {!editMode && (
                          <>
                            <Divider />
                            {/* 我的功能入口 */}
                            <div className="my-functions">
                              <Title level={5} className="functions-title">
                                <AppstoreOutlined /> 我的功能
                              </Title>
                              <Row gutter={[12, 12]}>
                                {[
                                  { icon: <ShoppingOutlined />, label: '我的订单', count: 1286, color: '#00C896', path: '/orders' },
                                  { icon: <DollarOutlined />, label: '我的收益', count: '¥328k', color: '#FF8A00', path: '/commissions' },
                                  { icon: <TeamOutlined />, label: '我的团队', count: 45, color: '#1890FF', path: '/teams' },
                                  { icon: <TrophyOutlined />, label: '我的勋章', count: 3, color: '#722ED1', path: '#' },
                                  { icon: <SafetyOutlined />, label: '账号安全', count: null, color: '#52c41a', path: null },
                                  { icon: <BellOutlined />, label: '消息通知', count: 4, color: '#F5222D', path: null },
                                ].map((fn) => (
                                  <Col xs={12} sm={8} key={fn.label}>
                                    <div
                                      className="function-card"
                                      onClick={() => {
                                        if (fn.path === null) {
                                          if (fn.label === '账号安全') setActiveTab('security');
                                          else if (fn.label === '消息通知') setActiveTab('notify');
                                        } else if (fn.path !== '#') {
                                          navigate(fn.path);
                                        }
                                      }}
                                    >
                                      <div
                                        className="function-icon"
                                        style={{ background: `${fn.color}18`, color: fn.color }}
                                      >
                                        {fn.icon}
                                      </div>
                                      <div className="function-label">{fn.label}</div>
                                      {fn.count !== null && (
                                        <div className="function-count" style={{ color: fn.color }}>
                                          {fn.count}
                                        </div>
                                      )}
                                    </div>
                                  </Col>
                                ))}
                              </Row>
                            </div>
                          </>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'security',
                    label: <span><SafetyOutlined /> 安全设置</span>,
                    children: (
                      <div className="tab-content">
                        {/* 修改密码 */}
                        <Card className="security-section" bordered={false} style={{ background: '#fafafa', borderRadius: 12 }}>
                          <div className="security-section-header">
                            <div>
                              <div className="section-title"><LockOutlined /> 登录密码</div>
                              <div className="section-desc">建议定期更换密码，确保账号安全</div>
                            </div>
                            <Tag color="green">已设置</Tag>
                          </div>
                          <Form form={pwdForm} layout="vertical" style={{ marginTop: 16 }}>
                            <Row gutter={[20, 0]}>
                              <Col xs={24} sm={12}>
                                <Form.Item
                                  label="当前密码"
                                  name="oldPassword"
                                  rules={[{ required: true, message: '请输入当前密码' }]}
                                >
                                  <Input.Password
                                    prefix={<KeyOutlined />}
                                    placeholder="请输入当前密码"
                                    visibilityToggle={{ visible: passwordVisible, onVisibleChange: setPasswordVisible }}
                                  />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item
                                  label="新密码"
                                  name="newPassword"
                                  rules={[{ required: true, min: 8, message: '密码至少8位' }]}
                                >
                                  <Input.Password
                                    prefix={<LockOutlined />}
                                    placeholder="至少8位，含字母和数字"
                                    visibilityToggle={{ visible: newPasswordVisible, onVisibleChange: setNewPasswordVisible }}
                                  />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item
                                  label="确认新密码"
                                  name="confirmPassword"
                                  dependencies={['newPassword']}
                                  rules={[
                                    { required: true, message: '请再次输入密码' },
                                    ({ getFieldValue }) => ({
                                      validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) {
                                          return Promise.resolve();
                                        }
                                        return Promise.reject('两次输入密码不一致');
                                      },
                                    }),
                                  ]}
                                >
                                  <Input.Password prefix={<LockOutlined />} placeholder="再次输入新密码" />
                                </Form.Item>
                              </Col>
                            </Row>
                            <Button type="primary" icon={<SaveOutlined />} onClick={handleSavePassword}>
                              更新密码
                            </Button>
                          </Form>
                        </Card>

                        <Divider />

                        {/* 绑定手机 */}
                        <div className="security-row">
                          <div className="security-row-left">
                            <div className="security-row-icon" style={{ background: '#00C89620', color: '#00C896' }}>
                              <MobileOutlined />
                            </div>
                            <div>
                              <div className="security-row-title">绑定手机</div>
                              <div className="security-row-desc">已绑定 138****8888</div>
                            </div>
                          </div>
                          <Tag color="green"><CheckCircleOutlined /> 已绑定</Tag>
                        </div>

                        <Divider />

                        {/* 绑定邮箱 */}
                        <div className="security-row">
                          <div className="security-row-left">
                            <div className="security-row-icon" style={{ background: '#1890ff20', color: '#1890ff' }}>
                              <MailOutlined />
                            </div>
                            <div>
                              <div className="security-row-title">绑定邮箱</div>
                              <div className="security-row-desc">已绑定 {profileData.email}</div>
                            </div>
                          </div>
                          <Tag color="green"><CheckCircleOutlined /> 已绑定</Tag>
                        </div>

                        <Divider />

                        {/* 两步验证 */}
                        <div className="security-row">
                          <div className="security-row-left">
                            <div className="security-row-icon" style={{ background: '#faad1420', color: '#faad14' }}>
                              <QrcodeOutlined />
                            </div>
                            <div>
                              <div className="security-row-title">两步验证（2FA）</div>
                              <div className="security-row-desc">通过 Google Authenticator 二次验证登录</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tag color="orange">未开启</Tag>
                            <Button type="primary" size="small" ghost onClick={() => message.info('功能开发中')}>
                              立即开启
                            </Button>
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'notify',
                    label: <span><BellOutlined /> 通知设置</span>,
                    children: (
                      <div className="tab-content">
                        <div className="notify-header">
                          <Text type="secondary">管理你接收通知的方式和类型</Text>
                        </div>
                        <div className="notify-list">
                          {notifyItems.map((item) => (
                            <div key={item.key} className="notify-item">
                              <div className="notify-item-info">
                                <div className="notify-item-label">{item.label}</div>
                                <div className="notify-item-desc">{item.desc}</div>
                              </div>
                              <Switch
                                checked={notifySettings[item.key as keyof typeof notifySettings]}
                                onChange={(checked) =>
                                  setNotifySettings((prev) => ({ ...prev, [item.key]: checked }))
                                }
                              />
                            </div>
                          ))}
                        </div>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          style={{ marginTop: 20 }}
                          onClick={() => message.success('通知设置已保存')}
                        >
                          保存设置
                        </Button>
                      </div>
                    ),
                  },
                  {
                    key: 'logs',
                    label: <span><ClockCircleOutlined /> 操作记录</span>,
                    children: (
                      <div className="tab-content">
                        <Timeline
                          className="operation-timeline"
                          items={operationLogs.map((log) => ({
                            dot: (
                              <div
                                className="timeline-dot"
                                style={{ color: logTypeConfig[log.type]?.color }}
                              >
                                {logTypeConfig[log.type]?.icon}
                              </div>
                            ),
                            children: (
                              <div className="timeline-item">
                                <div className="timeline-main">
                                  <span className="timeline-action">{log.action}</span>
                                  <span className="timeline-detail">{log.detail}</span>
                                </div>
                                <div className="timeline-time">{log.time}</div>
                              </div>
                            ),
                          }))}
                        />
                        <div className="load-more">
                          <Button type="link">加载更多记录</Button>
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 退出确认弹窗 */}
      <Modal
        title={<><LogoutOutlined /> 确认退出</>}
        open={logoutModalVisible}
        onOk={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
        okText="确认退出"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        centered
        width={380}
      >
        <div style={{ padding: '8px 0', color: '#666' }}>
          确定要退出登录吗？退出后需要重新输入账号密码。
        </div>
      </Modal>
    </div>
  );
};

export default ProfileCenter;
