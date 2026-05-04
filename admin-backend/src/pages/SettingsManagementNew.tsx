import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Tabs,
  Avatar,
  message,
  Popconfirm,
  Divider,
  Statistic,
  Badge,
  Alert,
  Timeline,
  Descriptions,
  Tooltip,
  Upload,
  Progress
} from 'antd';
import {
  SettingOutlined,
  SafetyOutlined,
  UserOutlined,
  TeamOutlined,
  LockOutlined,
  AuditOutlined,
  BellOutlined,
  DatabaseOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  KeyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  GlobalOutlined,
  ApiOutlined,
  MonitorOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  SearchOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './SettingsManagement.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// 角色数据类型
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// 权限数据类型
interface Permission {
  id: string;
  module: string;
  name: string;
  code: string;
  description: string;
  category: string;
}

// 用户角色关联
interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  userName: string;
  userAvatar: string;
  assignedAt: string;
  assignedBy: string;
}

// 管理员账户
interface AdminAccount {
  id: number;
  username: string;
  realName: string;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
  status: number;
  lastLoginAt: string;
  createdAt: string;
}

// 系统配置项
interface SystemConfig {
  key: string;
  name: string;
  value: string | boolean | number;
  type: 'string' | 'boolean' | 'number' | 'select';
  description: string;
  category: string;
  options?: { label: string; value: string | number }[];
}

// 默认角色列表（仅当后端没有保存配置时作为兜底）
const DEFAULT_ROLES: Role[] = [
    {
      id: '1',
      name: '超级管理员',
      description: '拥有系统所有权限',
      permissions: ['*'],
      userCount: 1,
      status: 'active',
      createdAt: '2026-01-01',
      updatedAt: '2026-03-25'
    },
    {
      id: '2',
      name: '系统管理员',
      description: '管理用户和权限配置',
      permissions: ['user:read', 'user:write', 'role:read', 'role:write'],
      userCount: 3,
      status: 'active',
      createdAt: '2026-01-15',
      updatedAt: '2026-03-24'
    },
    {
      id: '3',
      name: '运营管理员',
      description: '负责内容管理和运营',
      permissions: ['content:read', 'content:write', 'order:read', 'product:read'],
      userCount: 5,
      status: 'active',
      createdAt: '2026-02-01',
      updatedAt: '2026-03-22'
    },
    {
      id: '4',
      name: '财务管理员',
      description: '管理财务和佣金结算',
      permissions: ['finance:read', 'finance:write', 'commission:read', 'commission:write'],
      userCount: 2,
      status: 'active',
      createdAt: '2026-02-10',
      updatedAt: '2026-03-20'
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
    },
    {
      id: '6',
      name: '仓库管理员',
      description: '负责订单发货、打印出库单、库存管理',
      permissions: ['order:read', 'order:write', 'product:read', 'inventory:read', 'inventory:write'],
      userCount: 0,
      status: 'active',
      createdAt: '2026-04-24',
      updatedAt: '2026-04-24'
    }
  ];

