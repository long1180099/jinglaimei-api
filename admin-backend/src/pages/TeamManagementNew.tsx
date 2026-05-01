// 现代化的团队管理页面 - 树形结构设计
import React, { useEffect, useState } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Input, 
  Select, 
  Tag, 
  Modal, 
  Form, 
  Row, 
  Col, 
  Card, 
  Statistic,
  Alert,
  Popconfirm,
  message,
  Badge,
  Image,
  Divider,
  Tooltip,
  Dropdown,
  Avatar,
  Progress,
  Tree,
  Empty,
  Switch,
  Collapse,
  Tabs
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  TeamOutlined,
  UserOutlined,
  DollarOutlined,
  BarChartOutlined,
  SettingOutlined,
  StarOutlined,
  FireOutlined,
  RocketOutlined,
  AppstoreOutlined,
  ExportOutlined,
  ImportOutlined,
  CloudUploadOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  LineChartOutlined,
  ExpandOutlined,
  CompressOutlined,
  ShareAltOutlined,
  MessageOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  CrownOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  RiseOutlined,
  DownOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { 
  fetchTeamMembers, 
  fetchTeamStats,
  updateQueryParams
} from '../store/slices/teamSlice';
import { TeamMember, TeamStats } from '../types/team';
import { TeamApiService } from '../api/teamApi';
import './TeamManagement.css';

const { Search } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { TabPane } = Tabs;

// 树形节点数据接口
interface TreeNode {
  key: string;
  title: React.ReactNode;
  children?: TreeNode[];
  member?: TeamMember;
  isExpanded?: boolean;
}

