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
  MenuProps,
  DatePicker
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  MoreOutlined,
  DownloadOutlined,
  UploadOutlined,
  UserAddOutlined,
  TeamOutlined,
  DollarOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';

import { 
  fetchUsers, 
  fetchUserStats, 
  changeUserStatus,
  selectUsers, 
  selectUserStats, 
  selectUserLoading,
  selectUserPagination,
  selectUserFilters,
  setFilters,
  clearFilters
} from '../store/slices/userSlice';
import type { AppDispatch, RootState } from '@/store';
import type { UserInfo } from '@/types/user';
import UserDetailModal from '@/components/users/UserDetailModal';
import UserFormModal from '@/components/users/UserFormModal';
import StatusChangeModal from '@/components/users/StatusChangeModal';
import LevelChangeModal from '@/components/users/LevelChangeModal';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const UserManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  
  // Redux状态
  const users = useSelector(selectUsers);
  const stats = useSelector(selectUserStats);
  const loading = useSelector(selectUserLoading);
  const pagination = useSelector(selectUserPagination);
  const filters = useSelector(selectUserFilters) as any;
  
  // 本地状态
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  
  // 加载数据
  useEffect(() => {
    dispatch(fetchUsers(filters));
    dispatch(fetchUserStats());
  }, [dispatch, filters]);
  
  // 表格列定义
  const columns: ColumnsType<any> = [
    {
      title: '用户信息',
      key: 'user_info',
      width: 250,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden' }}>
            <img 
              src={record.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg'} 
              alt={record.username}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>
              {record.username}
              {record.realName && ` (${record.realName})`}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {record.phone}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {dayjs((record as any).registered_at || (record as any).createdAt).format('YYYY-MM-DD HH:mm')}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '代理等级',
      dataIndex: 'agent_level',
      key: 'agent_level',
      width: 120,
      render: (level: number) => {
        const levelMap: Record<number, { text: string; color: string }> = {
          1: { text: '会员', color: 'default' },
          2: { text: '打版代言人', color: 'green' },
          3: { text: '代理商', color: 'blue' },
          4: { text: '批发商', color: 'orange' },
          5: { text: '首席分公司', color: 'red' },
          6: { text: '集团事业部', color: 'purple' },
        };
        const config = levelMap[level as keyof typeof levelMap] || { text: '未知', color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: [
        { text: '会员', value: 1 },
        { text: '打版代言人', value: 2 },
        { text: '代理商', value: 3 },
        { text: '批发商', value: 4 },
        { text: '首席分公司', value: 5 },
        { text: '集团事业部', value: 6 },
      ],
    },
    {
      title: '账户余额',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      render: (balance: number) => (
        <Text strong style={{ color: balance > 0 ? '#07c160' : '#999' }}>
          ¥{balance.toFixed(2)}
        </Text>
      ),
      sorter: true,
    },
    {
      title: '累计收益',
      dataIndex: 'total_income',
      key: 'total_income',
      width: 120,
      render: (income: number) => (
        <Text strong style={{ color: '#fa8c16' }}>
          ¥{income.toFixed(2)}
        </Text>
      ),
      sorter: true,
    },
    {
      title: '团队人数',
      dataIndex: 'member_count',
      key: 'member_count',
      width: 100,
      render: (count: number = 0) => (
        <Badge 
          count={count} 
          style={{ backgroundColor: count > 0 ? '#07c160' : '#999' }}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => {
        const statusMap = {
          0: { text: '已禁用', color: 'red' },
          1: { text: '正常', color: 'green' },
          2: { text: '审核中', color: 'orange' },
        };
        const config = statusMap[status as keyof typeof statusMap] || { text: '未知', color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: [
        { text: '正常', value: 1 },
        { text: '已禁用', value: 0 },
        { text: '审核中', value: 2 },
      ],
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_, record) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'view',
            label: '查看详情',
            icon: <EyeOutlined />,
            onClick: () => handleViewDetail(record),
          },
          {
            key: 'edit',
            label: '编辑信息',
            icon: <EditOutlined />,
            onClick: () => handleEditUser(record),
          },
          {
            key: 'change_level',
            label: '修改等级',
            icon: <TeamOutlined />,
            onClick: () => handleChangeLevel(record),
          },
          {
            key: 'change_status',
            label: record.status === 1 ? '禁用账户' : '启用账户',
            icon: record.status === 1 ? <DeleteOutlined /> : <UserAddOutlined />,
            onClick: () => handleChangeStatus(record),
          },
          {
            key: 'performance',
            label: '业绩报表',
            icon: <DollarOutlined />,
            onClick: () => navigate(`/users/${record.id}/performance`),
          },
          {
            key: 'study',
            label: '学习进度',
            icon: <BookOutlined />,
            onClick: () => navigate(`/users/${record.id}/study`),
          },
        ];
        
        return (
          <Space size="small">
            <Button 
              type="link" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
            <Dropdown menu={{ items: menuItems }} placement="bottomRight">
              <Button type="link" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];
  
  // 处理搜索
  const handleSearch = () => {
    dispatch(setFilters({ 
      ...filters, 
      search: searchText,
      page: 1 
    } as any));
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
    
    // 处理筛选
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.length > 0) {
        params[key] = value[0];
      }
    });
    
    // 处理排序
    if (sorter && !Array.isArray(sorter) && sorter.field && sorter.order) {
      params.sort_by = sorter.field;
      params.order = sorter.order === 'ascend' ? 'asc' : 'desc';
    }
    
    dispatch(setFilters(params));
  };
  
  // 查看详情
  const handleViewDetail = (user: UserInfo) => {
    setSelectedUser(user);
    setDetailModalVisible(true);
  };
  
  // 编辑用户
  const handleEditUser = (user: UserInfo) => {
    setSelectedUser(user);
    setFormModalVisible(true);
  };
  
  // 修改等级
  const handleChangeLevel = (user: UserInfo) => {
    setSelectedUser(user);
    setLevelModalVisible(true);
  };
  
  // 修改状态
  const handleChangeStatus = (user: UserInfo) => {
    setSelectedUser(user);
    setStatusModalVisible(true);
  };
  
  // 创建新用户
  const handleCreateUser = () => {
    setSelectedUser(null);
    setFormModalVisible(true);
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
          content: `确定要删除选中的 ${selectedRowKeys.length} 个用户吗？`,
          onOk: () => {
            // 这里应该调用批量删除API
            message.success('删除成功');
            setSelectedRowKeys([]);
          },
        });
        break;
      default:
        break;
    }
  };
  
  // 导出数据
  const handleExport = async () => {
    setExportLoading(true);
    try {
      // 模拟导出
      await new Promise(resolve => setTimeout(resolve, 1000));
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
  
  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={(stats as any)?.total || 1568}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={1423}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日新增"
              value={23}
              prefix={<PlusOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待审核"
              value={5}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>
      
      {/* 筛选和操作区域 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>用户管理</Title>
          <Space>
            <Button 
              icon={<DownloadOutlined />}
              loading={exportLoading}
              onClick={() => handleBatchAction('export')}
            >
              导出
            </Button>
            <Button 
              icon={<UploadOutlined />}
            >
              导入
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleCreateUser}
            >
              新建用户
            </Button>
          </Space>
        </div>
        
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item>
            <Input
              placeholder="搜索用户名/手机号/姓名"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 250 }}
            />
          </Form.Item>
          <Form.Item label="代理等级">
            <Select
              style={{ width: 140 }}
              value={filters.agent_level}
              onChange={(value) => dispatch(setFilters({ agent_level: value } as any))}
              allowClear
            >
              <Option value={1}>会员</Option>
              <Option value={2}>打版代言人</Option>
              <Option value={3}>代理商</Option>
              <Option value={4}>批发商</Option>
              <Option value={5}>首席分公司</Option>
              <Option value={6}>集团事业部</Option>
            </Select>
          </Form.Item>
          <Form.Item label="状态">
            <Select
              style={{ width: 120 }}
              value={filters.status}
              onChange={(value) => dispatch(setFilters({ status: value } as any))}
              allowClear
            >
              <Option value={1}>正常</Option>
              <Option value={0}>已禁用</Option>
              <Option value={2}>审核中</Option>
            </Select>
          </Form.Item>
          <Form.Item label="注册时间">
            <RangePicker
              onChange={(dates) => {
                if (dates) {
                  dispatch(setFilters({ 
                    start_date: dates[0]?.format('YYYY-MM-DD'),
                    end_date: dates[1]?.format('YYYY-MM-DD')
                  } as any));
                } else {
                  dispatch(setFilters({ start_date: undefined, end_date: undefined } as any));
                }
              }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleResetFilters}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
        
        {/* 批量操作 */}
        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 6 }}>
            <Space>
              <Text>已选择 {selectedRowKeys.length} 个用户</Text>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>取消选择</Button>
              <Button size="small" danger onClick={() => handleBatchAction('delete')}>
                批量删除
              </Button>
            </Space>
          </div>
        )}
      </Card>
      
      {/* 用户表格 */}
      <Card>
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
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
      
      {/* 模态框 */}
      {selectedUser && (
        <>
          <UserDetailModal
            user={selectedUser}
            visible={detailModalVisible}
            onClose={() => setDetailModalVisible(false)}
          />
          <UserFormModal
            user={selectedUser}
            visible={formModalVisible}
            onClose={() => setFormModalVisible(false)}
            onSuccess={() => {
              setFormModalVisible(false);
              dispatch(fetchUsers(filters));
            }}
          />
          <StatusChangeModal
            user={selectedUser}
            visible={statusModalVisible}
            onClose={() => setStatusModalVisible(false)}
            onSuccess={() => {
              setStatusModalVisible(false);
              dispatch(fetchUsers(filters));
            }}
          />
          <LevelChangeModal
            user={selectedUser}
            visible={levelModalVisible}
            onClose={() => setLevelModalVisible(false)}
            onSuccess={() => {
              setLevelModalVisible(false);
              dispatch(fetchUsers(filters));
            }}
          />
        </>
      )}
    </div>
  );
};

export default UserManagement;