const SettingsManagementNew: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [roles, setRoles] = useState<Role[]>([]);

  const [permissions, setPermissions] = useState<Permission[]>([
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
    { id: '18', module: '权限管理', name: '管理权限', code: 'permission:write', description: '可以管理权限配置', category: 'permission' },
    { id: '19', module: '库存管理', name: '查看库存', code: 'inventory:read', description: '可以查看库存列表、出入库记录、库存报表', category: 'inventory' },
    { id: '20', module: '库存管理', name: '管理库存', code: 'inventory:write', description: '可以进行入库、出库、盘点等操作', category: 'inventory' }
  ]);

  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userRolesLoading, setUserRolesLoading] = useState(false);

  const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([
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
  ]);

  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [userRoleModalVisible, setUserRoleModalVisible] = useState(false);
  const [roleForm] = Form.useForm();

  // 分配用户弹窗状态
  const [assignRole, setAssignRole] = useState<Role | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assignUsers, setAssignUsers] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSelectedKeys, setAssignSelectedKeys] = useState<React.Key[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // 角色对应默认权限映射（默认值，可被后端配置覆盖）
  const defaultRolePermissionsMap: Record<string, string[]> = {
    super_admin: ['*'],
    admin: ['*'],
    operator: ['dashboard:read', 'order:read', 'order:write', 'product:read', 'product:write', 'user:read', 'user:write', 'inventory:read', 'inventory:write', 'setting:read', 'setting:write', 'school:read', 'school:write'],
    finance: ['dashboard:read', 'finance:read', 'finance:write', 'commission:read', 'commission:write', 'order:read'],
    warehouse: ['order:read', 'order:write', 'product:read', 'inventory:read', 'inventory:write'],
    viewer: ['dashboard:read', 'user:read', 'product:read', 'order:read', 'finance:read', 'inventory:read'],
  };
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, string[]>>(defaultRolePermissionsMap);

  // ========== 管理员账户管理状态 ==========
  const [adminList, setAdminList] = useState<AdminAccount[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [adminFormLoading, setAdminFormLoading] = useState(false);
  const [resetPwdAdmin, setResetPwdAdmin] = useState<AdminAccount | null>(null);

  // 角色表格列定义
  const roleColumns: ColumnsType<Role> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar 
            size="small" 
            style={{ 
              backgroundColor: record.id === '1' ? '#ff4d4f' : 
                            record.id === '2' ? '#1890ff' : 
                            record.id === '3' ? '#52c41a' : 
                            record.id === '4' ? '#faad14' : 
                            record.id === '6' ? '#13c2c2' :
                            '#722ed1' 
            }}
          >
            {record.name.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>{text}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
          </div>
        </Space>
      )
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions) => (
        <Tag color={permissions.includes('*') ? 'red' : 'blue'}>
          {permissions.includes('*') ? '全部权限' : `${permissions.length}个权限`}
        </Tag>
      )
    },
    {
      title: '用户数量',
      dataIndex: 'userCount',
      key: 'userCount',
      render: (count) => (
        <Statistic value={count} valueStyle={{ fontSize: '16px' }} />
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 'active' ? 'success' : 'error'} 
          text={status === 'active' ? '启用' : '停用'} 
        />
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date) => (
        <Text type="secondary">{date}</Text>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditRole(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<UserOutlined />}
            onClick={() => handleAssignUsers(record)}
          >
            分配用户
          </Button>
          {record.id !== '1' && (
            <Popconfirm
              title="确定要删除这个角色吗？"
              description="删除后该角色的用户将失去相应权限。"
              onConfirm={() => handleDeleteRole(record.id)}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  // 权限表格列定义
  const permissionColumns: ColumnsType<Permission> = [
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      filters: [
        { text: '用户管理', value: '用户管理' },
        { text: '商品管理', value: '商品管理' },
        { text: '订单管理', value: '订单管理' },
        { text: '财务管理', value: '财务管理' },
        { text: '团队管理', value: '团队管理' },
        { text: '商学院', value: '商学院' },
        { text: '系统设置', value: '系统设置' },
        { text: '权限管理', value: '权限管理' },
        { text: '库存管理', value: '库存管理' }
      ],
      onFilter: (value, record) => record.module === value,
    },
    {
      title: '权限名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Badge color={record.category === 'user' ? 'blue' : 
                        record.category === 'product' ? 'green' : 
                        record.category === 'order' ? 'orange' : 
                        record.category === 'finance' ? 'red' : 
                        record.category === 'team' ? 'purple' : 
                        record.category === 'school' ? 'cyan' : 
                        record.category === 'setting' ? 'magenta' : 
                        record.category === 'inventory' ? 'geekblue' :
                        'geekblue'} />
          <div>
            <div style={{ fontWeight: 600 }}>{text}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.code}</Text>
          </div>
        </Space>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color={
          category === 'user' ? 'blue' :
          category === 'product' ? 'green' :
          category === 'order' ? 'orange' :
          category === 'finance' ? 'red' :
          category === 'team' ? 'purple' :
          category === 'school' ? 'cyan' :
          category === 'setting' ? 'magenta' :
          category === 'inventory' ? 'geekblue' : 'default'
        }>
          {category === 'user' ? '用户' :
           category === 'product' ? '商品' :
           category === 'order' ? '订单' :
           category === 'finance' ? '财务' :
           category === 'team' ? '团队' :
           category === 'school' ? '商学院' :
           category === 'setting' ? '设置' :
           category === 'inventory' ? '库存' : '权限'}
        </Tag>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 300
    }
  ];

  // 用户角色表格列定义
  const userRoleColumns: ColumnsType<UserRole> = [
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
      render: (text, record) => (
        <Space>
          <Avatar src={record.userAvatar} size="small" />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: '角色',
      dataIndex: 'roleId',
      key: 'roleId',
      render: (roleId) => {
        // roleId 现在是后端的 role 字段（如 'warehouse', 'super_admin' 等）
        const roleNameMap: Record<string, { color: string; name: string }> = {
          super_admin: { color: 'red', name: '超级管理员' },
          admin: { color: 'blue', name: '系统管理员' },
          operator: { color: 'green', name: '运营管理员' },
          finance: { color: 'orange', name: '财务管理员' },
          warehouse: { color: 'cyan', name: '仓库管理员' },
          viewer: { color: 'purple', name: '查看者' },
        };
        const cfg = roleNameMap[roleId] || { color: 'default', name: roleId };
        return <Tag color={cfg.color}>{cfg.name}</Tag>;
      }
    },
    {
      title: '分配时间',
      dataIndex: 'assignedAt',
      key: 'assignedAt'
    },
    {
      title: '分配人',
      dataIndex: 'assignedBy',
      key: 'assignedBy'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          danger
          size="small"
          onClick={() => handleRemoveUserRole(record.id)}
        >
          移除
        </Button>
      )
    }
  ];

  // 处理角色编辑
  const handleEditRole = (role: Role) => {
    setEditRole(role);
    roleForm.setFieldsValue(role);
    setRoleModalVisible(true);
  };

  // 处理角色保存（同时持久化到后端）
  const handleSaveRole = async () => {
    try {
      const values = await roleForm.validateFields();
      if (editRole) {
        // 更新现有角色（本地 state + 同步角色权限到 rolePermissionsMap）
        const updatedPermissions = values.permissions || editRole.permissions;
        const roleKey =
          editRole.id === '1' ? 'super_admin' :
          editRole.id === '2' ? 'admin' :
          editRole.id === '3' ? 'operator' :
          editRole.id === '4' ? 'finance' :
          editRole.id === '5' ? 'viewer' :
          editRole.id === '6' ? 'warehouse' : editRole.name;

        // 更新本地角色数据
        const updatedRoles = roles.map(role =>
          role.id === editRole.id ? { ...role, ...values, permissions: updatedPermissions, updatedAt: new Date().toISOString().slice(0, 10) } : role
        );
        setRoles(updatedRoles);

        // 同步更新 rolePermissionsMap
        const newMap = { ...rolePermissionsMap, [roleKey]: updatedPermissions };
        setRolePermissionsMap(newMap);

        // 持久化到后端（角色列表 + 权限配置）
        try {
          const { default: apiClient } = await import('../utils/apiClient');
          await apiClient.put('/admins/roles-config', { roles: updatedRoles });
          await apiClient.put('/admins/role-permissions', { rolePermissionsMap: newMap });
        } catch (err) {
          console.error('保存角色配置到后端失败:', err);
          message.warning('角色已更新但后端同步失败，刷新后可能恢复');
        }

        message.success('角色更新成功');
      } else {
        // 添加新角色
        const newRole: Role = {
          id: Date.now().toString(),
          ...values,
          userCount: 0,
          status: 'active',
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10)
        };
        const updatedRoles = [...roles, newRole];
        setRoles(updatedRoles);

        // 同步到 rolePermissionsMap
        const newMap = { ...rolePermissionsMap, [newRole.name]: values.permissions || [] };
        setRolePermissionsMap(newMap);

        // 持久化到后端（角色列表 + 权限配置）
        try {
          const { default: apiClient } = await import('../utils/apiClient');
          await apiClient.put('/admins/roles-config', { roles: updatedRoles });
          await apiClient.put('/admins/role-permissions', { rolePermissionsMap: newMap });
        } catch (err) {
          console.error('保存角色配置到后端失败:', err);
          message.warning('角色已添加但后端同步失败，刷新后可能丢失');
        }

        message.success('角色添加成功');
      }
      setRoleModalVisible(false);
      setEditRole(null);
      roleForm.resetFields();
    } catch (err) {
      // 表单验证失败，ant design 已自动提示
    }
  };

  // 处理角色删除（同时清理后端配置）
  const handleDeleteRole = async (roleId: string) => {
    const roleToDelete = roles.find(r => r.id === roleId);
    const updatedRoles = roles.filter(role => role.id !== roleId);
    setRoles(updatedRoles);
    message.success('角色删除成功');

    // 如果有对应的 rolePermissionsMap 条目，也要删除
    if (roleToDelete) {
      const roleKey =
        roleId === '1' ? 'super_admin' :
        roleId === '2' ? 'admin' :
        roleId === '3' ? 'operator' :
        roleId === '4' ? 'finance' :
        roleId === '5' ? 'viewer' :
        roleId === '6' ? 'warehouse' : roleToDelete.name;
      const newMap = { ...rolePermissionsMap };
      delete newMap[roleKey];
      setRolePermissionsMap(newMap);
      try {
        const { default: apiClient } = await import('../utils/apiClient');
        await apiClient.put('/admins/roles-config', { roles: updatedRoles });
        await apiClient.put('/admins/role-permissions', { rolePermissionsMap: newMap });
      } catch (err) {
        console.error('同步角色删除到后端失败:', err);
      }
    }
  };

  // 处理用户分配 — 打开分配弹窗
  const handleAssignUsers = async (role: Role) => {
    setAssignRole(role);
    setAssignModalVisible(true);
    setAssignSelectedKeys([]);
    setAssignSearch('');
    await loadAssignableUsers();
  };

  // 加载可分配的用户列表
  const loadAssignableUsers = async (keyword?: string) => {
    setAssignLoading(true);
    try {
      const { usersApi } = await import('../services/dbApi');
      const data = await usersApi.getList({ pageSize: 100, keyword });
      // 过滤掉已经分配给当前角色的用户（从后端已加载的数据中过滤）
      const existingUserIds = userRoles
        .filter(ur => {
          // 将 roleId（后端的 role 字段，如 'warehouse'）映射回前端的 role id
          const roleKey =
            assignRole?.id === '1' ? 'super_admin' :
            assignRole?.id === '2' ? 'admin' :
            assignRole?.id === '3' ? 'operator' :
            assignRole?.id === '4' ? 'finance' :
            assignRole?.id === '5' ? 'viewer' :
            assignRole?.id === '6' ? 'warehouse' : assignRole?.name;
          return ur.roleId === roleKey;
        })
        .map(ur => ur.userId);
      const filtered = (data?.list || []).filter((u: any) => !existingUserIds.includes(String(u.id)));
      setAssignUsers(filtered);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      message.error('加载用户列表失败');
      setAssignUsers([]);
    } finally {
      setAssignLoading(false);
    }
  };

  // 确认分配选中用户到角色
  const handleConfirmAssign = async () => {
    if (!assignRole || assignSelectedKeys.length === 0) return;
    setAssignSubmitting(true);
    try {
      const { default: apiClient } = await import('../utils/apiClient');
      const rolePermissions = assignRole.permissions || [];
      await apiClient.post('/admins/user-roles', {
        userIds: assignSelectedKeys,
        role: assignRole.id === '1' ? 'super_admin' :
              assignRole.id === '2' ? 'admin' :
              assignRole.id === '3' ? 'operator' :
              assignRole.id === '4' ? 'finance' :
              assignRole.id === '5' ? 'viewer' :
              assignRole.id === '6' ? 'warehouse' : assignRole.name,
        permissions: rolePermissions,
      });

      message.success(`成功为角色"${assignRole.name}"分配 ${assignSelectedKeys.length} 个用户`);
      setAssignModalVisible(false);
      setAssignRole(null);
      // 重新加载数据
      await loadUserRoles();
    } catch (error: any) {
      console.error('分配失败:', error);
      message.error(error?.message || '分配失败，请重试');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // 处理移除用户角色
  const handleRemoveUserRole = async (userRoleId: string) => {
    try {
      const { default: apiClient } = await import('../utils/apiClient');
      await apiClient.delete(`/admins/user-roles/${userRoleId}`);
      message.success('用户角色已移除');
      await loadUserRoles();
    } catch (error: any) {
      message.error(error?.message || '移除失败');
    }
  };

  // ========== 用户角色分配数据加载 ==========

  // 加载用户角色分配数据
  const loadUserRoles = async () => {
    setUserRolesLoading(true);
    try {
      const { default: apiClient } = await import('../utils/apiClient');
      const data = await apiClient.get('/admins/user-roles');
      const list: UserRole[] = (data.list || []).map((item: any) => ({
        id: item.id,
        userId: item.userId,
        roleId: item.roleId,
        userName: item.userName,
        userAvatar: item.userAvatar,
        assignedAt: item.assignedAt,
        assignedBy: item.assignedBy ? String(item.assignedBy) : '系统',
      }));
      setUserRoles(list);

      // 更新角色的 userCount
      const roleCounts: Record<string, number> = data.roleCounts || {};
      setRoles(prev => prev.map(r => {
        const roleKey =
          r.id === '1' ? 'super_admin' :
          r.id === '2' ? 'admin' :
          r.id === '3' ? 'operator' :
          r.id === '4' ? 'finance' :
          r.id === '5' ? 'viewer' :
          r.id === '6' ? 'warehouse' : r.name;
        return { ...r, userCount: roleCounts[roleKey] || 0 };
      }));
    } catch (err: any) {
      console.error('加载用户角色分配失败:', err);
      // 如果是新部署，表可能还没创建，忽略 500 错误
      if (!err?.message?.includes('500')) {
        message.error('加载用户角色分配失败');
      }
    } finally {
      setUserRolesLoading(false);
    }
  };

  // ========== 管理员账户 CRUD 函数 ==========

  // 加载管理员列表
  const loadAdminList = async () => {
    setAdminLoading(true);
    try {
      const { default: apiClient } = await import('../utils/apiClient');
      const data = await apiClient.get('/admins', { params: { pageSize: 100 } });
      setAdminList(data.list || []);
    } catch (err: any) {
      console.error('加载管理员列表失败:', err);
      message.error('加载管理员列表失败');
    } finally {
      setAdminLoading(false);
    }
  };

  // 加载角色列表配置（从后端持久化存储）
  const loadRolesConfig = async () => {
    try {
      const { default: apiClient } = await import('../utils/apiClient');
      const data = await apiClient.get('/admins/roles-config');
      if (data && Array.isArray(data) && data.length > 0) {
        console.log('[角色列表] 从后端加载:', data.length, '个角色');
        setRoles(data);
      } else {
        // 后端没有保存过配置，使用默认角色列表
        console.log('[角色列表] 后端无配置，使用默认列表');
        setRoles(DEFAULT_ROLES);
      }
    } catch (err) {
      console.error('加载角色列表配置失败:', err);
      // 加载失败也使用默认列表作为兜底
      setRoles(DEFAULT_ROLES);
    }
  };

  // 保存角色列表到后端
  const saveRolesConfig = async (currentRoles: Role[]) => {
    try {
      const { default: apiClient } = await import('../utils/apiClient');
      await apiClient.put('/admins/roles-config', { roles: currentRoles });
      console.log('[角色列表] 已保存到后端');
    } catch (err) {
      console.error('保存角色列表到后端失败:', err);
    }
  };

  // 加载角色权限配置（从后端持久化存储）
  const loadRolePermissions = async () => {
    try {
      const { default: apiClient } = await import('../utils/apiClient');
      const data = await apiClient.get('/admins/role-permissions');
      if (data && Object.keys(data).length > 0) {
        setRolePermissionsMap(data);
        // 同步更新角色的 permissions 字段
        setRoles(prev => prev.map(r => {
          const roleKey =
            r.id === '1' ? 'super_admin' :
            r.id === '2' ? 'admin' :
            r.id === '3' ? 'operator' :
            r.id === '4' ? 'finance' :
            r.id === '5' ? 'viewer' :
            r.id === '6' ? 'warehouse' : r.name;
          if (data[roleKey]) {
            return { ...r, permissions: data[roleKey] };
          }
          return r;
        }));
      }
    } catch (err) {
      console.error('加载角色权限配置失败:', err);
    }
  };

  // Tab切换时自动加载数据
  useEffect(() => {
    if (activeTab === 'admin-accounts' && adminList.length === 0) {
      loadAdminList();
    }
    if (activeTab === 'roles' || activeTab === 'user-roles') {
      loadUserRoles();
      // 先加载角色列表，再加载权限配置（权限配置需要覆盖角色列表中的 permissions）
      loadRolesConfig().then(() => loadRolePermissions());
    }
  }, [activeTab]);

  // 打开新建/编辑弹窗
  const openAdminModal = (admin?: AdminAccount) => {
    setEditingAdmin(admin || null);
    setAdminModalVisible(true);
  };

  // 创建/更新管理员
  const handleSaveAdmin = async (values: any) => {
    setAdminFormLoading(true);
    try {
      const { default: apiClient } = await import('../utils/apiClient');
      const role = values.role;
      // 仅在新建 或 编辑时角色发生变更 的情况下，自动注入角色默认权限
      // 编辑时如果角色未变，保留数据库中已手动调整的权限
      const roleChanged = editingAdmin && editingAdmin.role !== role;
      if (!editingAdmin || roleChanged) {
        if (role && rolePermissionsMap[role]) {
          values.permissions = rolePermissionsMap[role];
        }
      }
      if (editingAdmin) {
        await apiClient.put(`/admins/${editingAdmin.id}`, values);
        message.success('管理员信息已更新');
      } else {
        await apiClient.post('/admins', values);
        message.success('管理员账号创建成功，可使用新账号登录后台');
      }
      setAdminModalVisible(false);
      loadAdminList();
    } catch (err: any) {
      message.error(err?.message || '操作失败');
    } finally {
      setAdminFormLoading(false);
    }
  };

  // 禁用管理员
  const handleDisableAdmin = async (admin: AdminAccount) => {
    try {
      const { default: apiClient } = await import('../utils/apiClient');
      await apiClient.delete(`/admins/${admin.id}`);
      message.success(`管理员「${admin.username}」已禁用`);
      loadAdminList();
    } catch (err: any) {
      message.error(err?.message || '操作失败');
    }
  };

  // 重置密码
  const handleResetPassword = async (newPassword: string) => {
    if (!resetPwdAdmin) return;
    try {
      const { default: apiClient } = await import('../utils/apiClient');
      await apiClient.post(`/admins/${resetPwdAdmin.id}/reset-password`, { newPassword });
      message.success(`「${resetPwdAdmin.username}」的密码已重置`);
      setResetPwdAdmin(null);
    } catch (err: any) {
      message.error(err?.message || '重置失败');
    }
  };

  // 处理系统配置更新
  const handleConfigUpdate = (key: string, value: any) => {
    setSystemConfigs(configs => 
      configs.map(config => 
        config.key === key ? { ...config, value, updatedAt: new Date().toISOString().split('T')[0] } : config
      )
    );
    message.success(`配置"${key}"已更新`);
  };

  // 统计数据
  const statsData = {
    totalRoles: roles.length,
    totalPermissions: permissions.length,
    totalUserRoles: userRoles.length,
    activeRoles: roles.filter(r => r.status === 'active').length,
    systemHealth: 98
  };

  return (
    <div className="settings-container">
      {/* 页面头部 */}
      <div className="settings-header">
        <div className="settings-header-title">
          <SettingOutlined style={{ fontSize: '24px', color: 'var(--color-primary)' }} />
          系统设置与权限管理
        </div>
        <div className="settings-header-subtitle">
          管理系统配置、用户权限、角色分配等各项设置，确保系统安全稳定运行。
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总角色数"
              value={statsData.totalRoles}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="权限数量"
              value={statsData.totalPermissions}
              prefix={<LockOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="用户角色分配"
              value={statsData.totalUserRoles}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="系统健康度"
              value={statsData.systemHealth}
              suffix="%"
              prefix={statsData.systemHealth > 95 ? <CheckCircleOutlined /> : <WarningOutlined />}
              valueStyle={{ color: statsData.systemHealth > 95 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 标签页 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          items={[
            {
              key: 'general',
              label: (
                <span>
                  <SettingOutlined />
                  常规设置
                </span>
              )
            },
            {
              key: 'roles',
              label: (
                <span>
                  <TeamOutlined />
                  角色管理
                </span>
              )
            },
            {
              key: 'permissions',
              label: (
                <span>
                  <LockOutlined />
                  权限管理
                </span>
              )
            },
            {
              key: 'security',
              label: (
                <span>
                  <SafetyOutlined />
                  安全设置
                </span>
              )
            },
            {
              key: 'user-roles',
              label: (
                <span>
                  <UserOutlined />
                  用户角色分配
                </span>
              )
            },
            {
              key: 'admin-accounts',
              label: (
                <span>
                  <SafetyCertificateOutlined />
                  管理员账户
                </span>
              )
            }
          ]}
        />

        {/* 常规设置标签页 */}
        {activeTab === 'general' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <Title level={4} style={{ marginBottom: 16 }}>
                <GlobalOutlined style={{ marginRight: 8 }} />
                系统配置
              </Title>
              <Alert
                message="系统配置说明"
                description="以下配置项控制系统的核心行为和功能，修改后可能会影响用户体验和系统性能。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </div>

            <Row gutter={[16, 16]}>
              {systemConfigs.map(config => (
                <Col xs={24} md={12} key={config.key}>
                  <Card size="small">
                    <Descriptions title={config.name} column={1} size="small">
                      <Descriptions.Item label="键名">{config.key}</Descriptions.Item>
                      <Descriptions.Item label="描述">{config.description}</Descriptions.Item>
                      <Descriptions.Item label="当前值">
                        {config.type === 'boolean' ? (
                          <Switch
                            checked={config.value as boolean}
                            onChange={(checked) => handleConfigUpdate(config.key, checked)}
                            checkedChildren="开启"
                            unCheckedChildren="关闭"
                          />
                        ) : config.type === 'number' ? (
                          <Input
                            type="number"
                            value={config.value as number}
                            onChange={(e) => handleConfigUpdate(config.key, Number(e.target.value))}
                            style={{ width: '150px' }}
                          />
                        ) : (
                          <Input
                            value={config.value as string}
                            onChange={(e) => handleConfigUpdate(config.key, e.target.value)}
                            style={{ width: '250px' }}
                          />
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="分类">
                        <Tag color="blue">{config.category}</Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              ))}
            </Row>

            <Divider />

            <div style={{ marginTop: 24 }}>
              <Title level={4} style={{ marginBottom: 16 }}>
                <MonitorOutlined style={{ marginRight: 8 }} />
                系统状态
              </Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Card title="API状态" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>API服务:</Text>
                        <Badge status="success" text="运行中" style={{ marginLeft: 8 }} />
                      </div>
                      <div>
                        <Text strong>响应时间:</Text>
                        <span style={{ marginLeft: 8, color: '#52c41a' }}>23ms</span>
                      </div>
                      <Progress percent={98} status="active" />
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card title="数据库状态" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>连接状态:</Text>
                        <Badge status="success" text="正常" style={{ marginLeft: 8 }} />
                      </div>
                      <div>
                        <Text strong>存储空间:</Text>
                        <span style={{ marginLeft: 8, color: '#faad14' }}>78%已使用</span>
                      </div>
                      <Progress percent={78} status="normal" />
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card title="缓存状态" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>命中率:</Text>
                        <span style={{ marginLeft: 8, color: '#1890ff' }}>92%</span>
                      </div>
                      <div>
                        <Text strong>内存使用:</Text>
                        <span style={{ marginLeft: 8, color: '#52c41a' }}>256MB</span>
                      </div>
                      <Progress percent={92} status="success" />
                    </Space>
                  </Card>
                </Col>
              </Row>
            </div>
          </div>
        )}

        {/* 角色管理标签页 */}
        {activeTab === 'roles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4}>
                <TeamOutlined style={{ marginRight: 8 }} />
                角色管理
              </Title>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditRole(null);
                    roleForm.resetFields();
                    setRoleModalVisible(true);
                  }}
                >
                  添加角色
                </Button>
                <Button icon={<ReloadOutlined />}>刷新</Button>
              </Space>
            </div>

            <Alert
              message="角色管理说明"
              description="角色是一组权限的集合，可以分配给一个或多个用户。用户获得角色后即拥有该角色的所有权限。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              columns={roleColumns}
              dataSource={roles}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />

            {/* 角色编辑模态框 */}
            <Modal
              title={editRole ? '编辑角色' : '添加角色'}
              open={roleModalVisible}
              onOk={handleSaveRole}
              onCancel={() => {
                setRoleModalVisible(false);
                setEditRole(null);
                roleForm.resetFields();
              }}
              width={600}
              okText="保存"
              cancelText="取消"
            >
              <Form form={roleForm} layout="vertical">
                <Form.Item
                  name="name"
                  label="角色名称"
                  rules={[{ required: true, message: '请输入角色名称' }]}
                >
                  <Input placeholder="请输入角色名称" />
                </Form.Item>
                <Form.Item
                  name="description"
                  label="角色描述"
                  rules={[{ required: true, message: '请输入角色描述' }]}
                >
                  <Input.TextArea placeholder="请输入角色描述" rows={3} />
                </Form.Item>
                <Form.Item
                  name="permissions"
                  label="权限选择"
                  rules={[{ required: true, message: '请选择权限' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="请选择权限"
                    options={permissions.map(p => ({
                      label: `${p.module} - ${p.name} (${p.code})`,
                      value: p.code
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="status"
                  label="状态"
                  initialValue="active"
                >
                  <Select>
                    <Option value="active">启用</Option>
                    <Option value="inactive">停用</Option>
                  </Select>
                </Form.Item>
              </Form>
            </Modal>
          </div>
        )}

        {/* ========== 分配用户弹窗 ========== */}
        <Modal
          title={<><UserOutlined style={{ color: '#1890ff', marginRight: 8 }} /> 为角色 "{assignRole?.name}" 分配用户</>}
          open={assignModalVisible}
          onCancel={() => { setAssignModalVisible(false); setAssignRole(null); }}
          width={620}
          okText={`确认分配 (${assignSelectedKeys.length})`}
          cancelText="取消"
          onOk={handleConfirmAssign}
          confirmLoading={assignSubmitting}
          okButtonProps={{ disabled: assignSelectedKeys.length === 0 }}
        >
          <div style={{ marginBottom: 12 }}>
            <Input
              placeholder="搜索用户名/手机号..."
              prefix={<SearchOutlined />}
              value={assignSearch}
              onChange={(e) => { setAssignSearch(e.target.value); loadAssignableUsers(e.target.value); }}
              allowClear
            />
          </div>
          <div style={{ marginBottom: 8, color: '#888', fontSize: 13 }}>
            已选择 <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{assignSelectedKeys.length}</span> 个用户
            {assignRole && <>（该角色当前共有 {userRoles.filter(ur => ur.roleId === assignRole.id).length} 个用户）</>}
          </div>
          <Table
            size="small"
            rowKey="id"
            loading={assignLoading}
            dataSource={assignUsers}
            pagination={{ pageSize: 8, size: 'small' }}
            rowSelection={{
              selectedRowKeys: assignSelectedKeys,
              onChange: (keys) => setAssignSelectedKeys(keys),
            }}
            columns={[
              {
                title: '用户',
                dataIndex: 'id',
                render: (_: any, record: any) => (
                  <Space>
                    <Avatar size="small" style={{ backgroundColor: '#722ed1' }}>
                      {(record.real_name || record.username || '?').charAt(0)}
                    </Avatar>
                    <div>
                      <div style={{ fontWeight: 500 }}>{record.real_name || record.username || '-'}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>{record.phone || '无手机号'}</div>
                    </div>
                  </Space>
                ),
              },
              {
                title: '等级',
                dataIndex: 'agent_level',
                width: 80,
                align: 'center',
                render: (level: number) => {
                  const map: Record<number, string> = { 1:'会员',2:'代言人',3:'代理商',4:'批发商',5:'首席',6:'集团' };
                  return <Tag color="blue">{map[level] || '-'}</Tag>;
                },
              },
              {
                title: '余额',
                dataIndex: 'balance',
                width: 100,
                align: 'right',
                render: (v: number) => <span style={{ fontFamily: 'monospace' }}>¥{Number(v || 0).toFixed(2)}</span>,
              },
            ]}
          />
        </Modal>

        {/* ========== 新建/编辑管理员弹窗 ========== */}
        <Modal
          title={editingAdmin ? '编辑管理员' : '新建管理员账号'}
          open={adminModalVisible}
          onCancel={() => { setAdminModalVisible(false); setEditingAdmin(null); }}
          width={560}
          footer={null}
          destroyOnClose
        >
          <Form
            layout="vertical"
            onFinish={handleSaveAdmin}
            initialValues={editingAdmin ? {
              username: editingAdmin.username,
              real_name: editingAdmin.realName,
              email: editingAdmin.email,
              phone: editingAdmin.phone,
              role: editingAdmin.role,
              status: editingAdmin.status,
            } : { role: 'operator', status: 1, permissions: ['order:read', 'order:write', 'product:read'] }}
          >
            <Form.Item name="username" label="登录用户名"
              rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '至少3个字符' }]}
            >
              <Input placeholder="用于后台登录的用户名" disabled={!!editingAdmin} prefix={<UserOutlined />} />
            </Form.Item>
            {!editingAdmin && (
              <Form.Item name="password" label="初始密码"
                rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '至少6个字符' }]}
              >
                <Input.Password placeholder="设置初始密码（至少6位）" prefix={<LockOutlined />} />
              </Form.Item>
            )}
            <Form.Item name="real_name" label="真实姓名">
              <Input placeholder="姓名（可选）" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="phone" label="手机号">
                  <Input placeholder="手机号（可选）" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="email" label="邮箱">
                  <Input placeholder="邮箱（可选）" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="role" label="角色"
                  rules={[{ required: true, message: '请选择角色' }]}
                >
                  <Select placeholder="选择角色">
                    <Option value="super_admin">超级管理员</Option>
                    <Option value="operator">运营管理员</Option>
                    <Option value="finance">财务管理员</Option>
                    <Option value="warehouse">仓库管理员</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="status" label="状态">
                  <Select>
                    <Option value={1}>正常</Option>
                    <Option value={0}>禁用</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <Space>
                <Button onClick={() => { setAdminModalVisible(false); setEditingAdmin(null); }}>取消</Button>
                <Button type="primary" htmlType="submit" loading={adminFormLoading} icon={<SaveOutlined />}>
                  {editingAdmin ? '保存修改' : '创建账号'}
                </Button>
              </Space>
            </div>
          </Form>
        </Modal>

        {/* ========== 重置密码弹窗 ========== */}
        <Modal
          title={<><KeyOutlined style={{ color: '#faad14', marginRight: 8 }} /> 重置密码 - {resetPwdAdmin?.username}</>}
          open={!!resetPwdAdmin}
          onCancel={() => setResetPwdAdmin(null)}
          width={420}
          footer={null}
          destroyOnClose
        >
          <Alert
            message="安全提示"
            description={`重置后，用户「${resetPwdAdmin?.username}」需要使用新密码登录。`}
            type="warning"
            showIcon
            style={{ marginBottom: 20 }}
          />
          <Form
            layout="vertical"
            onFinish={(values) => handleResetPassword(values.newPassword)}
          >
            <Form.Item name="newPassword" label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '至少6个字符' },
              ]}
            >
              <Input.Password placeholder="输入新密码（至少6位）" prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item name="confirmPassword" label="确认新密码"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="再次输入新密码" prefix={<LockOutlined />} />
            </Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setResetPwdAdmin(null)}>取消</Button>
                <Button type="primary" htmlType="submit" icon={<KeyOutlined />}>确认重置</Button>
              </Space>
            </div>
          </Form>
        </Modal>

        {/* 权限管理标签页 */}
        {activeTab === 'permissions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4}>
                <LockOutlined style={{ marginRight: 8 }} />
                权限管理
              </Title>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setPermissionModalVisible(true)}
                >
                  添加权限
                </Button>
                <Button icon={<ReloadOutlined />}>刷新</Button>
              </Space>
            </div>

            <Alert
              message="权限管理说明"
              description="权限是系统中最小的权限控制单元，每个权限对应一个具体的操作或功能。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              columns={permissionColumns}
              dataSource={permissions}
              rowKey="id"
              pagination={{ pageSize: 15 }}
            />
          </div>
        )}

        {/* 安全设置标签页 */}
        {activeTab === 'security' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <Title level={4} style={{ marginBottom: 16 }}>
                <SafetyOutlined style={{ marginRight: 8 }} />
                安全设置
              </Title>
              <Alert
                message="安全设置说明"
                description="安全设置影响系统的安全性和稳定性，请谨慎修改。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="登录安全" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>双重认证</Text>
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" defaultChecked={false} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>登录失败锁定</Text>
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" defaultChecked={true} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>会话超时</Text>
                      <Select defaultValue="30" style={{ width: 100 }}>
                        <Option value="15">15分钟</Option>
                        <Option value="30">30分钟</Option>
                        <Option value="60">60分钟</Option>
                        <Option value="120">2小时</Option>
                      </Select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>IP白名单</Text>
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" defaultChecked={false} />
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="密码策略" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>最小长度</Text>
                      <Select defaultValue="8" style={{ width: 100 }}>
                        <Option value="6">6位</Option>
                        <Option value="8">8位</Option>
                        <Option value="12">12位</Option>
                        <Option value="16">16位</Option>
                      </Select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>必须包含数字</Text>
                      <Switch checkedChildren="是" unCheckedChildren="否" defaultChecked={true} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>必须包含字母</Text>
                      <Switch checkedChildren="是" unCheckedChildren="否" defaultChecked={true} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>必须包含特殊字符</Text>
                      <Switch checkedChildren="是" unCheckedChildren="否" defaultChecked={false} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>密码过期时间</Text>
                      <Select defaultValue="90" style={{ width: 100 }}>
                        <Option value="30">30天</Option>
                        <Option value="60">60天</Option>
                        <Option value="90">90天</Option>
                        <Option value="180">180天</Option>
                      </Select>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>

            <Divider />

            <Card title="安全日志" size="small">
              <Timeline
                mode="alternate"
                items={[
                  {
                    children: '管理员登录成功',
                    color: 'green',
                    label: '08:30'
                  },
                  {
                    children: '用户密码修改',
                    color: 'blue',
                    label: '09:15'
                  },
                  {
                    children: '角色权限变更',
                    color: 'orange',
                    label: '10:20'
                  },
                  {
                    children: '系统配置更新',
                    color: 'purple',
                    label: '11:05'
                  },
                  {
                    children: '安全扫描完成',
                    color: 'green',
                    label: '12:00'
                  }
                ]}
              />
            </Card>
          </div>
        )}

        {/* 用户角色分配标签页 */}
        {activeTab === 'user-roles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4}>
                <UserOutlined style={{ marginRight: 8 }} />
                用户角色分配
              </Title>
              <Space>
                <Button
                  type="primary"
                  icon={<UserOutlined />}
                  onClick={() => setUserRoleModalVisible(true)}
                >
                  分配角色
                </Button>
                <Button icon={<ReloadOutlined />}>刷新</Button>
              </Space>
            </div>

            <Alert
              message="用户角色分配说明"
              description="用户角色分配决定了用户可以访问的功能和操作权限。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              columns={userRoleColumns}
              dataSource={userRoles}
              rowKey="id"
              loading={userRolesLoading}
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}

        {/* 管理员账户标签页 */}
        {activeTab === 'admin-accounts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4}>
                <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                管理员账户
              </Title>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openAdminModal()}
                >
                  新建管理员
                </Button>
                <Button icon={<ReloadOutlined />} onClick={loadAdminList}>刷新</Button>
              </Space>
            </div>

            <Alert
              message="管理员账户管理"
              description="在此创建和管理后台登录账号。新建的账号可使用用户名+密码直接登录后台管理系统。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Table
              size="small"
              rowKey="id"
              loading={adminLoading}
              dataSource={adminList}
              pagination={{ pageSize: 10 }}
              columns={[
                {
                  title: '管理员',
                  dataIndex: 'username',
                  render: (_: any, record: AdminAccount) => (
                    <Space>
                      <Avatar
                        size="small"
                        style={{
                          backgroundColor: record.role === 'super_admin' ? '#ff4d4f' :
                                          record.role === 'operator' ? '#1890ff' :
                                          record.role === 'finance' ? '#faad14' :
                                          record.id === 6 ? '#13c2c2' : '#722ed1'
                        }}
                      >
                        {(record.realName || record.username || '?').charAt(0)}
                      </Avatar>
                      <div>
                        <div style={{ fontWeight: 500 }}>{record.username}</div>
                        <div style={{ fontSize: 12, color: '#999' }}>{record.realName || '-'}</div>
                      </div>
                    </Space>
                  ),
                },
                {
                  title: '角色',
                  dataIndex: 'role',
                  width: 120,
                  align: 'center',
                  render: (role: string) => {
                    const map: Record<string, { color: string; label: string }> = {
                      super_admin: { color: 'red', label: '超级管理员' },
                      operator: { color: 'blue', label: '运营' },
                      finance: { color: 'orange', label: '财务' },
                    };
                    const cfg = map[role] || { color: role === 'warehouse' ? 'cyan' : 'default', label: role };
                    return <Tag color={cfg.color}>{cfg.label}</Tag>;
                  },
                },
                {
                  title: '手机/邮箱',
                  render: (_: any, r: AdminAccount) => (
                    <span style={{ fontSize: 12 }}>
                      {r.phone || '-'}{r.phone && r.email ? ' / ' : ''}{r.email || ''}
                    </span>
                  ),
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 80,
                  align: 'center',
                  render: (s: number) => (
                    <Badge status={s === 1 ? 'success' : 'error'} text={s === 1 ? '正常' : '禁用'} />
                  ),
                },
                {
                  title: '最后登录',
                  dataIndex: 'lastLoginAt',
                  width: 150,
                  render: (t: string) => t ? t.split('T')[0].replace(/-/g, '/') : '从未登录',
                },
                {
                  title: '操作',
                  width: 220,
                  render: (_: any, record: AdminAccount) => (
                    <Space size="small">
                      <Button
                        type="link" size="small"
                        icon={<EditOutlined />}
                        onClick={() => openAdminModal(record)}
                      >编辑</Button>
                      <Button
                        type="link" size="small"
                        icon={<KeyOutlined />}
                        onClick={() => setResetPwdAdmin(record)}
                      >重置密码</Button>
                      {record.role !== 'super_admin' && (
                        <Popconfirm
                          title="确定要禁用此账号？"
                          onConfirm={() => handleDisableAdmin(record)}
                        >
                          <Button type="link" size="small" danger icon={<StopOutlined />}>禁用</Button>
                        </Popconfirm>
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>

      {/* 页面底部操作按钮 */}
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button type="primary" icon={<SaveOutlined />} size="large">
            保存所有设置
          </Button>
          <Button icon={<CloudUploadOutlined />} size="large">
            导出配置
          </Button>
          <Button icon={<DownloadOutlined />} size="large">
            备份数据
          </Button>
          <Button icon={<RocketOutlined />} type="primary" ghost size="large">
            应用设置
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default SettingsManagementNew;