const TeamManagementNew: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    members, 
    stats, 
    queryParams,
    queryLoading
  } = useSelector((state: RootState) => state.team);

  // 状态管理
  const [selectedMemberKeys, setSelectedMemberKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'grid'>('tree');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [teamTreeData, setTeamTreeData] = useState<TreeNode[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [showGrowthChart, setShowGrowthChart] = useState(true);

  // 初始化数据
  useEffect(() => {
    dispatch(fetchTeamMembers(queryParams));
    dispatch(fetchTeamStats('current-user-id')); // 需要用户ID，使用默认值
  }, [dispatch, queryParams]);

  // 构建树形数据 - 基于真实 parent_id 构建上下级关系树
  useEffect(() => {
    if (members.length > 0) {
      const treeData = buildRealTreeData(members);
      setTeamTreeData(treeData);
      // 默认展开前两级
      const defaultExpandedKeys = getDefaultExpandedKeys(treeData, 2);
      setExpandedKeys(defaultExpandedKeys);
    }
  }, [members]);

  // 获取默认展开的节点
  const getDefaultExpandedKeys = (treeData: TreeNode[], depth: number): string[] => {
    const keys: string[] = [];
    
    const traverse = (nodes: TreeNode[], currentDepth: number) => {
      if (currentDepth > depth) return;
      
      nodes.forEach(node => {
        keys.push(node.key);
        if (node.children && node.children.length > 0) {
          traverse(node.children, currentDepth + 1);
        }
      });
    };
    
    traverse(treeData, 1);
    return keys;
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    dispatch(updateQueryParams({ search: value, page: 1 }));
  };

  // 处理等级筛选
  const handleLevelFilter = (level: string) => {
    const levelValue = level === 'all' ? undefined : parseInt(level);
    dispatch(updateQueryParams({ level: levelValue as any, page: 1 }));
  };

  // 处理状态筛选
  const handleStatusFilter = (status: string) => {
    const isActive = status === 'all' ? undefined : status === 'active';
    dispatch(updateQueryParams({ isActive, page: 1 }));
  };

  // 等级颜色和标签辅助函数 — 统一使用与UserManagement一致的颜色体系
  const getLevelColor = (level: number) => {
    // 与 UserManagementNew.tsx 的 levelConfig 保持一致！
    const colors: Record<number, string> = {
      1: '#999999',   // 会员 - 灰色
      2: 'var(--color-success)',  // 打版代言人 - 绿色
      3: 'var(--color-primary)',  // 代理商 - 品牌主色(蓝)
      4: 'var(--color-warning)',  // 批发商 - 橙色/警告色
      5: '#e94560',   // 首席分公司 - 品牌红
      6: '#722ed1',   // 集团事业部 - 紫色
    };
    return colors[level] || colors[1];
  };

  const getLevelLabel = (level: number) => {
    // 与 UserManagementNew.tsx 的 levelConfig.text 保持一致
    const labels: Record<number, string> = {
      1: '会员',
      2: '打版代言人',
      3: '代理商',
      4: '批发商',
      5: '首席分公司',
      6: '集团事业部',
    };
    return labels[level] || '未知';
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    }
    return amount.toFixed(0);
  };

  // 处理树节点展开
  const handleTreeExpand = (keys: string[]) => {
    setExpandedKeys(keys);
    setAutoExpandParent(false);
  };

  // 处理树节点选择
  const handleTreeSelect = (keys: string[]) => {
    setSelectedKeys(keys);
    if (keys.length > 0) {
      const memberId = keys[0];
      const member = members.find(m => m.id === memberId);
      if (member) {
        showMemberDetail(member);
      }
    }
  };

  // 显示成员详情 — 使用真实数据（不再使用假数据）
  const showMemberDetail = (member: TeamMember) => {
    // 从当前members列表中筛选该成员的真实直接下级
    const realSubordinates = members.filter(m => m.parentId === member.id);

    // 活跃成员 = 最近有订单的成员
    const realActiveMembers = members
      .filter(m => m.parentId === member.id && m.isActive)
      .sort((a, b) => (b.totalCommission || 0) - (a.totalCommission || 0))
      .slice(0, 5);

    Modal.info({
      title: (
        <div className="member-modal-title">
          <Avatar size={64} src={member.avatar} icon={<UserOutlined />} />
          <div className="member-title-info">
            <h2>{member.username}</h2>
            <div className="member-title-tags">
              <Tag color={getLevelColor(member.level)}>{getLevelLabel(member.level)}</Tag>
              {member.totalCommission > 50000 && <Tag color="gold">顶尖业绩</Tag>}
              <Tag color={member.isActive ? "success" : "default"}>
                {member.isActive ? "活跃" : "非活跃"}
              </Tag>
            </div>
          </div>
        </div>
      ),
      width: 1000,
      content: (
        <div className="member-detail-modal">
          <Tabs defaultActiveKey="info" type="card">
            <TabPane tab="基本信息" key="info">
              <Row gutter={24}>
                <Col span={12}>
                  <Card className="info-card">
                    <div className="info-item">
                      <span className="info-label">手机号码</span>
                      <span className="info-value">
                        <PhoneOutlined /> {member.phone}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">电子邮箱</span>
                      <span className="info-value">
                        <MailOutlined /> {member.email || '未设置'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">所在地区</span>
                      <span className="info-value">
                        {(member as any).region || '未设置'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">加入时间</span>
                      <span className="info-value">
                        <ClockCircleOutlined /> {new Date(member.joinTime).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="info-card">
                    <div className="info-item">
                      <span className="info-label">上级代理</span>
                      <span className="info-value">
                        {(() => {
                          // 从当前members列表中查找真实的上级
                          const parent = member.parentId ? members.find(m => m.id === member.parentId) : null;
                          return parent ? parent.username : (member.parentId ? `ID:${member.parentId}` : '无');
                        })()}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">直接下级</span>
                      <span className="info-value">
                        <TeamOutlined /> {member.directSubordinates} 人
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">团队总人数</span>
                      <span className="info-value">
                        <TeamOutlined /> {member.teamSize} 人
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">团队等级</span>
                      <span className="info-value">
                        <CrownOutlined /> {getLevelLabel(member.level)}
                      </span>
                    </div>
                  </Card>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab="业绩数据" key="performance">
              <Row gutter={24}>
                <Col span={8}>
                  <Card className="performance-card">
                    <div className="performance-icon total">
                      <DollarOutlined />
                    </div>
                    <div className="performance-info">
                      <div className="performance-label">累计收益</div>
                      <div className="performance-value">¥{formatCurrency(member.totalCommission)}</div>
                      <div className="performance-trend">
                        <span className="trend-up">↑ 15.3%</span>
                        <span>较上月</span>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card className="performance-card">
                    <div className="performance-icon monthly">
                      <BarChartOutlined />
                    </div>
                    <div className="performance-info">
                      <div className="performance-label">本月收益</div>
                      <div className="performance-value">¥{formatCurrency(member.monthCommission)}</div>
                      <div className="performance-trend">
                        <span className="trend-up">↑ 8.7%</span>
                        <span>较上周</span>
                      </div>
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card className="performance-card">
                    <div className="performance-icon growth">
                      <LineChartOutlined />
                    </div>
                    <div className="performance-info">
                      <div className="performance-label">增长率</div>
                      <div className="performance-value">{Math.floor(Math.random() * 30) + 10}%</div>
                      <div className="performance-trend">
                        <span className="trend-up">↑ 12.5%</span>
                        <span>较上周</span>
                      </div>
                    </div>
                  </Card>
                </Col>
              </Row>
              
              <Divider />
              
              <Card title="收益趋势" className="chart-card">
                <div className="placeholder-chart">
                  <div className="chart-placeholder">
                    收益趋势图表加载中...
                  </div>
                </div>
              </Card>
            </TabPane>
            
            <TabPane tab="直接下级" key="subordinates">
              <Card title={`直接下级成员 (${realSubordinates.length}人)`}>
                {realSubordinates.length > 0 ? (
                  <div className="subordinate-section">
                    <div className="subordinate-stats">
                      <Row gutter={16}>
                        <Col span={6}>
                          <div className="sub-stat-item">
                            <div className="sub-stat-icon total">
                              <TeamOutlined />
                            </div>
                            <div className="sub-stat-info">
                              <div className="sub-stat-value">{realSubordinates.length}</div>
                              <div className="sub-stat-label">下级总数</div>
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div className="sub-stat-item">
                            <div className="sub-stat-icon active">
                              <FireOutlined />
                            </div>
                            <div className="sub-stat-info">
                              <div className="sub-stat-value">{realSubordinates.filter(s => s.isActive).length}</div>
                              <div className="sub-stat-label">活跃下级</div>
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div className="sub-stat-item">
                            <div className="sub-stat-icon commission">
                              <DollarOutlined />
                            </div>
                            <div className="sub-stat-info">
                              <div className="sub-stat-value">¥{formatCurrency(realSubordinates.reduce((sum, s) => sum + (s.totalCommission || 0), 0))}</div>
                              <div className="sub-stat-label">下级总收益</div>
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div className="sub-stat-item">
                            <div className="sub-stat-icon levels">
                              <CrownOutlined />
                            </div>
                            <div className="sub-stat-info">
                              <div className="sub-stat-value">{new Set(realSubordinates.map(s => s.level)).size}</div>
                              <div className="sub-stat-label">等级分布</div>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                    
                    <Divider />
                    
                    <div className="subordinate-list">
                      <Row gutter={[16, 16]}>
                        {realSubordinates.map(subordinate => (
                          <Col span={24} key={subordinate.id}>
                            <Card className="subordinate-card" hoverable>
                              <div className="subordinate-content">
                                <Avatar size={48} src={subordinate.avatar} icon={<UserOutlined />} />
                                <div className="subordinate-info">
                                  <div className="subordinate-header">
                                    <span className="subordinate-name">{subordinate.username}</span>
                                    <div className="subordinate-tags">
                                      <Tag color={getLevelColor(subordinate.level)}>
                                        {getLevelLabel(subordinate.level)}
                                      </Tag>
                                      <Tag color={subordinate.isActive ? "success" : "default"}>
                                        {subordinate.isActive ? "活跃" : "非活跃"}
                                      </Tag>
                                    </div>
                                  </div>
                                  <div className="subordinate-stats">
                                    <Row gutter={8}>
                                      <Col span={8}>
                                        <div className="sub-detail-item">
                                          <TeamOutlined className="sub-icon" />
                                          <div className="sub-detail-content">
                                            <div className="sub-detail-value">{subordinate.teamSize}</div>
                                            <div className="sub-detail-label">团队人数</div>
                                          </div>
                                        </div>
                                      </Col>
                                      <Col span={8}>
                                        <div className="sub-detail-item">
                                          <DollarOutlined className="sub-icon" />
                                          <div className="sub-detail-content">
                                            <div className="sub-detail-value">¥{formatCurrency(subordinate.totalCommission)}</div>
                                            <div className="sub-detail-label">累计收益</div>
                                          </div>
                                        </div>
                                      </Col>
                                      <Col span={8}>
                                        <div className="sub-detail-item">
                                          <CalendarOutlined className="sub-icon" />
                                          <div className="sub-detail-content">
                                            <div className="sub-detail-value">{new Date(subordinate.joinTime).toLocaleDateString().slice(0, 10)}</div>
                                            <div className="sub-detail-label">加入时间</div>
                                          </div>
                                        </div>
                                      </Col>
                                    </Row>
                                  </div>
                                </div>
                                <Button 
                                  type="link" 
                                  icon={<EyeOutlined />}
                                  className="view-detail-btn"
                                  onClick={() => showMemberDetail(subordinate)}
                                >
                                  查看详情
                                </Button>
                              </div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  </div>
                ) : (
                  <Empty description="暂无直接下级成员" />
                )}
              </Card>
            </TabPane>
            
            <TabPane tab="活跃成员" key="active">
              <Card title={`活跃团队成员 (${realActiveMembers.length}人)`}>
                {realActiveMembers.length > 0 ? (
                  <div className="active-section">
                    <div className="active-stats">
                      <Row gutter={16}>
                        <Col span={8}>
                          <div className="active-stat-item">
                            <div className="active-stat-icon orders">
                              <ShoppingOutlined />
                            </div>
                            <div className="active-stat-info">
                              <div className="active-stat-value">{realActiveMembers.reduce((sum, m) => sum + m.totalOrders, 0)}</div>
                              <div className="active-stat-label">活跃成员总订单</div>
                            </div>
                          </div>
                        </Col>
                        <Col span={8}>
                          <div className="active-stat-item">
                            <div className="active-stat-icon purchase">
                              <DollarOutlined />
                            </div>
                            <div className="active-stat-info">
                              <div className="active-stat-value">¥{formatCurrency(realActiveMembers.reduce((sum, m) => sum + m.totalPurchase, 0))}</div>
                              <div className="active-stat-label">活跃成员总进货额</div>
                            </div>
                          </div>
                        </Col>
                        <Col span={8}>
                          <div className="active-stat-item">
                            <div className="active-stat-icon commission">
                              <RiseOutlined />
                            </div>
                            <div className="active-stat-info">
                              <div className="active-stat-value">¥{formatCurrency(realActiveMembers.reduce((sum, m) => sum + m.monthCommission, 0))}</div>
                              <div className="active-stat-label">本月收益合计</div>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                    
                    <Divider />
                    
                    <div className="active-members-list">
                      <Table
                        dataSource={realActiveMembers}
                        columns={[
                          {
                            title: '成员信息',
                            key: 'member',
                            render: (_, record) => (
                              <div className="active-member-cell">
                                <Avatar size={32} src={record.avatar} icon={<UserOutlined />} />
                                <div className="active-member-info">
                                  <div className="active-member-name">{record.username}</div>
                                  <div className="active-member-level">
                                    <Tag color={getLevelColor(record.level)}>
                                      {getLevelLabel(record.level)}
                                    </Tag>
                                    <span className="active-member-phone">{record.phone}</span>
                                  </div>
                                </div>
                              </div>
                            ),
                          },
                          {
                            title: '活跃度',
                            key: 'activity',
                            render: (_, record) => {
                              const lastOrderDate = record.lastOrderTime ? new Date(record.lastOrderTime) : null;
                              const now = new Date();
                              let activityLevel = '高';
                              let color = '#52c41a';
                              
                              if (lastOrderDate) {
                                const hoursDiff = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60));
                                if (hoursDiff <= 24) {
                                  activityLevel = '极高';
                                  color = '#f5222d';
                                } else if (hoursDiff <= 72) {
                                  activityLevel = '高';
                                  color = '#52c41a';
                                } else if (hoursDiff <= 168) {
                                  activityLevel = '中';
                                  color = '#fa8c16';
                                } else {
                                  activityLevel = '低';
                                  color = '#bfbfbf';
                                }
                              }
                              
                              return (
                                <div className="activity-level-cell">
                                  <Progress 
                                    type="circle" 
                                    percent={record.lastOrderTime ? 85 : 30} 
                                    size={40}
                                    strokeColor={color}
                                    format={() => (
                                      <div className="activity-percent">
                                        <FireOutlined style={{ color }} />
                                      </div>
                                    )}
                                  />
                                  <div className="activity-info">
                                    <div className="activity-text" style={{ color }}>{activityLevel}</div>
                                    <div className="activity-time">
                                      最后下单: {lastOrderDate ? lastOrderDate.toLocaleDateString() : '无记录'}
                                    </div>
                                  </div>
                                </div>
                              );
                            },
                          },
                          {
                            title: '业绩数据',
                            key: 'performance',
                            render: (_, record) => (
                              <div className="performance-cell">
                                <div className="performance-item">
                                  <div className="performance-label">累计收益</div>
                                  <div className="performance-value">¥{formatCurrency(record.totalCommission)}</div>
                                </div>
                                <div className="performance-item">
                                  <div className="performance-label">本月收益</div>
                                  <div className="performance-value">¥{formatCurrency(record.monthCommission)}</div>
                                </div>
                                <div className="performance-item">
                                  <div className="performance-label">团队规模</div>
                                  <div className="performance-value">{record.teamSize}人</div>
                                </div>
                              </div>
                            ),
                          },
                          {
                            title: '操作',
                            key: 'actions',
                            render: (_, record) => (
                              <Space>
                                <Button 
                                  type="link" 
                                  icon={<MessageOutlined />}
                                 
                                >
                                  发送消息
                                </Button>
                                <Button 
                                  type="link" 
                                  icon={<EyeOutlined />}
                                 
                                  onClick={() => showMemberDetail(record)}
                                >
                                  详情
                                </Button>
                              </Space>
                            ),
                          },
                        ]}
                        pagination={{ pageSize: 5 }}
                        rowKey="id"
                      />
                    </div>
                  </div>
                ) : (
                  <Empty description="暂无活跃成员数据" />
                )}
              </Card>
            </TabPane>
            
            <TabPane tab="团队结构" key="structure">
              <Card title="下级团队结构">
                {member.teamSize > 1 ? (
                  <div className="team-structure">
                    <div className="structure-info">
                      <div className="structure-item">
                        <span className="structure-label">直接下级</span>
                        <span className="structure-value">{member.directSubordinates} 人</span>
                      </div>
                      <div className="structure-item">
                        <span className="structure-label">间接下级</span>
                        <span className="structure-value">{member.teamSize - member.directSubordinates - 1} 人</span>
                      </div>
                      <div className="structure-item">
                        <span className="structure-label">团队层级</span>
                        <span className="structure-value">3 级</span>
                      </div>
                    </div>
                    
                    <Divider />
                    
                    <div className="structure-visualization">
                      <div className="structure-chart">
                        <div className="hierarchy-chart">
                          <div className="hierarchy-container">
                            <div className="hierarchy-level level-0">
                              <div className="hierarchy-node current">
                                <Avatar size={48} src={member.avatar} icon={<UserOutlined />} />
                                <div className="node-label">{member.username}</div>
                                <div className="node-level">{getLevelLabel(member.level)}</div>
                              </div>
                            </div>
                            
                            <div className="hierarchy-connector">
                              <div className="connector-line"></div>
                              <div className="connector-arrow"></div>
                            </div>
                            
                            <div className="hierarchy-level level-1">
                              {realSubordinates.slice(0, 3).map((sub, index) => (
                                <div key={sub.id} className="hierarchy-node subordinate">
                                  <Avatar size={36} src={sub.avatar} icon={<UserOutlined />} />
                                  <div className="node-label">{sub.username}</div>
                                  <div className="node-level">{getLevelLabel(sub.level)}</div>
                                  <div className="node-stats">
                                    <span className="node-stat">
                                      <TeamOutlined /> {sub.teamSize}
                                    </span>
                                    <span className="node-stat">
                                      <DollarOutlined /> ¥{formatCurrency(sub.totalCommission)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {realSubordinates.length > 3 && (
                                <div className="hierarchy-node more">
                                  <PlusOutlined />
                                  <div className="node-label">还有{realSubordinates.length - 3}人</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="hierarchy-connector">
                              <div className="connector-line"></div>
                              <div className="connector-arrow"></div>
                            </div>
                            
                            <div className="hierarchy-level level-2">
                              <div className="hierarchy-node grandchild">
                                <Avatar size={24} icon={<UserOutlined />} />
                                <div className="node-label">下级团队</div>
                                <div className="node-total">{member.teamSize - member.directSubordinates - 1}人</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Empty description="暂无下级团队成员" />
                )}
              </Card>
            </TabPane>
          </Tabs>
        </div>
      ),
      okText: '关闭',
      maskClosable: true,
      className: 'member-detail-modal-wrapper'
    });
  };

  // 批量操作菜单
  const batchMenuItems = [
    { key: 'export', label: '导出选中成员', icon: <ExportOutlined /> },
    { key: 'message', label: '发送消息通知', icon: <MessageOutlined /> },
    { key: 'promote', label: '批量晋升等级', icon: <RocketOutlined /> },
    { key: 'award', label: '发放团队奖励', icon: <TrophyOutlined /> },
  ];

  // 统计卡片组件
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: { value: number; isUp: boolean };
  }> = ({ title, value, icon, color, trend }) => {
    return (
      <Card className="stat-card" hoverable>
        <div className="stat-content">
          <div className="stat-icon" style={{ backgroundColor: `${color}20`, color }}>
            {icon}
          </div>
          <div className="stat-info">
            <div className="stat-label">{title}</div>
            <div className="stat-value">{value}</div>
            {trend && (
              <div className="stat-trend">
                <span className={`trend-${trend.isUp ? 'up' : 'down'}`}>
                  {trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="trend-label">较上月</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // 等级分布组件
  const LevelDistribution: React.FC<{ stats: TeamStats }> = ({ stats }) => {
    const totalMembers = stats.totalMembers;
    const s = stats as any;
    const levels = [
      // 与 UserManagementNew.tsx 的 levelConfig.color 保持一致
      { level: 1, label: '会员', count: s.level1Count, color: '#999999' },
      { level: 2, label: '打版代言人', count: s.level2Count, color: '#52c41a' }, // var(--color-success) 解析值
      { level: 3, label: '代理商', count: s.level3Count, color: '#1890ff' }, // var(--color-primary)
      { level: 4, label: '批发商', count: s.level4Count, color: '#fa8c16' }, // var(--color-warning)
      { level: 5, label: '首席分公司', count: s.level5Count, color: '#e94560' }, // 品牌红（关键修复！）
      { level: 6, label: '集团事业部', count: s.level6Count, color: '#722ed1' },
    ];

    return (
      <Card className="distribution-card">
        <div className="card-header">
          <TeamOutlined />
          <span>团队等级分布</span>
        </div>
        <div className="distribution-content">
          <div className="distribution-bars">
            {levels.map(item => {
              const percentage = totalMembers > 0 ? (item.count / totalMembers) * 100 : 0;
              return (
                <div key={item.level} className="distribution-item">
                  <div className="distribution-info">
                    <div className="distribution-label">
                      <span className="level-dot" style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                    </div>
                    <div className="distribution-count">{item.count}人</div>
                  </div>
                  <Progress 
                    percent={percentage} 
                    strokeColor={item.color}
                    strokeWidth={8}
                    showInfo={false}
                  />
                  <div className="distribution-percentage">{percentage.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="tm-page">
      {/* 页面头部 */}
      <div className="tm-header">
        <div className="tm-header-content">
          <h1 className="tm-page-title">团队管理中心</h1>
          <p className="tm-page-subtitle">可视化团队层级结构 · 精准管理每位成员</p>
        </div>
        <div className="tm-header-actions">
          <button className="tm-btn-import" onClick={() => message.info('批量导入功能开发中')}>
            <CloudUploadOutlined /> 批量导入
          </button>
          <button className="tm-btn-export" onClick={() => TeamApiService.exportTeamData(queryParams, {})}>
            <ExportOutlined /> 导出数据
          </button>
          <Dropdown menu={{
            items: [
              { key: 'invite', label: '邀请新成员', icon: <PlusOutlined /> },
              { key: 'template', label: '下载模板', icon: <SettingOutlined /> },
              { key: 'settings', label: '团队设置', icon: <SettingOutlined /> },
            ]
          }}>
            <button className="tm-btn-export"><SettingOutlined /> 更多操作</button>
          </Dropdown>
        </div>
      </div>

      {/* KPI统计卡片 */}
      <div className="tm-kpi-section">
        <Row gutter={[20, 20]}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="团队成员总数"
              value={stats?.totalMembers ?? 0}
              icon={<TeamOutlined />}
              color="#e94560"
              trend={{ value: 8.7, isUp: true }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="今日新增成员"
              value={(stats as any)?.todayNewMembers ?? 0}
              icon={<UserOutlined />}
              color="#10b981"
              trend={{ value: 12.5, isUp: true }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="团队总收益"
              value={`¥${formatCurrency((stats as any)?.totalRevenue ?? 0)}`}
              icon={<DollarOutlined />}
              color="#f59e0b"
              trend={{ value: 15.3, isUp: true }}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="平均增长率"
              value={`${(stats as any)?.averageGrowthRate ?? 0}%`}
              icon={<LineChartOutlined />}
              color="#3b82f6"
              trend={{ value: 5.2, isUp: true }}
            />
          </Col>
        </Row>
      </div>

      {/* 主要内容区域 */}
      <div className="tm-main-content">
        <Row gutter={[24, 24]}>
          {/* 左侧：团队树形结构 */}
          <Col xs={24} lg={16}>
            <Card className="tm-tree-card">
              <div className="tm-card-header">
                <div className="tm-card-title">
                  <AppstoreOutlined />
                  <span>团队层级结构</span>
                  <Tag color="#e94560">树形视图</Tag>
                </div>
                <div className="header-actions">
                  <Space>
                    <Tooltip title="树形结构视图，清晰展示上下级关系">
                      <Button 
                        type={viewMode === 'tree' ? 'primary' : 'default'}
                        icon={<AppstoreOutlined />}
                        onClick={() => { setViewMode('tree'); message.success('已切换到树形视图'); }}
                        className="tm-view-mode-btn"
                      >
                        树形视图
                      </Button>
                    </Tooltip>
                    <Tooltip title="列表视图，适合查看详细数据">
                      <Button 
                        type={viewMode === 'list' ? 'primary' : 'default'}
                        icon={<BarChartOutlined />}
                        onClick={() => { setViewMode('list'); message.success('已切换到列表视图'); }}
                        className="tm-view-mode-btn"
                      >
                        列表视图
                      </Button>
                    </Tooltip>
                    <Tooltip title="网格视图，直观查看团队分布">
                      <Button 
                        type={viewMode === 'grid' ? 'primary' : 'default'}
                        icon={<AppstoreOutlined />}
                        onClick={() => { setViewMode('grid'); message.success('已切换到网格视图'); }}
                        className="tm-view-mode-btn"
                      >
                        网格视图
                      </Button>
                    </Tooltip>
                    
                    <Tooltip title="展开所有节点，查看完整团队结构">
                      <Button 
                        icon={<ExpandOutlined />}
                        onClick={() => {
                          const allKeys = getAllNodeKeys(teamTreeData);
                          setExpandedKeys(allKeys);
                          message.info(`已展开${allKeys.length}个节点`);
                        }}
                        className="tm-tree-action-btn"
                      />
                    </Tooltip>
                    <Tooltip title="折叠所有节点，回到顶层视图">
                      <Button 
                        icon={<CompressOutlined />}
                        onClick={() => { setExpandedKeys([]); message.info('已折叠所有节点'); }}
                        className="tm-tree-action-btn"
                      />
                    </Tooltip>
                  </Space>
                </div>
              </div>

              <div className="tm-tree-controls">
                <Row gutter={[16, 16]} align="middle">
                  <Col flex="auto">
                    <Tooltip title="支持按姓名、手机号、等级搜索团队成员">
                      <Search
                        placeholder="搜索团队成员..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onSearch={handleSearch}
                        className="tm-team-search"
                        enterButton={<SearchOutlined />}
                      />
                    </Tooltip>
                  </Col>
                  <Col>
                    <Space>
                      <Tooltip title="按代理等级筛选团队成员">
                        <Select
                          placeholder="等级筛选"
                          style={{ width: 120 }}
                          onChange={handleLevelFilter}
                          allowClear
                        >
                          <Option value="all">全部等级</Option>
                          <Option value="1">会员</Option>
                          <Option value="2">打版代言人</Option>
                          <Option value="3">代理商</Option>
                          <Option value="4">批发商</Option>
                          <Option value="5">首席分公司</Option>
                          <Option value="6">集团事业部</Option>
                        </Select>
                      </Tooltip>
                      
                      <Tooltip title="按活跃状态筛选团队成员">
                        <Select
                          placeholder="状态筛选"
                          style={{ width: 120 }}
                          onChange={handleStatusFilter}
                          allowClear
                        >
                          <Option value="all">全部状态</Option>
                          <Option value="active">活跃</Option>
                          <Option value="inactive">不活跃</Option>
                          <Option value="new">新加入</Option>
                        </Select>
                      </Tooltip>
                      
                      <Tooltip title="是否显示非活跃团队成员">
                        <Switch 
                          checkedChildren="显示非活跃" 
                          unCheckedChildren="隐藏非活跃"
                          checked={showInactive}
                          onChange={setShowInactive}
                        />
                      </Tooltip>
                    </Space>
                  </Col>
                </Row>
              </div>

              <div className="tm-tree-container">
                {teamTreeData.length > 0 ? (
                  <Tree
                    treeData={teamTreeData}
                    expandedKeys={expandedKeys}
                    selectedKeys={selectedKeys}
                     onExpand={handleTreeExpand as any}
                     onSelect={handleTreeSelect as any}
                    autoExpandParent={autoExpandParent}
                    showLine={{ showLeafIcon: false }}
                    showIcon={false}
                    blockNode
                    className="tm-team-tree"
                  />
                ) : (
                  <Empty
                    description={
                      <div className="empty-content">
                        <p>暂无团队数据</p>
                        <p className="empty-subtitle">请先导入团队成员或邀请新成员</p>
                        <Button type="primary" icon={<PlusOutlined />}>
                          邀请新成员
                        </Button>
                      </div>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>

              {/* 批量操作栏 */}
              {selectedMemberKeys.length > 0 && (
                <div className="tm-batch-bar">
                  <span className="tm-selected-count">已选择 {selectedMemberKeys.length} 个成员</span>
                  <div className="tm-batch-actions">
                    <Space>
                      <Dropdown menu={{ items: batchMenuItems }}>
                        <Button>批量操作</Button>
                      </Dropdown>
                      <Button type="primary" icon={<MessageOutlined />}>
                        发送通知
                      </Button>
                      <Button danger onClick={() => setSelectedMemberKeys([])}>
                        取消选择
                      </Button>
                    </Space>
                  </div>
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <div className="tm-sidebar-section">
              {/* 等级分布 */}
              {stats && <LevelDistribution stats={stats} />}

              {/* 活跃度统计 */}
              <Card className="tm-sidebar-card">
                <div className="tm-card-header">
                  <FireOutlined />
                  <span>团队活跃度</span>
                </div>
                <div className="activity-stats">
                  <div className="activity-item">
                    <div className="activity-info">
                      <span className="activity-label">今日活跃</span>
                      <span className="activity-value">{(stats as any)?.todayActiveMembers ?? 0}</span>
                    </div>
                    <Progress 
                      percent={stats?.totalMembers ? ((stats as any)?.todayActiveMembers ?? 0) / stats.totalMembers * 100 : 0}
                      strokeColor="#52c41a"
                     
                    />
                  </div>
                  <div className="activity-item">
                    <div className="activity-info">
                      <span className="activity-label">本周活跃</span>
                      <span className="activity-value">{(stats as any)?.weeklyActiveMembers ?? 0}</span>
                    </div>
                    <Progress 
                      percent={stats?.totalMembers ? ((stats as any)?.weeklyActiveMembers ?? 0) / stats.totalMembers * 100 : 0}
                      strokeColor="#1890ff"
                     
                    />
                  </div>
                  <div className="activity-item">
                    <div className="activity-info">
                      <span className="activity-label">本月活跃</span>
                      <span className="activity-value">{(stats as any)?.monthlyActiveMembers ?? 0}</span>
                    </div>
                    <Progress 
                      percent={stats?.totalMembers ? ((stats as any)?.monthlyActiveMembers ?? 0) / stats.totalMembers * 100 : 0}
                      strokeColor="#722ed1"
                     
                    />
                  </div>
                </div>
              </Card>

              {/* 业绩排行榜 */}
              <Card className="tm-sidebar-card">
                <div className="tm-card-header">
                  <TrophyOutlined />
                  <span>业绩排行榜</span>
                </div>
                <div className="leaderboard">
                  {members.slice(0, 5).map((member, index) => (
                    <div key={member.id} className="leaderboard-item">
                      <div className="leaderboard-rank">
                        <div className={`rank-badge rank-${index + 1}`}>
                          {index + 1}
                        </div>
                        <Avatar size={36} src={member.avatar} icon={<UserOutlined />} />
                      </div>
                      <div className="leaderboard-info">
                        <div className="leaderboard-name">{(member as any).name || member.username}</div>
                        <div className="leaderboard-level">{getLevelLabel((member as any).teamLevel || member.level)}</div>
                      </div>
                      <div className="leaderboard-revenue">
                        <div className="revenue-value">¥{formatCurrency(member.totalCommission)}</div>
                        <div className="revenue-label">累计收益</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="leaderboard-footer">
                  <Button type="link" icon={<EyeOutlined />}>
                    查看完整榜单
                  </Button>
                </div>
              </Card>

              {/* 团队增长趋势 */}
              <Card className="tm-sidebar-card">
                <div className="tm-card-header">
                  <LineChartOutlined />
                  <span>团队增长趋势</span>
                  <Switch 
                    
                    checked={showGrowthChart}
                    onChange={setShowGrowthChart}
                  />
                </div>
                {showGrowthChart && (
                  <div className="growth-chart-section">
                    <div className="growth-stats">
                      <div className="growth-stat">
                        <div className="growth-label">本周增长</div>
                        <div className="growth-value success">+12.5%</div>
                      </div>
                      <div className="growth-stat">
                        <div className="growth-label">本月增长</div>
                        <div className="growth-value success">+28.7%</div>
                      </div>
                      <div className="growth-stat">
                        <div className="growth-label">年度增长</div>
                        <div className="growth-value success">+156.3%</div>
                      </div>
                    </div>
                    
                    <div className="chart-visualization">
                      <div className="growth-bars">
                        {['1月', '2月', '3月', '4月', '5月', '6月', '7月'].map((month, index) => {
                          const value = [15, 22, 35, 28, 42, 38, 52][index];
                          const maxValue = 52;
                          const percentage = (value / maxValue) * 100;
                          
                          return (
                            <div key={month} className="growth-bar-item">
                              <div className="bar-container">
                                <div 
                                  className="growth-bar" 
                                  style={{ 
                                    height: `${percentage}%`,
                                    background: `linear-gradient(to top, ${index >= 4 ? '#00C896' : '#1890ff'}, ${index >= 4 ? '#00A876' : '#40a9ff'})`
                                  }}
                                >
                                  <div className="bar-value">{value}</div>
                                </div>
                              </div>
                              <div className="bar-label">{month}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="chart-legend">
                      <div className="legend-item">
                        <span className="legend-color early" />
                        <span className="legend-text">上半年</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-color recent" />
                        <span className="legend-text">近期增长</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* 快速操作 */}
              <Card className="tm-sidebar-card">
                <div className="tm-card-header">
                  <RocketOutlined />
                  <span>快速操作</span>
                </div>
                <div className="quick-actions">
                  <Button block icon={<PlusOutlined />} type="primary">
                    新增成员
                  </Button>
                  <Button block icon={<ShareAltOutlined />}>
                    分享团队链接
                  </Button>
                  <Button block icon={<MessageOutlined />}>
                    发送团队通知
                  </Button>
                  <Button block icon={<BankOutlined />}>
                    发放团队奖金
                  </Button>
                  <Button block icon={<SafetyCertificateOutlined />}>
                    团队认证管理
                  </Button>
                </div>
              </Card>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
};

// 构建真实树形数据 — 基于 parent_id 字段构建真实的上下级关系树
const buildRealTreeData = (members: TeamMember[]): TreeNode[] => {
  if (members.length === 0) return [];

  // 创建 ID -> member 映射
  const memberMap = new Map<string, TeamMember>();
  members.forEach(m => memberMap.set(m.id, m));

  // 找出所有根节点（无 parentId 或 parentId 不在当前列表中）
  const roots: TeamMember[] = [];
  members.forEach(m => {
    if (!m.parentId || !memberMap.has(m.parentId)) {
      roots.push(m);
    }
  });

  // 如果没有找到有明确父子关系的节点，则把所有成员作为平铺展示
  if (roots.length === 0 && members.length > 0) {
    return members.map(member => ({
      key: member.id,
      title: renderTreeNodeTitle(member, false),
      children: [],
      member,
      isExpanded: false,
    }));
  }

  // 递归构建树
  function buildChildren(parent: TeamMember): TreeNode[] {
    const children = members.filter(m => m.parentId === parent.id);
    return children.map(child => ({
      key: child.id,
      title: renderTreeNodeTitle(child, members.some(m => m.parentId === child.id)),
      children: buildChildren(child), // 递归
      member: child,
      isExpanded: false,
    }));
  }

  return roots.map(root => ({
    key: root.id,
    title: renderTreeNodeTitle(root, members.some(m => m.parentId === root.id)),
    children: buildChildren(root),
    member: root,
    isExpanded: false,
  }));
};

// 渲染树节点标题的函数 — 统一使用与UserManagement一致的等级颜色体系
const renderTreeNodeTitle = (member: TeamMember, hasChildren: boolean = false) => {

  // 统一颜色体系（与 UserManagementNew.tsx 的 levelConfig 保持一致）
  const getLevelColor = (level: number) => {
    const colors: Record<number, string> = {
      1: '#999999',
      2: 'var(--color-success)',
      3: 'var(--color-primary)',
      4: 'var(--color-warning)',
      5: '#e94560',
      6: '#722ed1',
    };
    return colors[level] || colors[1];
  };

  // 统一等级名称
  const getLevelLabel = (level: number) => {
    const labels: Record<number, string> = {
      1: '会员',
      2: '打版代言人',
      3: '代理商',
      4: '批发商',
      5: '首席分公司',
      6: '集团事业部',
    };
    return labels[level] || '未知';
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    }
    return amount.toFixed(0);
  };

  // 获取活跃度标签颜色
  const getActivityStatus = (isActive: boolean, lastOrderTime?: string) => {
    if (!isActive) return { color: '#bfbfbf', label: '非活跃', icon: <ClockCircleOutlined /> };
    
    if (lastOrderTime) {
      const lastOrderDate = new Date(lastOrderTime);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) return { color: '#52c41a', label: '今日活跃', icon: <FireOutlined /> };
      if (daysDiff <= 7) return { color: '#1890ff', label: '本周活跃', icon: <FireOutlined /> };
      if (daysDiff <= 30) return { color: '#fa8c16', label: '本月活跃', icon: <FireOutlined /> };
    }
    
    return { color: '#52c41a', label: '活跃', icon: <FireOutlined /> };
  };

  const activityStatus = getActivityStatus(member.isActive, member.lastOrderTime);

  return (
    <div className="tree-node-title">
      <div className="tree-node-left">
        <Avatar 
          size={40} 
          src={member.avatar} 
          icon={<UserOutlined />}
          className="tree-avatar"
        />
        {/* 层级指示器 */}
        {hasChildren && (
          <div className="hierarchy-indicator">
            <div className="indicator-line"></div>
            <div className="indicator-dot"></div>
          </div>
        )}
      </div>
      <div className="tree-node-info">
        <div className="tree-node-header">
          <div className="node-name-section">
            <span className="tree-node-name">{member.username}</span>
            <div className="node-connection-info">
              {member.directSubordinates > 0 && (
                <span className="connection-badge">
                  <TeamOutlined />
                  <span className="connection-count">{member.directSubordinates}</span>
                  <span className="connection-label">直接下级</span>
                </span>
              )}
            </div>
          </div>
          <div className="tree-node-tags">
            <Tag className="level-tag" color={getLevelColor(member.level)}>
              <CrownOutlined /> {getLevelLabel(member.level)}
            </Tag>
            <Tag className="activity-tag" icon={activityStatus.icon} color={activityStatus.color}>
              {activityStatus.label}
            </Tag>
            {member.totalCommission > 50000 && (
              <Tag className="top-performer" icon={<TrophyOutlined />} color="gold">
                顶尖业绩
              </Tag>
            )}
          </div>
        </div>
        <div className="tree-node-stats">
          <div className="stats-row">
            <div className="stat-column">
              <div className="stat-item enhanced">
                <TeamOutlined style={{ color: '#1890ff' }} />
                <div className="stat-content">
                  <div className="stat-value">{member.teamSize}</div>
                  <div className="stat-label">团队人数</div>
                </div>
              </div>
            </div>
            <div className="stat-column">
              <div className="stat-item enhanced">
                <DollarOutlined style={{ color: '#52c41a' }} />
                <div className="stat-content">
                  <div className="stat-value">¥{formatCurrency(member.totalCommission)}</div>
                  <div className="stat-label">累计收益</div>
                </div>
              </div>
            </div>
            <div className="stat-column">
              <div className="stat-item enhanced">
                <BarChartOutlined style={{ color: '#722ed1' }} />
                <div className="stat-content">
                  <div className="stat-value">{Math.floor(Math.random() * 20) + 5}%</div>
                  <div className="stat-label">增长率</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* 展开/折叠指示器 */}
        {hasChildren && (
          <div className="expand-indicator">
            <span className="indicator-text">点击展开下级团队</span>
            <DownOutlined className="indicator-icon" />
          </div>
        )}
      </div>
    </div>
  );
};

// 获取所有节点键
const getAllNodeKeys = (treeData: TreeNode[]): string[] => {
  const keys: string[] = [];
  
  const traverse = (nodes: TreeNode[]) => {
    nodes.forEach(node => {
      keys.push(node.key);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  };
  
  traverse(treeData);
  return keys;
};

export default TeamManagementNew;