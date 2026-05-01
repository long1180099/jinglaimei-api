// 用户管理页面 - 对接真实后端 API
import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Button, 
  Input, 
  Select, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  message, 
  Statistic,
  Typography,
  Badge,
  Dropdown,
  Avatar,
  Tooltip,
  Tabs,
  DatePicker,
  Switch,
  Popconfirm,
  Divider,
  Descriptions,
  InputNumber,
  List,
  Timeline,
  Drawer,
  Empty
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  MoreOutlined,
  DownloadOutlined,
  UserAddOutlined,
  TeamOutlined,
  FilterOutlined,
  ReloadOutlined,
  ExportOutlined,
  StarOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  UserSwitchOutlined,
  BarChartOutlined,
  WalletOutlined,
  HistoryOutlined,
  LinkOutlined,
  DisconnectOutlined,
  ApartmentOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';

import { 
  fetchUsers, 
  fetchUserStats,
  fetchUserDetail,
  changeUserStatus,
  changeUserLevel,
  adjustBalance,
  fetchBalanceLogs,
  selectUsers, 
  selectUserStats, 
  selectUserLoading,
  selectUserPagination,
  selectUserFilters,
  selectCurrentUser,
  selectBalanceLogs,
  setFilters,
  clearFilters,
  setCurrentUser,
  clearCurrentUser,
} from '../store/slices/userSlice';
import type { AppDispatch, RootState } from '@/store';
import './UserManagement.css';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

const UserManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  // Redux状态
  const users = useSelector(selectUsers);
  const stats = useSelector(selectUserStats) as any;
  const loading = useSelector(selectUserLoading);
  const pagination = useSelector(selectUserPagination);
  const filters = useSelector(selectUserFilters);
  const currentUser = useSelector(selectCurrentUser);
  const balanceLogs = useSelector(selectBalanceLogs);
  
  // 本地状态
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  
  // 弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [balanceLogModalVisible, setBalanceLogModalVisible] = useState(false);
  const [parentModalVisible, setParentModalVisible] = useState(false);
  const [chainDrawerVisible, setChainDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // 上级关系数据（用于关系链路抽屉）
  const [uplineChain, setUplineChain] = useState<any[]>([]);
  const [downlines, setDownlines] = useState<any[]>([]);

  // 详情弹窗内的链路数据（独立于抽屉）
  const [detailChainData, setDetailChainData] = useState<{
    uplineChain: any[];
    downlines: any[];
    loading: boolean;
  }>({ uplineChain: [], downlines: [], loading: false });
  
  // 余额调整表单
  const [balanceForm] = Form.useForm();
  // 编辑用户表单
  const [editForm] = Form.useForm();
  // 等级修改
  const [newLevel, setNewLevel] = useState<number>(1);
  // 上级修改
  const [parentSearchValue, setParentSearchValue] = useState('');
  const [parentOptions, setParentOptions] = useState<any[]>([]);
  const [newParentId, setNewParentId] = useState<number | null>(null);
  
  // 加载数据
  useEffect(() => {
    dispatch(fetchUsers(filters));
    dispatch(fetchUserStats());
  }, [dispatch, filters]);
  
  // 加载余额日志
  useEffect(() => {
    if (balanceLogModalVisible && selectedUser) {
      dispatch(fetchBalanceLogs({ userId: selectedUser.id, page: 1, pageSize: 20 }));
    }
  }, [balanceLogModalVisible, selectedUser, dispatch]);
  
  // 等级配置
  const levelConfig = [
    { value: 1, text: '会员', color: '#999999', icon: <StarOutlined /> },
    { value: 2, text: '打版代言人', color: 'var(--color-success)', icon: <StarOutlined /> },
    { value: 3, text: '代理商', color: 'var(--color-primary)', icon: <CrownOutlined /> },
    { value: 4, text: '批发商', color: 'var(--color-warning)', icon: <CrownOutlined /> },
    { value: 5, text: '首席分公司', color: '#e94560', icon: <CrownOutlined /> },
    { value: 6, text: '集团事业部', color: '#722ed1', icon: <CrownOutlined /> },
  ];
  
  const getLevelConfig = (level: number) => {
    return levelConfig[level - 1] || { text: '未知', color: 'default', icon: null };
  };
  
  // 表格列定义 - 对齐真实数据库字段
  const columns: ColumnsType<any> = [
    {
      title: '用户',
      key: 'user_info',
      width: 260,
      fixed: 'left',
      render: (_, record) => (
        <div className="um-user-cell">
          <div className="um-user-avatar">
            <Avatar 
              size={40} 
              src={record.avatar_url || undefined}
            >
              {(record.username || '?')[0]}
            </Avatar>
            {record.agent_level && (
              <span className="um-avatar-badge" style={{ background: getLevelConfig(record.agent_level).color }}>
                {record.agent_level}
              </span>
            )}
          </div>
          <div className="um-user-info">
            <span className="um-user-name">{record.username}</span>
            {record.real_name && <span style={{ fontSize: 11, color: 'var(--jlm-text-muted)' }}>({record.real_name})</span>}
            <div className="um-user-meta">
              📱 {record.phone} · 注册于 {dayjs(record.registered_at || record.created_at).format('YYYY-MM-DD')}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '等级',
      dataIndex: 'agent_level',
      key: 'agent_level',
      width: 120,
      render: (level: number) => {
        const config = getLevelConfig(level);
        return (
          <span className={`um-level-tag level-${level}`}>
            <span className="um-level-dot" />
            {config.text}
          </span>
        );
      },
      filters: levelConfig.map(l => ({ text: l.text, value: l.value })),
    },
    {
      title: '财务',
      key: 'financial',
      width: 200,
      render: (_, record) => (
        <div className="financial-cell">
          <div className="financial-item">
            <div className="financial-label">账户余额</div>
            <div className="financial-value" style={{ color: 'var(--color-success)' }}>
              ¥{(record.balance || 0).toFixed(2)}
            </div>
          </div>
          <div className="financial-item">
            <div className="financial-label">累计收益</div>
            <div className="financial-value" style={{ color: 'var(--color-warning)' }}>
              ¥{(record.total_income || 0).toFixed(2)}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '邀请码',
      dataIndex: 'invite_code',
      key: 'invite_code',
      width: 130,
      render: (code: string) => code ? (
        <div className="invite-code-cell">
          <QrcodeOutlined style={{ color: '#722ed1', marginRight: 4 }} />
          <Text copyable={{ text: code }} style={{ fontFamily: 'monospace', fontSize: 12 }}>{code}</Text>
        </div>
      ) : <Text type="secondary">未生成</Text>,
    },
    {
      title: '上级',
      key: 'parent',
      width: 140,
      render: (_: any, record: any) => {
        if (record.parent_id) {
          return (
            <div className="parent-cell">
              <LinkOutlined style={{ color: 'var(--color-primary)', marginRight: 4 }} />
              <Tooltip title={`ID: ${record.parent_id}`}>
                <Text>{record.parent_username || `用户${record.parent_id}`}</Text>
              </Tooltip>
            </div>
          );
        }
        return <Text type="secondary">无上级</Text>;
      },
    },
    {
      title: '团队',
      key: 'team',
      width: 80,
      render: (_, record) => (
        <div className="team-cell">
          <div className="team-count">
            <TeamOutlined className="team-icon" />
            <span className="team-number">{record.direct_members || 0}</span>
            <span className="team-label">成员</span>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => {
        return status === 1 ? (
          <span className="um-status-badge status-active">
            <span className="um-status-dot" />
            正常
          </span>
        ) : (
          <span className="um-status-badge status-inactive">
            <span className="um-status-dot" />
            已禁用
          </span>
        );
      },
      filters: [
        { text: '正常', value: 1 },
        { text: '已禁用', value: 0 },
      ],
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <div className="um-action-btns">
          <Tooltip title="查看详情">
            <button className="um-action-btn" onClick={() => handleViewDetail(record)}>
              <EyeOutlined /> 详情
            </button>
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'parent',
                  label: '修改上级',
                  icon: <LinkOutlined />,
                  onClick: () => handleChangeParent(record),
                },
                {
                  key: 'chain',
                  label: '关系链路',
                  icon: <ApartmentOutlined />,
                  onClick: () => handleViewChain(record),
                },
                { type: 'divider' },
                {
                  key: 'balance',
                  label: '余额调整',
                  icon: <WalletOutlined />,
                  onClick: () => handleAdjustBalance(record),
                },
                {
                  key: 'balance_log',
                  label: '余额流水',
                  icon: <HistoryOutlined />,
                  onClick: () => handleViewBalanceLog(record),
                },
                { type: 'divider' },
                {
                  key: 'change_level',
                  label: '修改等级',
                  icon: <UserSwitchOutlined />,
                  onClick: () => handleChangeLevel(record),
                },
                {
                  key: 'change_status',
                  label: record.status === 1 ? '禁用账户' : '启用账户',
                  icon: record.status === 1 ? <CloseCircleOutlined /> : <CheckCircleOutlined />,
                  danger: record.status === 1,
                  onClick: () => handleChangeStatus(record),
                },
              ],
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <button className="um-action-btn">
              <MoreOutlined /> 更多
            </button>
          </Dropdown>
        </div>
      ),
    },
  ];
  
  // 处理搜索
  const handleSearch = () => {
    dispatch(setFilters({ 
      ...filters, 
      search: searchText,
      page: 1 
    }));
  };
  
  // 处理表格变化
  const handleTableChange = (
    pagination: any,
    filters: Record<string, FilterValue | null>,
    sorter: SorterResult<any> | SorterResult<any>[]
  ) => {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize,
    };
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.length > 0) {
        params[key] = value[0];
      }
    });
    
    if (sorter && !Array.isArray(sorter) && sorter.field && sorter.order) {
      params.sort_by = sorter.field;
      params.order = sorter.order === 'ascend' ? 'asc' : 'desc';
    }
    
    dispatch(setFilters(params));
  };
  
  // 加载用户关系链路数据（供详情弹窗和链路抽屉共用）
  const loadChainData = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/upline-chain`).then(r => r.json());
      if (response.code === 0 || response.data) {
        const data = response.data;
        return { uplineChain: data.uplineChain || [], downlines: data.downlines || [] };
      }
    } catch (e) {
      console.error('获取链路失败:', e);
    }
    return { uplineChain: [], downlines: [] };
  };

  // 查看用户详情
  const handleViewDetail = async (user: any) => {
    setSelectedUser(user);
    setDetailModalVisible(true);
    setDetailChainData(prev => ({ ...prev, loading: true }));
    try {
      await dispatch(fetchUserDetail(user.id)).unwrap();
    } catch (e) {
      // 使用列表数据展示
    }
    // 同时加载链路数据
    const chainData = await loadChainData(user.id);
    setDetailChainData({ ...chainData, loading: false });
  };
  
  // 编辑用户
  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    editForm.setFieldsValue({
      username: user.username,
      phone: user.phone,
      real_name: user.real_name,
      gender: user.gender || 0,
    });
    setEditModalVisible(true);
  };
  
  // 修改等级
  const handleChangeLevel = (user: any) => {
    setSelectedUser(user);
    setNewLevel(user.agent_level || 1);
    setLevelModalVisible(true);
  };
  
  // 修改上级
  const handleChangeParent = (user: any) => {
    setSelectedUser(user);
    setNewParentId(user.parent_id || null);
    setParentSearchValue('');
    setParentOptions([]);
    setParentModalVisible(true);
  };
  
  // 查看关系链路
  const handleViewChain = async (user: any) => {
    setSelectedUser(user);
    setChainDrawerVisible(true);
    const chainData = await loadChainData(user.id);
    setUplineChain(chainData.uplineChain);
    setDownlines(chainData.downlines);
  };

  // 搜索上级用户
  const handleSearchParent = async (value: string) => {
    setParentSearchValue(value);
    if (!value || value.length < 2) { setParentOptions([]); return; }
    try {
      // 使用 apiClient 以携带认证token（/api/users 已加 requirePermission 校验）
      const apiClient = (await import('../utils/apiClient')).default;
      const response: any = await apiClient.get('/users', { params: { page: 1, pageSize: 10, keyword: value } });
      const list = response.data?.list || response?.list || [];
      setParentOptions(list.filter((u: any) => u.id !== selectedUser?.id));
    } catch(e) {}
  };

  // 提交修改上级
  const handleParentSubmit = async () => {
    try {
      const { userApi } = await import('../api/userApi');
      await userApi.updateUser(selectedUser.id, { parent_id: newParentId });
      message.success(newParentId ? '上级修改成功' : '已解绑上级');
      setParentModalVisible(false);
      dispatch(fetchUsers(filters));
    } catch (error: any) {
      message.error(typeof error === 'string' ? error : error?.message || '操作失败');
    }
  };

  // 修改用户邀请码
  const handleEditInviteCode = (user: any) => {
    let inputValue = user.invite_code || '';
    
    Modal.confirm({
      title: `修改邀请码 — ${user.username}`,
      content: (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>当前邀请码：</div>
          <Input
            defaultValue={inputValue}
            placeholder="输入新邀请码（4位，数字+字母），留空则随机生成"
            onChange={(e) => inputValue = e.target.value.toUpperCase()}
            style={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: 3 }}
            maxLength={10}
          />
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>留空或点击"随机生成"将自动创建4位唯一邀请码</div>
        </div>
      ),
      okText: "保存",
      cancelText: "取消",
      onOk: async () => {
        try {
          const apiClient = (await import('../utils/apiClient')).default;
          const res = await apiClient.put(`/users/${user.id}/invite-code`, {
            new_code: inputValue.trim() || 'random'
          });
          if (res.data?.code === 0) {
            message.success(`邀请码已更新为：${res.data.data?.invite_code}`);
            dispatch(fetchUsers(filters));
            // 刷新当前选中用户的详情
            const detail = await (await import('../api/userApi')).userApi.getUserDetail(user.id);
            setSelectedUser({ ...detail });
          } else {
            message.error(res.data?.message || '操作失败');
          }
        } catch (err: any) {
          message.error(err?.message || '修改失败');
        }
      },
    });
  };

  const handleChangeStatus = (user: any) => {
    const newStatus = user.status === 1 ? false : true;
    Modal.confirm({
      title: newStatus ? '启用账户' : '禁用账户',
      content: `确定要${newStatus ? '启用' : '禁用'}用户 ${user.username} 吗？`,
      onOk: async () => {
        try {
          await dispatch(changeUserStatus({ userId: user.id, status: newStatus })).unwrap();
          message.success('操作成功');
          dispatch(fetchUsers(filters));
        } catch (error: any) {
          message.error(typeof error === 'string' ? error : (error?.message || '操作失败'));
        }
      },
    });
  };
  
  // 余额调整
  const handleAdjustBalance = (user: any) => {
    setSelectedUser(user);
    balanceForm.resetFields();
    setBalanceModalVisible(true);
  };
  
  // 提交余额调整
  const handleBalanceSubmit = async () => {
    try {
      const values = await balanceForm.validateFields();
      if (!values.amount || values.amount === 0) {
        message.warning('调整金额不能为0');
        return;
      }
      await dispatch(adjustBalance({
        userId: selectedUser.id,
        amount: values.amount,
        remark: values.remark,
      })).unwrap();
      message.success('余额调整成功');
      setBalanceModalVisible(false);
      dispatch(fetchUsers(filters));
      // 如果详情弹窗开着也刷新
      if (detailModalVisible) {
        dispatch(fetchUserDetail(selectedUser.id));
      }
    } catch (error: any) {
      message.error(typeof error === 'string' ? error : (error?.message || '余额调整失败'));
    }
  };
  
  // 查看余额流水
  const handleViewBalanceLog = (user: any) => {
    setSelectedUser(user);
    setBalanceLogModalVisible(true);
  };
  
  // 创建新用户
  const handleCreateUser = () => {
    setSelectedUser(null);
    editForm.resetFields();
    setEditModalVisible(true);
  };
  
  // 提交用户编辑
  const handleEditSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      if (selectedUser) {
        await updateUserFromApi(selectedUser.id, values);
        message.success('用户信息更新成功');
        setEditModalVisible(false);
        dispatch(fetchUsers(filters));
      } else {
        // 新建用户 - 直接调用API（不是thunk，不要dispatch）
        await createUserFromApi(values);
        message.success('用户创建成功');
        setEditModalVisible(false);
        dispatch(fetchUsers(filters));
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || '操作失败';
      message.error(errMsg);
    }
  };
  
  // 直接调用API更新用户
  const updateUserFromApi = async (userId: number, data: any) => {
    const { userApi } = await import('../api/userApi');
    await userApi.updateUser(userId, data);
  };

  // 直接调用API创建用户
  const createUserFromApi = async (data: any) => {
    console.log('[创建用户] 发送数据:', JSON.stringify(data));
    const { usersApi } = await import('../services/dbApi');
    try {
      const result = await usersApi.create(data);
      console.log('[创建用户] 成功:', result);
      return result;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '创建失败';
      console.error('[创建用户] 失败:', msg, err?.response?.status, err?.response?.data);
      throw new Error(msg);
    }
  };
  
  // 提交等级修改
  const handleLevelSubmit = async () => {
    try {
      await dispatch(changeUserLevel({ userId: selectedUser.id, agentLevel: newLevel })).unwrap();
      message.success('等级修改成功');
      setLevelModalVisible(false);
      dispatch(fetchUsers(filters));
    } catch (error: any) {
      message.error(typeof error === 'string' ? error : (error?.message || '等级修改失败'));
    }
  };
  
  // 批量操作
  const handleBatchAction = (action: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    
    switch (action) {
      case 'export':
        handleExport();
        break;
      case 'delete':
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？此操作不可恢复。`,
          okType: 'danger',
          onOk: async () => {
            setBatchActionLoading(true);
            try {
              for (const id of selectedRowKeys) {
                await deleteUserFromStore(id as number);
              }
              message.success('删除成功');
              setSelectedRowKeys([]);
              dispatch(fetchUsers(filters));
            } catch (error) {
              message.error('删除失败');
            }
            setBatchActionLoading(false);
          },
        });
        break;
      default:
        break;
    }
  };
  
  const deleteUserFromStore = async (userId: number) => {
    const { userApi } = await import('../api/userApi');
    await userApi.deleteUser(userId);
  };
  
  // 导出数据
  const handleExport = async () => {
    setExportLoading(true);
    try {
      const { userApi } = await import('../api/userApi');
      const json = await userApi.exportUsers(filters);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `用户数据_${dayjs().format('YYYY-MM-DD')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    } finally {
      setExportLoading(false);
    }
  };
  
  // 重置筛选
  const handleResetFilters = () => {
    setSearchText('');
    dispatch(clearFilters());
  };
  
  // 刷新数据
  const handleRefresh = () => {
    dispatch(fetchUsers(filters));
    dispatch(fetchUserStats());
    message.success('数据已刷新');
  };

  // 余额变动类型映射
  const getChangeTypeText = (type: string) => {
    const map: Record<string, { text: string; color: string }> = {
      manual: { text: '手动调整', color: 'blue' },
      order_pay: { text: '订单支付', color: 'red' },
      order_refund: { text: '订单退款', color: 'green' },
      rebate: { text: '差价返利', color: 'orange' },
      withdraw: { text: '提现', color: 'purple' },
    };
    return map[type] || { text: type, color: 'default' };
  };

  return (
    <div className="user-management-page">
      {/* 页面标题区 */}
      <div className="um-section-header">
        <div className="um-section-title-group">
          <h2 className="um-section-title">用户管理</h2>
          <p className="um-section-subtitle">管理所有代理商和用户，支持筛选、编辑、余额管理等功能</p>
        </div>
        <div className="um-header-actions">
          <button className="um-btn-primary" onClick={handleCreateUser}>
            <PlusOutlined /> 新建用户
          </button>
          <button className="um-btn-outline" onClick={handleRefresh}>
            <ReloadOutlined /> 刷新
          </button>
          <button className="um-btn-outline" onClick={handleExport}>
            <DownloadOutlined /> {exportLoading ? '导出中...' : '导出'}
          </button>
        </div>
      </div>
      
      {/* KPI统计 - 总览 + 6级等级分布 */}
      <div className="um-kpi-container">
        <div className="um-kpi-card" data-level="1">
          <div className="um-kpi-icon-wrapper"><UserAddOutlined /></div>
          <div className="um-kpi-label">总用户数</div>
          <div className="um-kpi-value">{stats.total || 0}<span className="um-kpi-unit">人</span></div>
        </div>
        <div className="um-kpi-card" data-level="2">
          <div className="um-kpi-icon-wrapper"><TeamOutlined /></div>
          <div className="um-kpi-label">活跃用户</div>
          <div className="um-kpi-value">{stats.active || 0}<span className="um-kpi-unit">人</span></div>
        </div>
        <div className="um-kpi-card" data-level="4">
          <div className="um-kpi-icon-wrapper"><PlusOutlined /></div>
          <div className="um-kpi-label">本月新增</div>
          <div className="um-kpi-value">{stats.newThisMonth || 0}<span className="um-kpi-unit">人</span></div>
        </div>
        {/* 6级等级分布 */}
        {levelConfig.map((l) => (
          <div key={l.value} className="um-kpi-card" data-level={String(l.value)}>
            <div className="um-kpi-icon-wrapper">{l.icon}</div>
            <div className="um-kpi-label">{l.text}</div>
            <div className="um-kpi-value">{(stats as any)[`level${l.value}`] || 0}<span className="um-kpi-unit">人</span></div>
          </div>
        ))}
      </div>
      
      {/* 搜索筛选工具栏 */}
      <div className="um-toolbar">
        <div className="um-search-group">
          <Input
            placeholder="用户名 / 手机号 / 姓名"
            prefix={<SearchOutlined style={{ color: 'var(--jlm-text-muted)' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
            className="um-search-input"
          />
          <Select
            placeholder="全部等级"
            className="um-filter-select"
            allowClear
            value={(filters as any).agent_level}
            onChange={(value) => dispatch(setFilters({ agent_level: value }))}
          >
            {levelConfig.map(l => (
              <Option key={l.value} value={l.value}>{l.text}</Option>
            ))}
          </Select>
          <Select
            placeholder="全部状态"
            className="um-filter-select"
            allowClear
            value={(filters as any).status}
            onChange={(value) => dispatch(setFilters({ status: value }))}
          >
            <Option value={1}>正常</Option>
            <Option value={0}>已禁用</Option>
          </Select>
        </div>
        <div className="um-toolbar-actions">
          <button className="um-btn-outline" onClick={handleResetFilters}>
            <FilterOutlined /> 重置
          </button>
          <button className="um-btn-primary" onClick={handleSearch}>
            <SearchOutlined /> 搜索
          </button>
        </div>
      </div>
      
      {/* 批量操作 */}
      {selectedRowKeys.length > 0 && (
        <div className="um-stats-summary" style={{ background: 'var(--jlm-primary-bg)', color: 'var(--jlm-primary)', borderColor: 'var(--jlm-primary-border)' }}>
          <strong>已选择 {selectedRowKeys.length} 个用户</strong>
          <span>·</span>
          <button className="um-action-btn btn-danger" onClick={() => setSelectedRowKeys([])}>取消选择</button>
          <button className="um-action-btn btn-danger" onClick={() => handleBatchAction('delete')}>{batchActionLoading ? '删除中...' : '批量删除'}</button>
          <button className="um-action-btn btn-primary" onClick={() => handleBatchAction('export')}>{exportLoading ? '导出中...' : '导出选中'}</button>
        </div>
      )}
      
      {/* 用户表格 */}
      <div className="um-table-container">
        <Table<any>
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            className: 'table-pagination',
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
          }}
          onChange={handleTableChange}
          scroll={{ x: 1100 }}
          className="user-table"
          rowClassName={(record) => record.status === 0 ? 'row-disabled' : ''}
        />
      </div>
      
      {/* ========== 用户详情弹窗 ========== */}
      <Modal
        title={<><EyeOutlined /> <span>用户详情 - {selectedUser?.username}</span></>}
        open={detailModalVisible}
        onCancel={() => { setDetailModalVisible(false); dispatch(clearCurrentUser()); }}
        width={800}
        className="um-modal"
        footer={[
          <Button key="balance_log" icon={<HistoryOutlined />} onClick={() => { handleViewBalanceLog(selectedUser); }}>
            余额流水
          </Button>,
          <Button key="balance" type="primary" icon={<WalletOutlined />} onClick={() => handleAdjustBalance(selectedUser)}>
            余额调整
          </Button>,
          <Button key="close" onClick={() => { setDetailModalVisible(false); dispatch(clearCurrentUser()); }}>
            关闭
          </Button>,
        ]}
      >
        {currentUser && (
          <div className="um-detail-body">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="用户ID">{currentUser.id}</Descriptions.Item>
              <Descriptions.Item label="用户名">{currentUser.username}</Descriptions.Item>
              <Descriptions.Item label="真实姓名">{currentUser.real_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="手机号">{currentUser.phone}</Descriptions.Item>
              <Descriptions.Item label="代理等级">
                <Tag color={getLevelConfig(currentUser.agent_level).color}>
                  {getLevelConfig(currentUser.agent_level).text}
                </Tag>
                <span style={{ marginLeft: 6, color: '#999', fontSize: 12 }}>
                  (权重: {currentUser.agent_level || 1})
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge status={currentUser.status === 1 ? 'success' : 'error'} 
                  text={currentUser.status === 1 ? '正常' : '已禁用'} />
              </Descriptions.Item>
              {/* 邀请码 - 高亮展示 */}
              <Descriptions.Item label="邀请码" span={2}>
                {currentUser.invite_code ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      padding: '4px 12px', borderRadius: 6,
                      background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                      color: '#fff', fontFamily: 'monospace', fontSize: 15, fontWeight: 'bold',
                      letterSpacing: 2, display: 'inline-flex', alignItems: 'center',
                    }}>
                      <QrcodeOutlined style={{ marginRight: 6, fontSize: 16 }} />
                      {currentUser.invite_code}
                      <Text copyable={{ text: currentUser.invite_code }}
                        style={{ color: '#fff', marginLeft: 8, fontSize: 12, cursor: 'pointer' }}
                      />
                    </div>
                    <Tag color="purple" icon={<QrcodeOutlined />}>唯一标识</Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>下级注册时填写此码自动绑定</Text>
                    <Button type="link" size="small" icon={<EditOutlined />}
                      onClick={() => handleEditInviteCode(currentUser)}
                      style={{ marginLeft: 8, color: '#722ed1' }}
                    >
                      修改
                    </Button>
                  </div>
                ) : (
                  <Space>
                    <Text type="secondary">未生成</Text>
                    <Button type="link" size="small" onClick={() => message.info('邀请码在用户首次注册时自动生成')}>了解</Button>
                  </Space>
                )}
              </Descriptions.Item>
              {/* 上级关系 */}
              <Descriptions.Item label="上级用户" span={2}>
                {currentUser.parent_id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{
                      padding: '4px 10px', borderRadius: 4,
                      background: 'var(--jlm-primary-bg)', borderLeft: '3px solid var(--color-primary)',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}>
                      <LinkOutlined style={{ color: 'var(--color-primary)' }} />
                      <Text strong>{currentUser.parent_username || `ID:${currentUser.parent_id}`}</Text>
                      <Tag>ID: {currentUser.parent_id}</Tag>
                    </div>
                    <Button type="link" size="small" onClick={() => handleChangeParent(currentUser)}>
                      <EditOutlined /> 修改上级
                    </Button>
                  </div>
                ) : (
                  <Space>
                    <Tag color="default">👤 无上级（顶级节点）</Tag>
                    <Button type="link" size="small" onClick={() => handleChangeParent(currentUser)}>
                      <LinkOutlined /> 绑定上级
                    </Button>
                  </Space>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="账户余额">
                <Text strong style={{ color: 'var(--color-success)' }}>
                  ¥{(currentUser.balance || 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="累计收益">
                <Text strong style={{ color: 'var(--color-warning)' }}>
                  ¥{(currentUser.total_income || 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="直属成员">
                <Space>
                  <TeamOutlined />
                  <Text strong>{currentUser.direct_members || 0} 人</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {dayjs(currentUser.registered_at || currentUser.created_at).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            {/* ========== 关系网络可视化区域 ========== */}
            <div className="um-detail-network" style={{ marginTop: 20 }}>
              <Divider orientation="left" style={{ margin: '8px 0 16px' }}>
                <ApartmentOutlined style={{ marginRight: 6 }} />
                <span style={{ fontWeight: 600 }}>关系网络</span>
                <Button
                  type="link"
                  size="small"
                  style={{ marginLeft: 8, fontSize: 12 }}
                  onClick={() => handleViewChain(currentUser || selectedUser)}
                >
                  完整链路 →
                </Button>
              </Divider>

              {/* 邀请码卡片 */}
              <Card
                size="small"
                className="network-card invite-card"
                style={{
                  marginBottom: 12,
                  background: currentUser.invite_code
                    ? 'linear-gradient(135deg, #f0e5ff 0%, #efdbff 100%)'
                    : '#fafafa',
                  borderColor: currentUser.invite_code ? '#d3adf7' : '#d9d9d9',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>我的邀请码（用于发展下级）</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {currentUser.invite_code ? (
                        <>
                          <Text code copyable={{ text: currentUser.invite_code }}
                            style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', color: '#722ed1', cursor: 'pointer' }}
                          >
                            {currentUser.invite_code}
                          </Text>
                          <Tag color="purple" style={{ margin: 0 }}>唯一</Tag>
                        </>
                      ) : (
                        <Text type="secondary">未生成</Text>
                      )}
                    </div>
                  </div>
                  <QrcodeOutlined style={{ fontSize: 28, color: currentUser.invite_code ? '#722ed1' : '#ccc' }} />
                </div>
              </Card>

              {/* 上级链路 */}
              <Card
                size="small"
                title={
                  <span style={{ fontSize: 13 }}>
                    <span style={{ color: '#1890ff' }}>↑</span> 上级链路
                    {!detailChainData.loading && (
                      <Tag style={{ marginLeft: 6, fontSize: 11 }}>{detailChainData.uplineChain.length}层</Tag>
                    )}
                  </span>
                }
                style={{ marginBottom: 12 }}
                className="network-card upline-card"
              >
                {detailChainData.loading ? (
                  <div style={{ textAlign: 'center', padding: 12, color: '#999' }}>
                    <ClockCircleOutlined spin style={{ marginRight: 6 }} /> 加载中...
                  </div>
                ) : detailChainData.uplineChain.length > 0 ? (
                  <div className="upline-chain-mini">
                    {detailChainData.uplineChain.map((u: any, i: number) => {
                      const isDirect = i === 0;
                      const profitHint = isDirect && u.agent_level !== null && currentUser
                        ? ((u.agent_level || 0) > (currentUser.agent_level || 0)
                          ? { text: `✅ 可赚差价`, color: 'green' }
                          : (u.agent_level || 0) === (currentUser.agent_level || 0)
                            ? { text: `⚠️ 平级不赚`, color: 'orange' }
                            : { text: `❌ 不赚差价`, color: 'red' })
                        : null;

                      return (
                        <div key={u.id} className={`chain-node ${isDirect ? 'direct-parent' : ''}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px', marginBottom: i < detailChainData.uplineChain.length - 1 ? 6 : 0,
                            borderRadius: 6, border: '1px solid #f0f0f0',
                            background: isDirect ? '#e6f7ff' : '#fafafa',
                            borderLeftWidth: 3,
                            borderLeftColor: isDirect ? '#1890ff' : getLevelConfig(u.agent_level || 1).color,
                          }}
                        >
                          <Avatar size={26}
                            src={u.avatar_url}
                            style={{
                              backgroundColor: getLevelConfig(u.agent_level || 1).color,
                              flexShrink: 0,
                              fontSize: 12,
                            }}
                          >
                            {(u.username || '?')[0]}
                          </Avatar>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Text strong style={{ fontSize: 13 }}>{u.username}</Text>
                              <Tag color={getLevelConfig(u.agent_level || 1).color}
                                style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
                                {u.levelName || getLevelConfig(u.agent_level || 1).text}
                              </Tag>
                              {u.relation && (
                                <span style={{ fontSize: 10, color: '#999' }}>{u.relation}</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#999' }}>
                              ID:{u.id} · 📱{u.phone || '-'} · 团队{u.direct_members || 0}人
                              {u.invite_code && <span> · 码:{u.invite_code}</span>}
                            </div>
                          </div>
                          {profitHint && (
                            <Tag color={profitHint.color === 'green' ? 'success' : profitHint.color === 'orange' ? 'warning' : 'error'}
                              style={{ fontSize: 10, flexShrink: 0 }}>
                              {profitHint.text}
                            </Tag>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty description={<span style={{ color: '#bbb' }}>无上级（顶级节点）</span>}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    imageStyle={{ height: 36 }} />
                )}
              </Card>

              {/* 直属下级 */}
              <Card
                size="small"
                title={
                  <span style={{ fontSize: 13 }}>
                    <span style={{ color: '#52c41a' }}>↓</span> 直属下级
                    {!detailChainData.loading && (
                      <Tag style={{ marginLeft: 6, fontSize: 11 }}>{detailChainData.downlines.length}人</Tag>
                    )}
                  </span>
                }
                className="network-card downline-card"
              >
                {detailChainData.loading ? (
                  <div style={{ textAlign: 'center', padding: 12, color: '#999' }}>
                    <ClockCircleOutlined spin style={{ marginRight: 6 }} /> 加载中...
                  </div>
                ) : detailChainData.downlines.length > 0 ? (
                  <List
                    size="small"
                    dataSource={detailChainData.downlines.slice(0, 5)} // 最多展示5条，更多去抽屉看
                    renderItem={(u: any) => {
                      const canEarnRebate = currentUser && (currentUser.agent_level || 0) > (u.agent_level || 0);
                      return (
                        <List.Item
                          style={{ padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}
                          actions={[
                            <Tag key="level" color={getLevelConfig(u.agent_level || 1).color}
                              style={{ fontSize: 10, margin: 0 }}>
                              {u.levelName || getLevelConfig(u.agent_level || 1).text}
                            </Tag>,
                            canEarnRebate
                              ? <Tag key="profit" color="success" style={{ fontSize: 10, margin: 0 }}>可赚差价</Tag>
                              : null,
                          ].filter(Boolean) as any[]}
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar size={28}
                                style={{ backgroundColor: getLevelConfig(u.agent_level || 1).color, fontSize: 12 }}
                              >
                                {(u.username || '?')[0]}
                              </Avatar>
                            }
                            title={
                              <Space size={4}>
                                <Text strong style={{ fontSize: 13 }}>{u.username}</Text>
                                {u.real_name && <span style={{ color: '#999', fontSize: 11 }}>({u.real_name})</span>}
                              </Space>
                            }
                            description={
                              <span style={{ fontSize: 11, color: '#999' }}>
                                ID:{u.id} · 📱{u.phone || '-'}
                                {u.total_income != null && <> · 收益¥{(u.total_income || 0).toFixed(2)}</>}
                                · 注册于{dayjs(u.registered_at || u.created_at).format('YYYY-MM-DD')}
                              </span>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                ) : (
                  <Empty description={<span style={{ color: '#bbb' }}>暂无直属下级</span>}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    imageStyle={{ height: 36 }} />
                )}
                {detailChainData.downlines.length > 5 && (
                  <div style={{ textAlign: 'center', paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                    <Button type="link" size="small" onClick={() => handleViewChain(currentUser || selectedUser)}>
                      查看全部 {detailChainData.downlines.length} 名下级 →
                    </Button>
                  </div>
                )}
              </Card>

              {/* 差价规则速查 */}
              <div style={{
                marginTop: 12, padding: '8px 12px', borderRadius: 6,
                background: '#fafafa', border: '1px dashed #d9d9d9', fontSize: 11.5, lineHeight: 1.8, color: '#666'
              }}>
                <Text type="secondary" strong style={{ fontSize: 12 }}>📋 差价规则：</Text>
                <span>上级权重 &gt; 下级权重 → ✅ 赚差价；平级 → ⛔ 不赚；向上找第一个权重大于下单用户的上级赚钱，仅1人。</span>
              </div>
            </div>
            
            {/* 收益统计 */}
            {(currentUser as any).commissionStats && (
              <Card title="收益统计" size="small" style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="已结算" 
                      value={(currentUser as any).commissionStats.settled || 0} 
                      prefix="¥" valueStyle={{ color: 'var(--color-success)', fontSize: 16 }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="待结算" 
                      value={(currentUser as any).commissionStats.pending || 0} 
                      prefix="¥" valueStyle={{ color: 'var(--color-warning)', fontSize: 16 }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="总佣金笔数" 
                      value={(currentUser as any).commissionStats.total_count || 0}
                      valueStyle={{ fontSize: 16 }} />
                  </Col>
                </Row>
              </Card>
            )}
            
            {/* 最近订单 */}
            {(currentUser as any).recentOrders?.length > 0 && (
              <Card title="最近订单" size="small" style={{ marginTop: 16 }}>
                <List
                  size="small"
                  dataSource={(currentUser as any).recentOrders}
                  renderItem={(order: any) => (
                    <List.Item>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>{order.order_no}</span>
                        <span>¥{order.actual_amount?.toFixed(2)}</span>
                        <Tag color={order.order_status === 3 ? 'green' : order.order_status === 4 ? 'red' : 'blue'}>
                          {['待付款','待发货','已发货','已完成','已取消'][order.order_status] || order.order_status}
                        </Tag>
                        <span style={{ color: '#999' }}>{dayjs(order.order_time).format('MM-DD HH:mm')}</span>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </div>
        )}
      </Modal>
      
      {/* ========== 余额调整弹窗 ========== */}
      <Modal
        title={<><WalletOutlined /> <span>余额调整 - {selectedUser?.username}</span></>}
        open={balanceModalVisible}
        onCancel={() => setBalanceModalVisible(false)}
        onOk={handleBalanceSubmit}
        okText="确认调整"
        width={480}
        className="um-modal"
      >
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--jlm-success-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--jlm-success-border)' }}>
          <Text>当前余额：<Text strong style={{ fontSize: 18, color: 'var(--jlm-success)' }}>
            ¥{(selectedUser?.balance || 0).toFixed(2)}
          </Text></Text>
        </div>
        <Form form={balanceForm} layout="vertical">
          <Form.Item
            name="amount"
            label="调整金额（正数增加，负数扣减）"
            rules={[{ required: true, message: '请输入调整金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={-999999}
              max={999999}
              precision={2}
              prefix="¥"
              placeholder="输入正数增加余额，负数扣减余额"
            />
          </Form.Item>
          <Form.Item
            name="adjustType"
            label="快捷操作"
          >
            <Space>
              <Button size="small" onClick={() => balanceForm.setFieldsValue({ amount: 100 })}>+100</Button>
              <Button size="small" onClick={() => balanceForm.setFieldsValue({ amount: 500 })}>+500</Button>
              <Button size="small" onClick={() => balanceForm.setFieldsValue({ amount: 1000 })}>+1000</Button>
              <Button size="small" danger onClick={() => balanceForm.setFieldsValue({ amount: -100 })}>-100</Button>
              <Button size="small" danger onClick={() => balanceForm.setFieldsValue({ amount: -500 })}>-500</Button>
            </Space>
          </Form.Item>
          <Form.Item name="remark" label="调整备注">
            <Input.TextArea rows={2} placeholder="请输入调整原因（如：充值、返利、扣款等）" />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* ========== 余额流水弹窗 ========== */}
      <Modal
        title={<><HistoryOutlined /> <span>余额流水 - {selectedUser?.username}</span></>}
        open={balanceLogModalVisible}
        onCancel={() => setBalanceLogModalVisible(false)}
        width={700}
        className="um-modal"
        footer={[
          <Button key="refresh" icon={<ReloadOutlined />} onClick={() => dispatch(fetchBalanceLogs({ userId: selectedUser?.id, page: 1 }))}>
            刷新
          </Button>,
          <Button key="close" onClick={() => setBalanceLogModalVisible(false)}>关闭</Button>,
        ]}
      >
        <Table
          dataSource={balanceLogs.list}
          rowKey="id"
          loading={balanceLogs.loading}
          size="small"
          pagination={{
            current: balanceLogs.page,
            pageSize: balanceLogs.pageSize,
            total: balanceLogs.total,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => dispatch(fetchBalanceLogs({ userId: selectedUser?.id, page, pageSize })),
          }}
          columns={[
            {
              title: '时间',
              dataIndex: 'created_at',
              width: 160,
              render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
            },
            {
              title: '类型',
              dataIndex: 'change_type',
              width: 100,
              render: (type: string) => {
                const config = getChangeTypeText(type);
                return <Tag color={config.color}>{config.text}</Tag>;
              },
            },
            {
              title: '变动金额',
              dataIndex: 'change_amount',
              width: 120,
              align: 'right',
              render: (amount: number) => (
                <Text strong style={{ color: amount > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {amount > 0 ? '+' : ''}{amount.toFixed(2)}
                </Text>
              ),
            },
            {
              title: '余额变动',
              key: 'balance_change',
              width: 180,
              render: (_, record: any) => (
                <span style={{ color: '#999', fontSize: 12 }}>
                  {record.balance_before?.toFixed(2)} → {record.balance_after?.toFixed(2)}
                </span>
              ),
            },
            {
              title: '操作人',
              dataIndex: 'operator_name',
              width: 80,
              render: (name: string) => name || '系统',
            },
            {
              title: '备注',
              dataIndex: 'remark',
              ellipsis: true,
            },
          ]}
        />
      </Modal>
      
      {/* ========== 编辑用户弹窗 ========== */}
      <Modal
        title={selectedUser ? '编辑用户' : '新建用户'}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleEditSubmit}
        okText="保存"
        className="um-modal"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="real_name" label="真实姓名">
            <Input placeholder="请输入真实姓名" />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* ========== 修改等级弹窗 ========== */}
      <Modal
        title="修改代理等级"
        open={levelModalVisible}
        onCancel={() => setLevelModalVisible(false)}
        onOk={handleLevelSubmit}
        okText="确认修改"
        className="um-modal"
      >
        <div style={{ marginBottom: 16 }}>
          <Text>用户：<Text strong>{selectedUser?.username}</Text></Text>
          <Divider type="vertical" />
          <Text>当前等级：
            <Tag color={getLevelConfig(selectedUser?.agent_level).color}>
              {getLevelConfig(selectedUser?.agent_level).text}
            </Tag>
            (权重: {selectedUser?.agent_level || 1})
          </Text>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ⚠️ 修改等级后，差价利润将按新权重重新计算。平级不赚差价。
          </Text>
        </div>
        <div>
          <Text style={{ marginBottom: 8, display: 'block' }}>选择新等级：</Text>
          <Select value={newLevel} onChange={setNewLevel} style={{ width: '100%' }} size="large">
            {levelConfig.map(l => (
              <Option key={l.value} value={l.value}>
                <Space>
                  <span style={{ color: l.color }}>{l.icon}</span>
                  <span>{l.text}</span>
                  <Tag style={{ marginLeft: 4 }} color={l.color}>权重{l.value}</Tag>
                </Space>
              </Option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* ========== 修改上级弹窗（新增） ========== */}
      <Modal
        title={<><LinkOutlined /> <span>修改上级关系 - {selectedUser?.username}</span></>}
        open={parentModalVisible}
        onCancel={() => setParentModalVisible(false)}
        onOk={handleParentSubmit}
        okText="确认修改"
        width={520}
        className="um-modal"
      >
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--jlm-warning-bg)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--jlm-warning)' }}>
          <Space>
            <Text strong>当前用户：</Text>
            <span className={`um-level-tag level-${selectedUser?.agent_level || 1}`}>
              {getLevelConfig(selectedUser?.agent_level).text} (权重{selectedUser?.agent_level || 1})
            </span>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text style={{ marginBottom: 8, display: 'block' }}>当前上级：</Text>
          {selectedUser?.parent_id ? (
            <div className="um-chain-link">
              <LinkOutlined />
              <Text>{selectedUser.parent_username || `ID:${selectedUser.parent_id}`}</Text>
              <Tag>ID: {selectedUser.parent_id}</Tag>
            </div>
          ) : (
            <div className="um-chain-link">
              <Text type="secondary">无上级（顶级用户）</Text>
            </div>
          )}
        </div>

        <div>
          <Text style={{ marginBottom: 8, display: 'block' }}>选择新上级（搜索用户名或手机号）：</Text>
          <Select
            showSearch
            value={newParentId}
            onSearch={handleSearchParent}
            onChange={(val: number | null) => setNewParentId(val)}
            placeholder="输入关键词搜索用户，留空则解绑上级"
            allowClear
            style={{ width: '100%' }}
            size="large"
            filterOption={false}
            notFoundContent={parentSearchValue ? '搜索中...' : '请输入关键词'}
            options={parentOptions.map((u: any) => ({
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                  <span>
                    <strong>{u.username}</strong>
                    {u.real_name && <span style={{ color: '#999', marginLeft: 6 }}>({u.real_name})</span>}
                    <span style={{ color: '#999', marginLeft: 8 }}>{u.phone}</span>
                  </span>
                  <Tag color={getLevelConfig(u.agent_level).color} style={{ marginRight: 0 }}>
                    {getLevelConfig(u.agent_level).text}
                  </Tag>
                </div>
              ),
              value: u.id,
            }))}
          />
        </div>

        {newParentId && (() => {
          const parent = parentOptions.find((p: any) => p.id === newParentId);
          if (!parent) return null;
          const parentWeight = parent.agent_level || 1;
          const userWeight = selectedUser?.agent_level || 1;
          let profitNote = '';
          if (parentWeight > userWeight) {
            profitNote = `✅ 上级权重(${parentWeight}) > 用户权重(${userWeight})，该上级可赚取差价`;
          } else if (parentWeight === userWeight) {
            profitNote = `⚠️ 平级（权重均为${parentWeight}），该上级不可赚取差价`;
          } else {
            profitNote = `❌ 上级权重(${parentWeight}) < 用户权重(${userWeight})，该上级不可赚取差价`;
          }
          return (
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              background: parentWeight > userWeight ? '#f6ffed' : '#fff2f0',
              border: `1px solid ${parentWeight > userWeight ? '#b7eb8f' : '#ffccc7'}`,
            }}>
              <Text style={{ color: parentWeight > userWeight ? '#389e0d' : '#cf1322' }}>
                {profitNote}
              </Text>
            </div>
          );
        })()}

        <div style={{ marginTop: 12 }}>
          <Button
            size="small"
            danger
            icon={<DisconnectOutlined />}
            onClick={() => setNewParentId(null)}
          >
            解绑上级（设为无上级）
          </Button>
        </div>
      </Modal>

      {/* ========== 关系链路抽屉（新增） ========== */}
      <Drawer
        title={
          <>
            <ApartmentOutlined />
            <span>关系链路 - {selectedUser?.username}</span>
          </>
        }
        placement="right"
        width={560}
        open={chainDrawerVisible}
        onClose={() => setChainDrawerVisible(false)}
        className="team-tree-drawer"
      >
        {/* 当前用户信息 */}
        <Card size="small" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #e94560 0%, #c0392b 100%)', color: '#fff', border: 'none' }}>
          <div style={{ color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space>
                <Avatar style={{ backgroundColor: '#fff', color: '#e94560' }} size={40}>
                  {(selectedUser?.username || '?')[0]}
                </Avatar>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 16 }}>{selectedUser?.username}</div>
                  <div style={{ opacity: 0.8, fontSize: 12 }}>
                    {getLevelConfig(selectedUser?.agent_level).text} · 权重{selectedUser?.agent_level || 1}
                  </div>
                </div>
              </Space>
              <div style={{ textAlign: 'right' }}>
                <QrcodeOutlined style={{ fontSize: 20, opacity: 0.8 }} />
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{selectedUser?.invite_code || '-'}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* 向上链路 */}
        <Divider orientation="left">
          <Space>
            <span style={{ color: '#1890ff' }}>↑</span>
            向上链路（上级关系）
          </Space>
        </Divider>
        
        {uplineChain.length > 0 ? (
          <Timeline
            items={uplineChain.map((u: any, i: number) => ({
              color: i === 0 ? '#1890ff' : '#d9d9d9',
              dot: i === 0 ? <CrownOutlined style={{ color: '#722ed1', fontSize: 14 }} /> : undefined,
              children: (
                <Card 
                  key={u.id} 
                  size="small" 
                  style={{ 
                    marginBottom: 8, 
                    borderLeft: `3px solid ${i === 0 ? '#722ed1' : getLevelConfig(u.agent_level).color}` 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Avatar size={28} src={u.avatar_url} style={{ backgroundColor: getLevelConfig(u.agent_level).color }}>
                        {(u.username || '?')[0]}
                      </Avatar>
                      <div>
                        <div><Text strong>{u.username}</Text></div>
                        <div style={{ fontSize: 11, color: '#999' }}>
                          ID:{u.id} · {u.phone || '-'}
                        </div>
                      </div>
                    </Space>
                    <Tag color={getLevelConfig(u.agent_level).color}>
                      {getLevelConfig(u.agent_level).text}
                      <span style={{ marginLeft: 3, fontSize: 10 }}>权{u.agent_level}</span>
                    </Tag>
                  </div>
                  {i === 0 && selectedUser && u.agent_level !== null && (
                    <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 4, fontSize: 11,
                      background: (u.agent_level || 0) > (selectedUser.agent_level || 0) ? '#f6ffed' :
                               (u.agent_level || 0) === (selectedUser.agent_level || 0) ? '#fffbe6' : '#fff2f0'
                    }}>
                      {(u.agent_level || 0) > (selectedUser.agent_level || 0)
                        ? `✅ 权重${u.agent_level} > ${selectedUser.agent_level} → 该上级可赚取此用户订单的差价`
                        : (u.agent_level || 0) === (selectedUser.agent_level || 0)
                          ? `⚠️ 平级(权重${u.agent_level}) → 不赚差价`
                          : `❌ 权重${u.agent_level} < ${selectedUser.agent_level} → 不赚差价`
                      }
                    </div>
                  )}
                </Card>
              ),
            }))}
          />
        ) : (
          <Empty description="无上级链路（顶级用户）" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}

        {/* 向下团队 */}
        <Divider orientation="left" style={{ marginTop: 24 }}>
          <Space>
            <span style={{ color: '#52c41a' }}>↓</span>
            直属下级（{downlines.length}人）
          </Space>
        </Divider>

        {downlines.length > 0 ? (
          <List
            size="small"
            dataSource={downlines}
            renderItem={(u: any) => (
              <List.Item
                style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
                actions={[
                  <Tag key="level" color={getLevelConfig(u.agent_level).color}>
                    {getLevelConfig(u.agent_level).text}
                  </Tag>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar size={32} style={{ backgroundColor: getLevelConfig(u.agent_level).color }}>
                      {(u.username || '?')[0]}
                    </Avatar>
                  }
                  title={
                    <Space>
                      <Text strong>{u.username}</Text>
                      {u.real_name && <span style={{ color: '#999' }}>({u.real_name})</span>}
                    </Space>
                  }
                  description={
                    <span style={{ fontSize: 11, color: '#999' }}>
                      ID:{u.id} · 📱{u.phone || '-'} · 团队{u.direct_members || 0}人
                      · 注册于{dayjs(u.registered_at || u.created_at).format('YYYY-MM-DD')}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无直属下级" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}

        {/* 差价规则说明 */}
        <Card 
          size="small" 
          style={{ marginTop: 16, background: '#fafafa', border: '1px dashed #d9d9d9' }}
          title={<Text type="secondary" style={{ fontSize: 12 }}>📋 差价规则速查</Text>}
        >
          <div style={{ fontSize: 12, lineHeight: 1.8, color: '#666' }}>
            <div>• 上级权重 &gt; 下级权重 → ✅ 赚差价</div>
            <div>• 上级权重 = 下级权重（平级）→ ⛔ 不赚</div>
            <div>• 上级权重 &lt; 下级权重 → ⛔ 不赚</div>
            <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #eee' }}>
              💡 从直属往上找，<Text strong>第一个权重大于下单用户的上级赚钱</Text>，仅1人赚
            </div>
          </div>
        </Card>
      </Drawer>
    </div>
  );
};

export default UserManagement;
