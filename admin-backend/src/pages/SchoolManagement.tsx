// 商学院管理页面
import React, { useEffect, useState, useCallback } from 'react';
import { Card, Typography, Row, Col, Statistic, Table, Tag, Progress, Space, Button, Input, Select, Tabs, Modal, Divider, Badge, Avatar, Tooltip, Rate, Collapse, message, Empty } from 'antd';
import { 
  BookOutlined, 
  VideoCameraOutlined, 
  FileTextOutlined, 
  TrophyOutlined,
  EyeOutlined,
  LikeOutlined,
  CommentOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  FireOutlined,
  StarOutlined,
  BarChartOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CustomerServiceOutlined,
  ThunderboltOutlined,
  HeartOutlined,
  BulbOutlined,
  CopyOutlined,
  RobotOutlined,
  SoundOutlined,
  CheckCircleFilled,
  RightOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSchoolStats, fetchLearningStatistics, fetchScripts } from '../store/slices/schoolSlice';
import type { ColumnsType } from 'antd/es/table';
import './SchoolManagement.css';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { Option } = Select;

// 学习视频表格列定义
const videoColumns: ColumnsType<any> = [
  {
    title: '视频标题',
    dataIndex: 'title',
    key: 'title',
    render: (text, record) => (
      <Space direction="vertical" size={2}>
        <Text strong>{text}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
      </Space>
    ),
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    render: (category) => {
      const colors: Record<string, string> = {
        'product_knowledge': 'blue',
        'sales_skills': 'green',
        'team_management': 'orange',
        'customer_service': 'purple',
        'brand_culture': 'cyan',
        'marketing': 'magenta',
      };
      const labels: Record<string, string> = {
        'product_knowledge': '产品知识',
        'sales_skills': '销售技巧',
        'team_management': '团队管理',
        'customer_service': '客户服务',
        'brand_culture': '品牌文化',
        'marketing': '营销推广',
      };
      return <Tag color={colors[category] || 'default'}>{labels[category] || category}</Tag>;
    },
  },
  {
    title: '难度',
    dataIndex: 'difficulty',
    key: 'difficulty',
    render: (difficulty) => {
      const colors: Record<string, string> = {
        'beginner': 'green',
        'intermediate': 'orange',
        'advanced': 'red',
      };
      const labels: Record<string, string> = {
        'beginner': '初级',
        'intermediate': '中级',
        'advanced': '高级',
      };
      return <Tag color={colors[difficulty]}>{labels[difficulty]}</Tag>;
    },
  },
  {
    title: '时长',
    dataIndex: 'duration',
    key: 'duration',
    render: (duration) => `${Math.floor(duration / 60)}分钟`,
  },
  {
    title: '数据',
    key: 'stats',
    render: (_, record) => (
      <Space size="middle">
        <span><EyeOutlined /> {record.views}</span>
        <span><LikeOutlined /> {record.likes}</span>
        <span><CommentOutlined /> {record.comments}</span>
      </Space>
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (status) => {
      const colors: Record<string, string> = {
        'published': 'success',
        'draft': 'warning',
        'disabled': 'error',
      };
      const labels: Record<string, string> = {
        'published': '已发布',
        'draft': '草稿',
        'disabled': '禁用',
      };
      return <Tag color={colors[status]}>{labels[status]}</Tag>;
    },
  },
  {
    title: '操作',
    key: 'action',
    render: () => (
      <Space>
        <Button type="link" icon={<EyeOutlined />}>查看</Button>
        <Button type="link" icon={<EditOutlined />}>编辑</Button>
        <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
      </Space>
    ),
  },
];

// 热门内容数据
const popularContentData = [
  { key: '1', rank: 1, title: '静莱美产品深度解析', type: '视频', category: '产品知识', views: 1234, likes: 56, trend: 'up' },
  { key: '2', rank: 2, title: '销售心理学', type: '书籍', category: '销售技巧', views: 890, likes: 42, trend: 'up' },
  { key: '3', rank: 3, title: '产品介绍开场白', type: '话术', category: '自我介绍', views: 245, likes: 34, trend: 'stable' },
  { key: '4', rank: 4, title: '高效销售沟通技巧', type: '视频', category: '销售技巧', views: 567, likes: 28, trend: 'up' },
  { key: '5', rank: 5, title: '团队管理与激励', type: '视频', category: '团队管理', views: 432, likes: 34, trend: 'down' },
];

// 学习进度数据
const learningProgressData = [
  { category: '产品知识', progress: 85, color: '#1890ff' },
  { category: '销售技巧', progress: 67, color: '#52c41a' },
  { category: '团队管理', progress: 42, color: '#fa8c16' },
  { category: '客户服务', progress: 38, color: '#722ed1' },
  { category: '品牌文化', progress: 92, color: '#13c2c2' },
];

const SchoolManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const { schoolStats, schoolStatsLoading, statistics, statisticsLoading } = useAppSelector((state) => state.school);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [searchText, setSearchText] = useState('');
  
  useEffect(() => {
    dispatch(fetchSchoolStats());
    dispatch(fetchLearningStatistics(''));
  }, [dispatch]);

  // 视频数据（模拟）
  const videoData = [
    {
      key: '1',
      title: '静莱美产品深度解析',
      description: '详细介绍静莱美全系列产品特点',
      category: 'product_knowledge',
      difficulty: 'beginner',
      duration: 1200,
      views: 1234,
      likes: 56,
      comments: 12,
      status: 'published',
    },
    {
      key: '2',
      title: '高效销售沟通技巧',
      description: '学习如何与客户建立信任关系',
      category: 'sales_skills',
      difficulty: 'intermediate',
      duration: 1800,
      views: 890,
      likes: 42,
      comments: 8,
      status: 'published',
    },
    {
      key: '3',
      title: '团队管理与激励',
      description: '学习如何有效管理团队',
      category: 'team_management',
      difficulty: 'advanced',
      duration: 2400,
      views: 567,
      likes: 34,
      comments: 6,
      status: 'published',
    },
    {
      key: '4',
      title: '新媒体营销策略',
      description: '学习利用社交媒体推广产品',
      category: 'marketing',
      difficulty: 'advanced',
      duration: 2100,
      views: 0,
      likes: 0,
      comments: 0,
      status: 'draft',
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 页面标题和操作栏 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <BookOutlined style={{ marginRight: 12, color: '#722ed1' }} />
            静莱美商学院
          </Title>
          <Paragraph type="secondary">
            代理商学习和培训平台，提升销售能力和业务水平
          </Paragraph>
        </Col>
        <Col>
          <Space>
            <Button type="primary" icon={<PlusOutlined />}>添加内容</Button>
            <Button icon={<DownloadOutlined />}>导出数据</Button>
            <Button icon={<ShareAltOutlined />}>分享</Button>
          </Space>
        </Col>
      </Row>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Search
              placeholder="搜索学习内容、话术、书籍..."
              allowClear
              enterButton="搜索"
              size="large"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 400 }}
            />
          </Col>
          <Col>
            <Space>
              <Select defaultValue="all" style={{ width: 120 }}>
                <Option value="all">全部分类</Option>
                <Option value="video">学习视频</Option>
                <Option value="book">学习书籍</Option>
                <Option value="script">话术通关</Option>
              </Select>
              <Select defaultValue="published" style={{ width: 120 }}>
                <Option value="published">已发布</Option>
                <Option value="draft">草稿</Option>
                <Option value="all">全部状态</Option>
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 核心统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="学习内容总数"
              value={schoolStats?.videoStats?.total || 0}
              suffix={`/ ${(schoolStats?.videoStats?.total || 0) + (schoolStats?.bookStats?.total || 0) + (schoolStats?.scriptStats?.total || 0)}`}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                视频: {schoolStats?.videoStats?.total || 0} 书籍: {schoolStats?.bookStats?.total || 0} 话术: {schoolStats?.scriptStats?.total || 0}
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="学习用户数"
              value={schoolStats?.userStats?.learningUsers || 0}
              suffix={`/ ${schoolStats?.userStats?.totalUsers || 0}`}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                活跃用户: {schoolStats?.userStats?.activeUsers || 0} 练习用户: {schoolStats?.userStats?.practiceUsers || 0}
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总学习时长"
              value={(schoolStats?.overallStats?.totalLearningTime || 0) / 1000}
              suffix="小时"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                平均完成率: {(schoolStats?.overallStats?.averageCompletionRate || 0).toFixed(1)}%
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总积分奖励"
              value={(schoolStats?.overallStats?.totalPointsAwarded || 0) / 1000}
              suffix="K"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                平均积分: {(schoolStats?.overallStats?.averageUserPoints || 0).toFixed(1)}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 主内容区域 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginBottom: 24 }}>
        <TabPane tab="总览" key="overview" icon={<BarChartOutlined />}>
          <Row gutter={[16, 16]}>
            {/* 学习进度 */}
            <Col xs={24} lg={12}>
              <Card title="分类学习进度" extra={<Button type="link">查看详情</Button>}>
                {learningProgressData.map((item) => (
                  <div key={item.category} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text>{item.category}</Text>
                      <Text strong>{item.progress}%</Text>
                    </div>
                    <Progress percent={item.progress} strokeColor={item.color} />
                  </div>
                ))}
              </Card>
            </Col>
            
            {/* 热门内容 */}
            <Col xs={24} lg={12}>
              <Card title="热门学习内容" extra={<Button type="link">更多</Button>}>
                <Table
                  dataSource={popularContentData}
                  columns={[
                    {
                      title: '排名',
                      dataIndex: 'rank',
                      key: 'rank',
                      width: 60,
                      render: (rank) => (
                        <div style={{ textAlign: 'center' }}>
                          {rank <= 3 ? (
                            <CrownOutlined style={{ 
                              fontSize: 18, 
                              color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : '#cd7f32' 
                            }} />
                          ) : (
                            <span style={{ fontWeight: 'bold' }}>{rank}</span>
                          )}
                        </div>
                      ),
                    },
                    {
                      title: '标题',
                      dataIndex: 'title',
                      key: 'title',
                      render: (text, record) => (
                        <div>
                          <Text strong>{text}</Text>
                          <div>
                            <Tag color={record.type === '视频' ? 'blue' : record.type === '书籍' ? 'green' : 'orange'}>
                              {record.type}
                            </Tag>
                            <Tag>{record.category}</Tag>
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: '数据',
                      key: 'stats',
                      render: (_, record) => (
                        <Space direction="vertical" size={2}>
                          <span><EyeOutlined /> {record.views}</span>
                          <span><LikeOutlined /> {record.likes}</span>
                        </Space>
                      ),
                    },
                    {
                      title: '趋势',
                      dataIndex: 'trend',
                      key: 'trend',
                      render: (trend) => {
                        const icons = {
                          up: <FireOutlined style={{ color: '#ff4d4f' }} />,
                          down: <span style={{ color: '#52c41a' }}>↓</span>,
                          stable: <span style={{ color: '#faad14' }}>→</span>,
                        };
                        return icons[trend as keyof typeof icons];
                      },
                    },
                  ]}
                 
                  pagination={false}
                />
              </Card>
            </Col>
            
            {/* 学习统计 */}
            <Col xs={24}>
              <Card title="学习统计概览">
                {statistics && (
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                      <Card>
                        <Statistic
                          title="已学视频"
                          value={statistics.completedVideos}
                          suffix={`/${statistics.totalVideos}`}
                          prefix={<VideoCameraOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card>
                        <Statistic
                          title="已读书籍"
                          value={statistics.completedBooks}
                          suffix={`/${statistics.totalBooks}`}
                          prefix={<FileTextOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card>
                        <Statistic
                          title="话术练习"
                          value={statistics.practicedScripts}
                          suffix={`/${statistics.totalScripts}`}
                          prefix={<StarOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card>
                        <Statistic
                          title="连续学习"
                          value={statistics.learningStreak}
                          suffix="天"
                          prefix={<FireOutlined />}
                        />
                      </Card>
                    </Col>
                  </Row>
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane tab="学习视频" key="videos" icon={<VideoCameraOutlined />}>
          <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <Title level={4} style={{ margin: 0 }}>学习视频管理</Title>
              </Col>
              <Col>
                <Space>
                  <Button type="primary" icon={<PlusOutlined />}>添加视频</Button>
                  <Button>批量操作</Button>
                </Space>
              </Col>
            </Row>
            <Table
              columns={videoColumns}
              dataSource={videoData}
              rowSelection={{
                type: 'checkbox',
              }}
            />
          </Card>
        </TabPane>
        
        <TabPane tab="学习书籍" key="books" icon={<FileTextOutlined />}>
          <Card>
            <Title level={4} style={{ marginBottom: 16 }}>学习书籍管理</Title>
            <Paragraph>
              管理代理商的学习书籍资源，包括推荐阅读、阅读进度跟踪和读书笔记管理。
            </Paragraph>
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
              <Col xs={24} md={12}>
                <Card title="推荐书籍" extra={<Button type="link">更多</Button>}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {[
                      { title: '销售心理学', author: '李明', progress: 85 },
                      { title: '领导力的艺术', author: '王芳', progress: 42 },
                      { title: '高效沟通技巧', author: '张伟', progress: 67 },
                    ].map((book, index) => (
                      <Card key={index} style={{ marginBottom: 8 }}>
                        <Row align="middle">
                          <Col flex="auto">
                            <Text strong>{book.title}</Text>
                            <div><Text type="secondary">{book.author}</Text></div>
                          </Col>
                          <Col>
                            <Progress percent={book.progress} style={{ width: 100 }} />
                          </Col>
                        </Row>
                      </Card>
                    ))}
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="书籍分类统计">
                  {schoolStats?.bookStats?.byCategory && Object.entries(schoolStats.bookStats.byCategory).map(([category, count]) => (
                    <div key={category} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text>{category}</Text>
                        <Text strong>{count}</Text>
                      </div>
                      <Progress percent={(count / (schoolStats.bookStats?.total || 1)) * 100} />
                    </div>
                  ))}
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>
        
        <TabPane tab="话术通关" key="scripts" icon={<StarOutlined />}>
          <PersonalityScriptSection />
        </TabPane>
        
        <TabPane tab="行动日志" key="actionLogs" icon={<TrophyOutlined />}>
          <Card>
            <Title level={4} style={{ marginBottom: 16 }}>行动日志管理</Title>
            <Paragraph>
              代理商目标管理、计划执行和积分奖励系统，帮助代理商持续成长。
            </Paragraph>
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
              <Col xs={24}>
                <Card title="目标进度追踪">
                  {[
                    { title: '本月销售目标', target: 50000, current: 32000, unit: '元', progress: 64 },
                    { title: '团队发展目标', target: 2, current: 1, unit: '人', progress: 50 },
                    { title: '学习目标', target: 3, current: 2, unit: '个', progress: 67 },
                  ].map((goal, index) => (
                    <div key={index} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <Text strong>{goal.title}</Text>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            目标: {goal.target.toLocaleString()} {goal.unit} | 当前: {goal.current.toLocaleString()} {goal.unit}
                          </div>
                        </div>
                        <Text strong style={{ color: goal.progress >= 80 ? '#52c41a' : goal.progress >= 50 ? '#faad14' : '#ff4d4f' }}>
                          {goal.progress}%
                        </Text>
                      </div>
                      <Progress percent={goal.progress} />
                    </div>
                  ))}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="积分排行榜" extra={<Button type="link">查看全部</Button>}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {[
                      { rank: 1, name: '张三', points: 1250, trend: 'up' },
                      { rank: 2, name: '李四', points: 980, trend: 'stable' },
                      { rank: 3, name: '王五', points: 850, trend: 'down' },
                      { rank: 4, name: '赵六', points: 720, trend: 'up' },
                      { rank: 5, name: '孙七', points: 650, trend: 'up' },
                    ].map((user, index) => (
                      <Row key={index} align="middle" style={{ padding: '8px 0', borderBottom: index < 4 ? '1px solid #f0f0f0' : 'none' }}>
                        <Col span={4} style={{ textAlign: 'center' }}>
                          {user.rank <= 3 ? (
                            <CrownOutlined style={{ 
                              fontSize: 16, 
                              color: user.rank === 1 ? '#ffd700' : user.rank === 2 ? '#c0c0c0' : '#cd7f32' 
                            }} />
                          ) : (
                            <Text strong>{user.rank}</Text>
                          )}
                        </Col>
                        <Col span={12}>
                          <Text strong>{user.name}</Text>
                        </Col>
                        <Col span={8} style={{ textAlign: 'right' }}>
                          <Text strong>{user.points.toLocaleString()}</Text>
                        </Col>
                      </Row>
                    ))}
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>
        </TabPane>
      </Tabs>

      {/* 快速操作面板 */}
      <Card title="快速操作" style={{ marginTop: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Button type="primary" block icon={<PlusOutlined />} size="large">
              添加视频
            </Button>
          </Col>
          <Col xs={12} sm={6}>
            <Button block icon={<FileTextOutlined />} size="large">
              管理书籍
            </Button>
          </Col>
          <Col xs={12} sm={6}>
            <Button block icon={<StarOutlined />} size="large">
              创建话术
            </Button>
          </Col>
          <Col xs={12} sm={6}>
            <Button block icon={<TrophyOutlined />} size="large">
              目标设置
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SchoolManagement;

// ============================================================
// 性格色彩成交话术系统 - 深度开发组件
// ============================================================

/** 性格色彩类型定义 */
type PersonalityType = 'red' | 'blue' | 'yellow' | 'green';

interface PersonalityConfig {
  key: PersonalityType;
  name: string;
  subtitle: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  icon: React.ReactNode;
  traits: string[];
  communicationTips: string;
  donts: string;
  closingStyle: string;
  keyPhrases: string[];
}

const PERSONALITY_CONFIGS: PersonalityConfig[] = [
  {
    key: 'red',
    name: '红色性格',
    subtitle: '活泼型 · 社交导向',
    color: '#ff4d4f',
    bgGradient: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)',
    borderColor: '#ffa39e',
    icon: <ThunderboltOutlined />,
    traits: ['热情开朗', '喜欢社交', '感性决策', '注重口碑', '容易受影响'],
    communicationTips: '讲成功案例和故事，营造氛围和参与感，多赞美多认同',
    donts: '不要冷冰冰、不要堆数据、不要忽视感受、不要打断对方',
    closingStyle: '氛围感染型',
    keyPhrases: ['姐妹都在用', '朋友圈晒单', '大家都说好', '口碑爆款', '限时秒杀'],
  },
  {
    key: 'blue',
    name: '蓝色性格',
    subtitle: '完美型 · 逻辑导向',
    color: '#1890ff',
    bgGradient: 'linear-gradient(135deg, #e6f7ff 0%, #91d5ff 100%)',
    borderColor: '#69c0ff',
    icon: <BulbOutlined />,
    traits: ['注重细节', '逻辑严密', '追求品质', '善于分析', '做决定谨慎'],
    communicationTips: '提供详细数据和成分表，用科学依据说话，耐心回答每一个问题',
    donts: '不要夸大其词、不要跳过细节、不要催促决定、不要用模糊数据',
    closingStyle: '逻辑说服型',
    keyPhrases: ['权威认证', '科学配方', '对比实验数据', '复购率高达', '品质保证'],
  },
  {
    key: 'yellow',
    name: '黄色性格',
    subtitle: '力量型 · 结果导向',
    color: '#faad14',
    bgGradient: 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)',
    borderColor: '#ffe58f',
    icon: <HeartOutlined />,
    traits: ['果断直接', '目标明确', '追求效率', '掌控欲强', '不喜拖泥带水'],
    communicationTips: '直接给结果和利益点，用数据说话，少讲道理多讲价值',
    donts: '不要啰嗦、不要绕弯子、不要过度解释细节、不要显得犹豫不决',
    closingStyle: '果断逼单型',
    keyPhrases: ['限时优惠', '立享折扣', '马上锁定名额', '市场独家', '业绩翻倍'],
  },
  {
    key: 'green',
    name: '绿色性格',
    subtitle: '和平型 · 关系导向',
    color: '#52c41a',
    bgGradient: 'linear-gradient(135deg, #f6ffed 0%, #b7eb8f 100%)',
    borderColor: '#95de64',
    icon: <CustomerServiceOutlined />,
    traits: ['温和友善', '重视关系', '害怕冲突', '决策缓慢', '需要安全感'],
    communicationTips: '建立信任和安全感，给出承诺和保障，允许慢慢决定',
    donts: '不要施压逼单、不要制造紧迫感、不要忽视疑虑、不要显得急功近利',
    closingStyle: '温水渗透型',
    keyPhrases: ['无效退款', '安心使用', '长期陪伴', '老客户专享', '无风险试用'],
  },
];

/** 话术数据定义 */
interface ScriptData {
  id: string;
  title: string;
  personality: PersonalityType;
  scene: string;
  difficulty: '初级' | '中级' | '高级';
  content: string;
  example: string;
  tips: string;
  likes: number;
  usageCount: number;
  successRate: number;
  tags: string[];
}

const SCRIPTS_DATA: ScriptData[] = [
  // ========== 红色性格话术 ==========
  {
    id: 'r1', title: '开门见山利益切入法', personality: 'red',
    scene: '首次接触', difficulty: '初级',
    content: '直接亮出核心利益，不绕弯子。\n\n"姐，我知道您很忙，我直接说重点。我们现在有个活动，您今天下单的话，能比平时省XXX元。这个价格是给老客户的专属，只有今天。"',
    example: '客户："什么产品？" → 销售："胶原蛋白口服液，我们家的王牌。现在买3盒送1盒，您看行的话我直接帮您下单，5分钟搞定。"',
    tips: '红色性格客户最讨厌浪费时间，前3句话必须包含利益点。语速要快，语气要坚定，不要留太多思考空间。',
    likes: 328, usageCount: 1245, successRate: 82, tags: ['高效成交', '直接切入', '新人必学'],
  },
  {
    id: 'r2', title: '竞品碾压对比法', personality: 'red',
    scene: '异议处理', difficulty: '中级',
    content: '用数据和事实直接对比，让红色性格客户心服口服。\n\n"姐，我不说别人不好，但数据摆在这里——我们家胶原蛋白含量是XXmg，市面上大部分只有XXmg。价格换算下来，我们的每mg单价反而更低。您是聪明人，这笔账肯定算得清。"',
    example: '客户："别家更便宜" → 销售："给您算笔账：他们128元/盒，含量5000mg；我们198元/盒，含量10000mg。算下来我们每mg才0.0198元，他们要0.0256元。其实我们更划算。"',
    tips: '红色性格客户尊重的是实力和数据。永远不要贬低竞品，用客观对比让数据说话。',
    likes: 256, usageCount: 987, successRate: 76, tags: ['竞品对比', '数据说话', '异议处理'],
  },
  {
    id: 'r3', title: '稀缺性逼单法', personality: 'red',
    scene: '促单成交', difficulty: '高级',
    content: '利用红色性格的果断和掌控欲，制造紧迫感。\n\n"姐，这个价格我只给您留到今天下午。因为库存就剩最后X套了，团队里已经有3个姐在问了。您要的话我现在就锁定，不然真不敢保证还有。"',
    example: '客户："我考虑一下" → 销售："理解您。但说实话，上次活动也是这样，好多姐说考虑一下，结果第二天就没了。您要实在喜欢，不如先锁定名额，不满意可以退。"',
    tips: '红色性格客户享受"抢到"的感觉。但注意：制造紧迫感必须基于事实，虚假信息会严重损害信任。',
    likes: 412, usageCount: 1567, successRate: 88, tags: ['限时逼单', '高转化', '成交利器'],
  },

  // ========== 蓝色性格话术 ==========
  {
    id: 'b1', title: '成分解析专业介绍法', personality: 'blue',
    scene: '产品介绍', difficulty: '初级',
    content: '蓝色性格需要充分了解产品细节才能下决心。\n\n"姐，我给您详细介绍一下这款产品的核心成分。我们的胶原蛋白采用的是深海鱼胶原蛋白肽，分子量在1000-3000道尔顿之间，这个范围是人体吸收率最高的。根据第三方检测报告，吸收率达到了XX%……"',
    example: '客户："这个真的有用吗？" → 销售："给您看一下我们的检测报告，这是SGS认证的。临床数据显示，连续使用28天后，XX%的受试者皮肤水分提升了XX%。您看这个数据……"',
    tips: '蓝色性格客户会自己查资料、做功课。你越专业、越透明，他们越信任你。随时准备好产品手册和检测报告。',
    likes: 389, usageCount: 1102, successRate: 79, tags: ['专业介绍', '成分解析', '信任建立'],
  },
  {
    id: 'b2', title: 'FAQ预判解答法', personality: 'blue',
    scene: '深度沟通', difficulty: '中级',
    content: '蓝色性格客户在决定前通常有很多疑问，主动预判并解答。\n\n"姐，我猜您可能还有几个疑问，我先给您解答一下：\n1. 关于安全性——我们的产品通过了XX认证，孕妇也可以使用\n2. 关于效果周期——一般28天为一个周期，但2周就能感受到变化\n3. 关于保存方法——开封后放冰箱冷藏……"',
    example: '客户："我还有个问题" → 销售："您是不是想问和药物会不会冲突？这个我专门查过，我们的产品是食品级，不含药物成分，和常规药物不冲突。不过如果您在服用特殊药物，建议间隔2小时。"',
    tips: '蓝色性格客户不会主动问所有问题，但每个未解答的问题都会成为成交障碍。主动预判能大幅提升成交率。',
    likes: 267, usageCount: 856, successRate: 85, tags: ['预判疑问', '深度沟通', '打消顾虑'],
  },
  {
    id: 'b3', title: '对比实验见证法', personality: 'blue',
    scene: '效果证明', difficulty: '高级',
    content: '用对比数据和实验结果说话，满足蓝色性格的逻辑需求。\n\n"姐，给您看一组真实的使用前后对比。这是我们团队XX姐的使用记录：第1周皮肤含水量XX%，第4周提升到XX%，第8周已经到了XX%。她用的是和您一模一样的搭配方案。"',
    example: '客户："效果能保持多久？" → 销售："根据我们跟踪了6个月的数据，停用后效果可以维持2-3个月。而且如果您配合我们的周期方案，可以持续维持在一个很好的水平。给您看这个曲线图……"',
    tips: '蓝色性格需要"证据链"——数据+来源+案例+逻辑。每一步都要有据可查，避免任何模糊表述。',
    likes: 198, usageCount: 654, successRate: 81, tags: ['实验数据', '效果证明', '高级成交'],
  },

  // ========== 黄色性格话术 ==========
  {
    id: 'y1', title: '故事营销感染法', personality: 'yellow',
    scene: '产品推荐', difficulty: '初级',
    content: '黄色性格客户是感性决策者，用故事打动她们。\n\n"姐，我给您讲个真实的故事。我们团队有个姐，之前皮肤状态很差，自己都说不敢出门。后来用了我们的产品，3个月后整个人都不一样了，现在天天在朋友圈晒自拍，好几个朋友都被她种草了！"',
    example: '客户："真的这么好吗？" → 销售："真的！她上周还给我发消息说，同事问她是不是做了医美。其实没有，就是用了我们的方案。她现在是我们团队的铁粉，逢人就推荐！"',
    tips: '黄色性格客户买的是"感觉"和"可能性"。故事要生动、有画面感，让她能把自己代入其中。',
    likes: 445, usageCount: 1890, successRate: 83, tags: ['故事营销', '情感共鸣', '种草必备'],
  },
  {
    id: 'y2', title: '社群氛围营造法', personality: 'yellow',
    scene: '团队招募', difficulty: '中级',
    content: '黄色性格客户重视归属感和社交氛围。\n\n"姐，我们团队真的特别好！每天大家一起打卡、分享心得，群里特别热闹。上周我们还组织了线下聚会，一起去做了SPA。做代理不只是赚钱，还能认识一群特别好的姐妹！"',
    example: '客户："做代理难不难？" → 销售："有啥难的！群里那么多姐妹带着你，不会的就问。你看XX姐，一开始也是什么都不懂，现在月入过万了。而且大家一起做特别有意思，不孤单！"',
    tips: '黄色性格客户最怕的是"一个人孤军奋战"。强调团队氛围、姐妹情谊和互助文化。',
    likes: 312, usageCount: 978, successRate: 78, tags: ['社群营销', '团队氛围', '招募话术'],
  },
  {
    id: 'y3', title: '朋友圈种草引导法', personality: 'yellow',
    scene: '二次转化', difficulty: '高级',
    content: '引导黄色性格客户在社交圈分享，利用她的社交影响力。\n\n"姐，您用了之后效果这么好，不发个朋友圈太可惜了！我帮您拍几张美美的照片，配上文案，保证点赞爆表！而且您分享出去，朋友来问的时候还能帮您带单呢。"',
    example: '客户："我不好意思发" → 销售："有啥不好意思的！效果这么好就该自信地分享！您看这个姐的朋友圈，一发出去就有20多个人问，直接转化了5个客户。分享不是炫耀，是帮姐妹们找到好东西！"',
    tips: '黄色性格客户天生爱分享。关键是帮她降低心理门槛，给她准备好内容和素材。',
    likes: 289, usageCount: 876, successRate: 90, tags: ['朋友圈', '社交裂变', '口碑传播'],
  },

  // ========== 绿色性格话术 ==========
  {
    id: 'g1', title: '温和信任建立法', personality: 'green',
    scene: '破冰接触', difficulty: '初级',
    content: '绿色性格客户需要安全感，不要急于推销。\n\n"姐，您别紧张，我不是来给您推销的。就是想给您介绍一个我自己也在用的好东西。我自己用了半年了，觉得确实不错，所以想分享给您看看。您感兴趣就了解一下，不感兴趣也没关系，咱们还是朋友。"',
    example: '客户："我不太需要..." → 销售："没事没事，您不用有任何压力。我就想让您知道有这个产品。您先了解着，哪天想起来了或者有需要了随时找我。我的微信一直都在，您随时可以问我。"',
    tips: '绿色性格客户最怕被"缠上"。给她们空间和时间，态度要真诚不带目的感，先做朋友再做生意。',
    likes: 356, usageCount: 1345, successRate: 71, tags: ['温和破冰', '零压力', '信任优先'],
  },
  {
    id: 'g2', title: '风险消除保障法', personality: 'green',
    scene: '消除顾虑', difficulty: '中级',
    content: '绿色性格需要充分的安全感才能做决定。\n\n"姐，我特别理解您的顾虑。买东西嘛，谁都会担心。所以我们有完整的保障：7天无理由退换，而且是我个人给您承诺，有问题直接找我，不用走什么流程。您先拿回去试试，要是不满意，我亲自上门给您退。"',
    example: '客户："万一不好用呢？" → 销售："理解！所以我才说您先试试嘛。不好用我全额退给您，一分不少。我自己用了这么久，心里有数才敢这么承诺。您看，这比去店里买还放心，对不对？"',
    tips: '绿色性格的决策障碍是"怕出错"。消除风险感比强调收益更有效。给她一个"退路"，她反而更容易往前走。',
    likes: 278, usageCount: 1023, successRate: 84, tags: ['消除顾虑', '保障承诺', '安心成交'],
  },
  {
    id: 'g3', title: '长期陪伴温水成交法', personality: 'green',
    scene: '持续跟进', difficulty: '高级',
    content: '绿色性格不适合逼单，需要持续的关系经营和耐心。\n\n"姐，好久没跟您聊天了，最近忙不忙？上次给您推荐的产品，您考虑得怎么样了？不着急哈，我就是想着如果有什么疑问的话可以随时帮您解答。对了，最近我们出了个新品的小样，我给您寄一份试试？不收钱的，就当交个朋友。"',
    example: '客户："我还没想好..." → 销售："没关系不着急，买东西确实要想清楚。对了，上次您说皮肤干的问题，我查了一下，可能跟换季有关。我给您整理了一些护肤小贴士，等下发给您看看，对你肯定有帮助。"',
    tips: '绿色性格的成交周期较长，但一旦成交，忠诚度极高。关键是在跟进过程中持续提供价值，而不是每次都想着成交。',
    likes: 234, usageCount: 678, successRate: 87, tags: ['长期跟进', '温水煮蛙', '高忠诚度'],
  },
];

/** 场景选项 */
const SCENE_OPTIONS = [
  { value: '首次接触', label: '首次接触' },
  { value: '产品介绍', label: '产品介绍' },
  { value: '异议处理', label: '异议处理' },
  { value: '促单成交', label: '促单成交' },
  { value: '深度沟通', label: '深度沟通' },
  { value: '效果证明', label: '效果证明' },
  { value: '团队招募', label: '团队招募' },
  { value: '破冰接触', label: '破冰接触' },
  { value: '消除顾虑', label: '消除顾虑' },
  { value: '持续跟进', label: '持续跟进' },
  { value: '二次转化', label: '二次转化' },
  { value: '产品推荐', label: '产品推荐' },
];

/** 性格色彩成交话术系统组件 */
const PersonalityScriptSection: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activePersonality, setActivePersonality] = useState<PersonalityType | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedScene, setSelectedScene] = useState<string | undefined>(undefined);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentScript, setCurrentScript] = useState<ScriptData | null>(null);
  const [likedScripts, setLikedScripts] = useState<Set<string>>(new Set());
  const [expandedPersonalities, setExpandedPersonalities] = useState<Set<string>>(new Set(['red']));

  const toggleLike = useCallback((scriptId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLikedScripts(prev => {
      const next = new Set(prev);
      if (next.has(scriptId)) next.delete(scriptId);
      else next.add(scriptId);
      return next;
    });
  }, []);

  const copyScript = useCallback((script: ScriptData) => {
    const text = `${script.title}\n\n适用性格：${PERSONALITY_CONFIGS.find(p => p.key === script.personality)?.name}\n应用场景：${script.scene}\n\n话术内容：\n${script.content}`;
    navigator.clipboard?.writeText(text).then(() => {
      message.success('话术已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败，请手动复制');
    });
  }, []);

  const openDetail = useCallback((script: ScriptData) => {
    setCurrentScript(script);
    setDetailModalVisible(true);
  }, []);

  // 筛选话术
  const filteredScripts = SCRIPTS_DATA.filter(script => {
    if (activePersonality !== 'all' && script.personality !== activePersonality) return false;
    if (selectedScene && script.scene !== selectedScene) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      return script.title.toLowerCase().includes(q) ||
        script.content.toLowerCase().includes(q) ||
        script.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  // 按性格分组
  const scriptsByPersonality = (activePersonality === 'all'
    ? PERSONALITY_CONFIGS
    : PERSONALITY_CONFIGS.filter(p => p.key === activePersonality)
  ).map(config => ({
    ...config,
    scripts: filteredScripts.filter(s => s.personality === config.key),
  }));

  const togglePersonalityExpand = (key: string) => {
    setExpandedPersonalities(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 统计数据
  const totalScripts = SCRIPTS_DATA.length;
  const totalLikes = SCRIPTS_DATA.reduce((sum, s) => sum + s.likes, 0);
  const avgSuccessRate = Math.round(SCRIPTS_DATA.reduce((sum, s) => sum + s.successRate, 0) / totalScripts);
  const totalUsage = SCRIPTS_DATA.reduce((sum, s) => sum + s.usageCount, 0);

  return (
    <div className="personality-script-section">
      {/* 头部介绍 */}
      <div className="script-hero-banner">
        <div className="script-hero-content">
          <div className="script-hero-text">
            <Title level={2} style={{ margin: 0, color: '#fff' }}>
              <SoundOutlined /> 性格色彩成交话术系统
            </Title>
            <Paragraph style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
              基于 FPA 性格色彩学，针对红/蓝/黄/绿四种客户性格，量身定制专属成交话术。精准识别客户类型，用对方最舒服的方式沟通，让成交变得自然而然。
            </Paragraph>
          </div>
          <div className="script-hero-stats">
            <div className="hero-stat-item">
              <div className="hero-stat-value">{totalScripts}</div>
              <div className="hero-stat-label">精选话术</div>
            </div>
            <div className="hero-stat-item">
              <div className="hero-stat-value">{avgSuccessRate}%</div>
              <div className="hero-stat-label">平均成功率</div>
            </div>
            <div className="hero-stat-item">
              <div className="hero-stat-value">{(totalUsage / 1000).toFixed(1)}k</div>
              <div className="hero-stat-label">累计使用</div>
            </div>
            <div className="hero-stat-item">
              <div className="hero-stat-value">{(totalLikes / 1000).toFixed(1)}k</div>
              <div className="hero-stat-label">累计点赞</div>
            </div>
          </div>
        </div>
      </div>

      {/* 性格色彩概览卡片 */}
      <div className="personality-overview">
        <Title level={4} style={{ marginBottom: 16 }}>
          <FireOutlined /> 四色性格速查
        </Title>
        <Row gutter={[16, 16]}>
          {PERSONALITY_CONFIGS.map((config) => (
            <Col xs={24} sm={12} lg={6} key={config.key}>
              <div
                className={`personality-card personality-card-${config.key} ${activePersonality === config.key ? 'active' : ''}`}
                onClick={() => setActivePersonality(activePersonality === config.key ? 'all' : config.key)}
                style={{ cursor: 'pointer' }}
              >
                <div className="personality-card-header" style={{ background: config.bgGradient }}>
                  <div className="personality-icon" style={{ color: config.color }}>
                    {config.icon}
                  </div>
                  <div className="personality-name">{config.name}</div>
                  <div className="personality-subtitle">{config.subtitle}</div>
                </div>
                <div className="personality-card-body">
                  <div className="personality-traits">
                    {config.traits.slice(0, 3).map((trait, i) => (
                      <Tag key={i} color={config.color} className="personality-trait-tag">
                        {trait}
                      </Tag>
                    ))}
                  </div>
                  <div className="personality-tip">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {config.communicationTips.slice(0, 30)}...
                    </Text>
                  </div>
                  <div className="personality-closing">
                    <Tag style={{ borderColor: config.color, color: config.color }}>
                      成交风格：{config.closingStyle}
                    </Tag>
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
        {activePersonality !== 'all' && (
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <Button type="link" onClick={() => setActivePersonality('all')}>
              <RightOutlined rotate={180} /> 查看全部性格
            </Button>
          </div>
        )}
      </div>

      {/* 搜索筛选栏 */}
      <Card className="script-filter-bar" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="搜索话术标题、内容、标签..."
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              size="large"
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="应用场景"
              allowClear
              value={selectedScene}
              onChange={setSelectedScene}
              style={{ width: '100%' }}
              size="large"
            >
              {SCENE_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="性格色彩"
              allowClear
              value={activePersonality === 'all' ? undefined : activePersonality}
              onChange={v => setActivePersonality(v || 'all')}
              style={{ width: '100%' }}
              size="large"
            >
              {PERSONALITY_CONFIGS.map(p => (
                <Option key={p.key} value={p.key}>{p.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} style={{ textAlign: 'right' }}>
            <Space>
              <Tag color="blue">共 {filteredScripts.length} 条话术</Tag>
              <Button
                icon={<RobotOutlined />}
                onClick={() => message.info('AI话术生成功能即将上线')}
              >
                AI生成话术
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 按性格分组的话术列表 */}
      <div className="script-list-by-personality">
        {scriptsByPersonality.map(({ key, name, color, bgGradient, borderColor, subtitle, scripts, traits, communicationTips, donts, closingStyle, keyPhrases, icon }) => (
          <div key={key} className="personality-group">
            <Collapse
              activeKey={expandedPersonalities.has(key) ? [key] : []}
              onChange={() => togglePersonalityExpand(key)}
              className="personality-collapse"
              items={[{
                key,
                label: (
                  <div className="personality-group-header">
                    <div className="personality-group-left">
                      <div className="personality-group-icon" style={{ color, fontSize: 24 }}>
                        {icon}
                      </div>
                      <div>
                        <span className="personality-group-name" style={{ color }}>{name}</span>
                        <span className="personality-group-subtitle">{subtitle}</span>
                        <Tag color={color} className="personality-count-tag">
                          {scripts.length} 条话术
                        </Tag>
                      </div>
                    </div>
                    <div className="personality-group-right">
                      {keyPhrases.slice(0, 3).map((phrase, i) => (
                        <Tag key={i} className="key-phrase-tag" style={{ borderColor: `${color}40`, color }}>{phrase}</Tag>
                      ))}
                    </div>
                  </div>
                ),
                children: (
                  <div className="personality-group-content">
                    {/* 性格分析面板 */}
                    <Card
                      size="small"
                      className="personality-analysis-card"
                      style={{ marginBottom: 16, borderLeft: `4px solid ${color}` }}
                    >
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                          <div className="analysis-section">
                            <Text strong style={{ color, display: 'block', marginBottom: 8 }}>
                              <CheckCircleFilled /> 性格特征
                            </Text>
                            <div className="trait-list">
                              {traits.map((t, i) => (
                                <div key={i} className="trait-item">
                                  <span className="trait-dot" style={{ background: color }} />
                                  {t}
                                </div>
                              ))}
                            </div>
                          </div>
                        </Col>
                        <Col xs={24} md={8}>
                          <div className="analysis-section">
                            <Text strong style={{ color, display: 'block', marginBottom: 8 }}>
                              <BulbOutlined /> 沟通技巧
                            </Text>
                            <Paragraph style={{ fontSize: 13, marginBottom: 0, color: '#555' }}>
                              {communicationTips}
                            </Paragraph>
                          </div>
                        </Col>
                        <Col xs={24} md={8}>
                          <div className="analysis-section">
                            <Text strong style={{ color, display: 'block', marginBottom: 8 }}>
                              <ThunderboltOutlined /> 注意事项
                            </Text>
                            <Paragraph style={{ fontSize: 13, marginBottom: 0, color: '#999' }}>
                              {donts}
                            </Paragraph>
                          </div>
                        </Col>
                      </Row>
                    </Card>

                    {/* 话术卡片列表 */}
                    {scripts.length > 0 ? (
                      <Row gutter={[16, 16]}>
                        {scripts.map((script) => (
                          <Col xs={24} md={12} lg={8} key={script.id}>
                            <div
                              className="script-card"
                              onClick={() => openDetail(script)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="script-card-top" style={{ borderBottom: `2px solid ${color}20` }}>
                                <div className="script-card-header">
                                  <Badge
                                    count={script.difficulty === '初级' ? '初级' : script.difficulty === '中级' ? '中级' : '高级'}
                                    style={{
                                      background: script.difficulty === '初级' ? '#52c41a' : script.difficulty === '中级' ? '#faad14' : '#ff4d4f',
                                      fontSize: 11,
                                    }}
                                  />
                                  <Text strong className="script-card-title">{script.title}</Text>
                                </div>
                                <div className="script-card-meta">
                                  <Tag>{script.scene}</Tag>
                                  <Space size={4}>
                                    <span className="meta-item"><EyeOutlined /> {script.usageCount}</span>
                                    <span className="meta-item" style={{ color: likedScripts.has(script.id) ? '#ff4d4f' : '#999' }}>
                                      <HeartOutlined
                                        onClick={(e) => toggleLike(script.id, e)}
                                        style={{ cursor: 'pointer' }}
                                      />
                                      {' '}{script.likes + (likedScripts.has(script.id) ? 1 : 0)}
                                    </span>
                                  </Space>
                                </div>
                              </div>
                              <div className="script-card-body">
                                <Paragraph
                                  ellipsis={{ rows: 3 }}
                                  className="script-card-preview"
                                  style={{ fontSize: 13, color: '#666', marginBottom: 12 }}
                                >
                                  {script.content}
                                </Paragraph>
                                <div className="script-card-footer">
                                  <div className="script-tags">
                                    {script.tags.slice(0, 3).map((tag, i) => (
                                      <Tag key={i} className="script-tag" style={{ borderColor: `${color}50`, color }}>{tag}</Tag>
                                    ))}
                                  </div>
                                  <div className="script-success">
                                    <Progress
                                      percent={script.successRate}
                                      size="small"
                                      strokeColor={color}
                                      format={(p) => `${p}%`}
                                      style={{ width: 80 }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="script-card-actions">
                                <Button type="text" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); openDetail(script); }}>
                                  查看详情
                                </Button>
                                <Button type="text" size="small" icon={<CopyOutlined />} onClick={(e) => { e.stopPropagation(); copyScript(script); }}>
                                  复制话术
                                </Button>
                                <Button type="text" size="small" icon={<ShareAltOutlined />} onClick={(e) => { e.stopPropagation(); message.info('分享功能开发中'); }}>
                                  分享
                                </Button>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <Empty
                        description="暂无匹配的话术"
                        style={{ padding: '40px 0' }}
                      />
                    )}
                  </div>
                ),
              }]}
            />
          </div>
        ))}
      </div>

      {/* 话术详情模态框 */}
      <Modal
        title={null}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={720}
        className="script-detail-modal"
        destroyOnClose
      >
        {currentScript && (() => {
          const config = PERSONALITY_CONFIGS.find(p => p.key === currentScript.personality)!;
          return (
            <div className="script-detail-content">
              {/* 顶部性格标识 */}
              <div className="detail-header" style={{ background: config.bgGradient }}>
                <div className="detail-personality-badge">
                  <span className="detail-badge-icon" style={{ color: config.color }}>
                    {config.icon}
                  </span>
                  <div>
                    <div className="detail-badge-name" style={{ color: config.color }}>{config.name}</div>
                    <div className="detail-badge-subtitle">{config.subtitle}</div>
                  </div>
                </div>
                <Badge
                  count={currentScript.difficulty}
                  style={{
                    background: currentScript.difficulty === '初级' ? '#52c41a' : currentScript.difficulty === '中级' ? '#faad14' : '#ff4d4f',
                  }}
                />
              </div>

              {/* 标题和信息 */}
              <div className="detail-body">
                <Title level={3} style={{ marginBottom: 8 }}>{currentScript.title}</Title>
                <Space wrap style={{ marginBottom: 20 }}>
                  <Tag color={config.color}>{config.name}</Tag>
                  <Tag icon={<FireOutlined />}>{currentScript.scene}</Tag>
                  <Tag>{currentScript.difficulty}</Tag>
                  <span className="detail-stat"><EyeOutlined /> {currentScript.usageCount}次使用</span>
                  <span className="detail-stat"><HeartOutlined /> {currentScript.likes}点赞</span>
                  <span className="detail-stat" style={{ color: config.color }}>成功率 {currentScript.successRate}%</span>
                </Space>

                {/* 话术内容 */}
                <Card
                  title={<span><SoundOutlined /> 话术内容</span>}
                  className="detail-card"
                  style={{ marginBottom: 16 }}
                >
                  <div className="script-content-text">
                    {currentScript.content.split('\n').map((line, i) => (
                      <p key={i} style={{ margin: line.trim() === '' ? '8px 0' : '4px 0' }}>{line}</p>
                    ))}
                  </div>
                  <Divider style={{ margin: '16px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="primary"
                      icon={<CopyOutlined />}
                      onClick={() => copyScript(currentScript)}
                      style={{ background: config.color, borderColor: config.color }}
                    >
                      一键复制话术
                    </Button>
                  </div>
                </Card>

                {/* 对话示例 */}
                <Card
                  title={<span><CommentOutlined /> 对话示例</span>}
                  className="detail-card"
                  style={{ marginBottom: 16 }}
                >
                  <div className="dialog-example">
                    {currentScript.example.split(' → ').map((part, i) => {
                      const isCustomer = i === 0;
                      return (
                        <div key={i} className={`dialog-bubble ${isCustomer ? 'customer' : 'sales'}`}>
                          <div className="dialog-role">
                            <Avatar
                              size="small"
                              style={{ background: isCustomer ? '#faad14' : config.color }}
                            >
                              {isCustomer ? '客' : '销'}
                            </Avatar>
                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                              {isCustomer ? '客户' : '销售'}
                            </Text>
                          </div>
                          <div className="dialog-text">{part.replace(/^客户："|销售："/, '').replace(/"$/, '')}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* 使用建议 */}
                <Card
                  title={<span><BulbOutlined /> 使用建议</span>}
                  className="detail-card"
                >
                  <Paragraph style={{ color: '#555', lineHeight: 1.8 }}>
                    {currentScript.tips}
                  </Paragraph>
                  <div className="detail-tags-row">
                    {currentScript.tags.map((tag, i) => (
                      <Tag key={i} color={config.color}>{tag}</Tag>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};