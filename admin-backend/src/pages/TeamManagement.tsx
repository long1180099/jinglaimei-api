/**
 * 团队管理页面
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { 
  fetchTeamMembers, 
  fetchTeamStats, 
  fetchTeamMemberStatus, 
  updateQueryParams,
  selectMember 
} from '../store/slices/teamSlice';
import { fetchUsers } from '../store/slices/userSlice';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Input, 
  Button, 
  Select, 
  DatePicker, 
  Statistic, 
  Tag, 
  Avatar, 
  Space, 
  Badge,
  Tabs,
  Dropdown,
  MenuProps,
  message,
  Tooltip
} from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  ExportOutlined, 
  TeamOutlined, 
  UserAddOutlined,
  EyeOutlined,
  EditOutlined,
  MessageOutlined,
  PhoneOutlined,
  MailOutlined,
  CrownOutlined,
  StarOutlined,
  TrophyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AgentLevel } from '../types/commission';
import { TeamMember } from '../types/team';
import { LevelTag } from '../components/users/LevelTag';
import TeamTree from '../components/team/TeamTree';
import TeamStatsCards from '../components/team/TeamStatsCards';
import TeamGrowthChart from '../components/team/TeamGrowthChart';
import MemberDetailModal from '../components/team/MemberDetailModal';
import './TeamManagement.css';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const getLevelColor = (level: any): string => {
  const colorMap: Record<string, string> = {
    '0': 'default', 'basic': 'default',
    '1': 'blue', 'agent': 'blue',
    '2': 'purple', 'senior_agent': 'purple',
    '3': 'gold', 'partner': 'gold',
    '4': 'red', 'senior_partner': 'red',
  };
  return colorMap[String(level)] || 'default';
};

const getLevelLabel = (level: any): string => {
  const labelMap: Record<string, string> = {
    '0': '普通用户', 'basic': '普通用户',
    '1': '会员', 'member': '会员',
    '2': '打版代言人', 'model_agent': '打版代言人',
    '3': '代理商', 'agent': '代理商',
    '4': '批发商', 'wholesaler': '批发商',
    '5': '首席分公司', 'chief_company': '首席分公司',
    '6': '集团事业部', 'group_division': '集团事业部',
  };
  return labelMap[String(level)] || String(level);
};

const TeamManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    members,
    queryResult,
    queryLoading,
    queryParams,
    stats,
    statsLoading,
    memberStatus,
    statusLoading
  } = useSelector((state: RootState) => state.team);
  
  const { currentUser } = useSelector((state: RootState) => state.user);
  
  // 状态
  const [activeTab, setActiveTab] = useState('tree');
  const [searchValue, setSearchValue] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  // 等级筛选选项
  const levelOptions = [
    { value: AgentLevel.MEMBER, label: '会员', color: '#8c8c8c' },
    { value: AgentLevel.MODEL_AGENT, label: '打版代言人', color: '#52c41a' },
    { value: AgentLevel.AGENT, label: '代理商', color: '#1890ff' },
    { value: AgentLevel.WHOLESALER, label: '批发商', color: '#fa8c16' },
    { value: AgentLevel.CHIEF_COMPANY, label: '首席分公司', color: '#f5222d' }
  ];
  
  // 初始化加载数据
  useEffect(() => {
    if (currentUser) {
      loadTeamData();
      dispatch(fetchUsers({})); // 加载用户数据用于关联
    }
  }, [currentUser, dispatch]);
  
  // 查询参数变化时重新加载数据
  useEffect(() => {
    if (currentUser) {
      loadTeamMembers();
    }
  }, [queryParams, currentUser, dispatch]);
  
  const loadTeamData = () => {
    if (!currentUser) return;
    
    dispatch(fetchTeamMembers(queryParams));
    dispatch(fetchTeamStats(currentUser.id));
    dispatch(fetchTeamMemberStatus(currentUser.id));
  };
  
  const loadTeamMembers = () => {
    if (!currentUser) return;
    dispatch(fetchTeamMembers(queryParams));
  };
  
  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchValue(value);
    dispatch(updateQueryParams({ search: value, page: 1 }));
  };
  
  // 处理等级筛选
  const handleLevelFilter = (value: AgentLevel | undefined) => {
    dispatch(updateQueryParams({ level: value, page: 1 }));
  };
  
  // 处理活跃状态筛选
  const handleActiveFilter = (value: boolean | undefined) => {
    dispatch(updateQueryParams({ isActive: value, page: 1 }));
  };
  
  // 处理排序
  const handleSort = (field: string) => {
    const currentSort = queryParams.sortBy;
    const currentOrder = queryParams.sortOrder;
    
    let newSortOrder: 'asc' | 'desc' = 'desc';
    if (currentSort === field && currentOrder === 'desc') {
      newSortOrder = 'asc';
    }
    
    dispatch(updateQueryParams({ 
      sortBy: field as any, 
      sortOrder: newSortOrder,
      page: 1 
    }));
  };
  
  // 处理分页
  const handlePageChange = (page: number, pageSize: number) => {
    dispatch(updateQueryParams({ page, pageSize }));
  };
  
  // 查看成员详情
  const handleViewDetail = (member: TeamMember) => {
    setSelectedMember(member);
    setDetailModalVisible(true);
    dispatch(selectMember(member.id));
  };
  
  // 导出数据
  const handleExport = () => {
    message.info('导出功能开发中...');
  };
  
  // 邀请新成员
  const handleInvite = () => {
    message.info('邀请功能开发中...');
  };
  
  // 表格列定义
  const columns = [
    {
      title: '成员信息',
      dataIndex: 'username',
      key: 'username',
      width: 200,
      render: (text: string, record: TeamMember) => (
        <Space>
          <Avatar src={record.avatar} size="large">
            {text.charAt(0)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              <PhoneOutlined /> {record.phone}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 120,
      render: (level: AgentLevel, record: TeamMember) => (
        <LevelTag level={level} label={record.levelLabel} />
      ),
      sorter: true,
      sortOrder: queryParams.sortBy === 'level' ? queryParams.sortOrder : null as any,
      onHeaderCell: () => ({
        onClick: () => handleSort('level')
      })
    },
    {
      title: '团队规模',
      dataIndex: 'teamSize',
      key: 'teamSize',
      width: 120,
      render: (size: number) => (
        <Space>
          <TeamOutlined style={{ color: '#1890ff' }} />
          <span>{size}人</span>
        </Space>
      ),
      sorter: true,
      sortOrder: queryParams.sortBy === 'teamSize' ? queryParams.sortOrder : null as any,
      onHeaderCell: () => ({
        onClick: () => handleSort('teamSize')
      })
    },
    {
      title: '累计收益',
      dataIndex: 'totalCommission',
      key: 'totalCommission',
      width: 150,
      render: (amount: number) => (
        <div style={{ fontWeight: 600, color: '#fa8c16' }}>
          ¥{amount.toFixed(2)}
        </div>
      ),
      sorter: true,
      defaultSortOrder: 'descend' as const,
      sortOrder: queryParams.sortBy === 'commission' ? queryParams.sortOrder : null as any,
      onHeaderCell: () => ({
        onClick: () => handleSort('commission')
      })
    },
    {
      title: '本月收益',
      dataIndex: 'monthCommission',
      key: 'monthCommission',
      width: 120,
      render: (amount: number) => (
        <div style={{ color: '#52c41a' }}>
          ¥{amount.toFixed(2)}
        </div>
      )
    },
    {
      title: '加入时间',
      dataIndex: 'joinTime',
      key: 'joinTime',
      width: 150,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD')
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Badge 
          status={isActive ? 'success' : 'default'} 
          text={isActive ? '活跃' : '休眠'} 
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: TeamMember) => (
        <Space>
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="发送消息">
            <Button 
              type="text" 
              icon={<MessageOutlined />}
              onClick={() => message.info(`向${record.username}发送消息`)}
            />
          </Tooltip>
          <Tooltip title="联系">
            <Button 
              type="text" 
              icon={<PhoneOutlined />}
              onClick={() => message.info(`联系${record.username}: ${record.phone}`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
  
  // 顶部工具栏
  const renderToolbar = () => (
    <Card className="toolbar-card">
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} sm={12} md={8} lg={6}>
          <Search
            placeholder="搜索姓名或电话"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            onChange={(e) => setSearchValue(e.target.value)}
            value={searchValue}
          />
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Select
            placeholder="选择等级"
            allowClear
            style={{ width: '100%' }}
            size="large"
            onChange={handleLevelFilter}
          >
            {levelOptions.map(option => (
              <Option key={option.value} value={option.value}>
                <Tag color={option.color}>{option.label}</Tag>
              </Option>
            ))}
          </Select>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Select
            placeholder="活跃状态"
            allowClear
            style={{ width: '100%' }}
            size="large"
            onChange={handleActiveFilter}
          >
            <Option value={true}>活跃</Option>
            <Option value={false}>休眠</Option>
          </Select>
        </Col>
        
        <Col xs={24} sm={12} md={8} lg={6}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              type="primary" 
              icon={<UserAddOutlined />}
              size="large"
              onClick={handleInvite}
            >
              邀请成员
            </Button>
            <Button 
              icon={<ExportOutlined />}
              size="large"
              onClick={handleExport}
            >
              导出
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
  
  // 团队成员状态卡片
  const renderMemberStatus = () => (
    <Card title="团队成员状态" className="status-card">
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Statistic
            title="在线人数"
            value={memberStatus?.online || 0}
            prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
            suffix="人"
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="今日活跃"
            value={memberStatus?.activeToday || 0}
            prefix={<StarOutlined style={{ color: '#1890ff' }} />}
            suffix="人"
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="本周有订单"
            value={memberStatus?.orderedThisWeek || 0}
            prefix={<TrophyOutlined style={{ color: '#fa8c16' }} />}
            suffix="人"
          />
        </Col>
        <Col xs={12} sm={6}>
          <Statistic
            title="本月升级"
            value={memberStatus?.upgradedThisMonth || 0}
            prefix={<CrownOutlined style={{ color: '#f5222d' }} />}
            suffix="人"
          />
        </Col>
      </Row>
    </Card>
  );
  
  return (
    <div className="team-management">
      {/* 页面标题 */}
      <div className="page-header">
        <h1>团队管理</h1>
        <p>管理您的团队成员，查看团队结构和成员详情</p>
      </div>
      
      {/* 工具栏 */}
      {renderToolbar()}
      
      {/* 团队统计卡片 */}
      <TeamStatsCards stats={stats} loading={statsLoading} />
      
      {/* 成员状态卡片 */}
      {renderMemberStatus()}
      
      {/* 增长图表 */}
      <TeamGrowthChart userId={currentUser?.id || ''} />
      
      {/* 主要内容区域 */}
      <Card className="main-content-card">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'tree',
              label: (
                <span>
                  <TeamOutlined />
                  团队树形结构
                </span>
              ),
              children: <TeamTree />
            },
            {
              key: 'list',
              label: (
                <span>
                  <UserAddOutlined />
                  成员列表
                </span>
              ),
              children: (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ marginRight: 8 }}>共 {queryResult?.total || 0} 名成员</span>
                    {queryParams.level && (
                      <Tag color={levelOptions.find(l => l.value === queryParams.level)?.color}>
                        {levelOptions.find(l => l.value === queryParams.level)?.label}
                      </Tag>
                    )}
                    {queryParams.isActive !== undefined && (
                      <Tag color={queryParams.isActive ? 'success' : 'default'}>
                        {queryParams.isActive ? '活跃' : '休眠'}
                      </Tag>
                    )}
                  </div>
                  
                  <Table
                    columns={columns}
                    dataSource={members}
                    rowKey="id"
                    loading={queryLoading}
                    pagination={{
                      current: queryParams.page,
                      pageSize: queryParams.pageSize,
                      total: queryResult?.total || 0,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => 
                        `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                      onChange: handlePageChange,
                      onShowSizeChange: (current, size) => 
                        dispatch(updateQueryParams({ page: current, pageSize: size }))
                    }}
                    rowSelection={{
                      selectedRowKeys: [],
                      onChange: (selectedRowKeys) => {
                        // 可以在这里处理批量选择
                      }
                    }}
                  />
                </>
              )
            }
          ]}
        />
      </Card>
      
      {/* 成员详情模态框 */}
      {selectedMember && (
        <MemberDetailModal
          visible={detailModalVisible}
          memberId={selectedMember.id}
          onClose={() => {
            setDetailModalVisible(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
};

export default TeamManagement;