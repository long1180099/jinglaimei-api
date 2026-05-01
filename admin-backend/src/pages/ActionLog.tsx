import React, { useState, useEffect } from 'react';
import {
  Row, Col, Card, Typography, Button, Tabs, Tag, Progress,
  Statistic, Space, Badge, Tooltip, Modal, Form, Input, Select,
  DatePicker, Table, Timeline, List, Avatar, Steps, Alert, Empty,
  message, Descriptions, Spin
} from 'antd';
import {
  TrophyOutlined, FireOutlined, CalendarOutlined, CheckCircleOutlined,
  ClockCircleOutlined, PlusOutlined, EditOutlined, StarOutlined,
  RiseOutlined, FallOutlined, ThunderboltOutlined, HeartOutlined,
  SmileOutlined, TeamOutlined, BookOutlined, SafetyCertificateOutlined,
  BulbOutlined, AimOutlined as BarChartOutlined, ArrowUpOutlined,
  ExclamationCircleOutlined, CheckOutlined, AimOutlined, RocketOutlined,
  CrownOutlined, DownloadOutlined, UserOutlined, SearchOutlined, EyeOutlined,
  ExportOutlined, ReloadOutlined, CheckCircleFilled
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { schoolApi } from '../api/schoolApi';
import './ActionLog.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// ==================== 类型定义 ====================
interface ActionLogUser {
  user_id: number;
  name: string;
  level: number;
  phone?: string;
  last_active: string;
  checkin_count: number;
  avg_score: number;
  annual_goals: number;
  annual_completed: number;
  commitments: number;
  total_checkins: number;
  max_streak: number;
}

interface OverviewData {
  activeUsers30d: number;
  monthCheckins: number;
  todayCheckins: number;
  annualGoals: { total: number; completed: number };
  monthlyGoals: { total: number };
  commitments: { total: number; active: number };
}

interface UserDetail {
  user: any;
  stats: any;
  annualGoals: any[];
  monthlyGoals: any[];
  recentLogs: any[];
  todayLog: any | null;
  todayItems: any[];
  commitments: any[];
  trackingData: any[];
}

// 工具函数
const priorityColor: Record<string, string> = {
  A1: '#ff4d4f', A2: '#fa8c16', A3: '#fadb14', B1: '#52c41a', B2: '#13c2c2', B: '#52c41a', C: '#1890ff'
};
const levelNames: Record<number, string> = { 1:'会员',2:'打版代言人',3:'代理商',4:'批发商',5:'首席分公司',6:'集团事业部' };
const levelColors: Record<number, string> = { 1:'#999',2:'#1890ff',3:'#52c41a',4:'#faad14',5:'#e94560',6:'#722ed1' };

// ==================== 主页面 ====================
const ActionLog: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [users, setUsers] = useState<ActionLogUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('lastActive');
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);

  // 加载总览数据
  useEffect(() => { loadOverview(); }, []);
  
  // 加载用户列表（依赖页码/搜索）
  useEffect(() => { loadUsers(); }, [currentPage, sortBy]);

  const loadOverview = () => {
    setLoading(true);
    schoolApi.getActionLogOverview().then((res: any) => {
      if (res.data?.data) setOverview(res.data.data);
      else setOverview(res.data || null);
    }).catch(() => message.error('加载总览失败'))
    .finally(() => setLoading(false));
  };

  const loadUsers = () => {
    schoolApi.getActionLogUsers({ page: currentPage, pageSize, keyword, sortBy })
      .then((res: any) => {
        const data = res.data?.data || res.data;
        setUsers(data?.list || data || []);
        setUsersTotal(data?.total || 0);
      })
      .catch(() => message.error('加载用户列表失败'));
  };

  const handleSearch = (v: string) => { setKeyword(v); setCurrentPage(1); setTimeout(loadUsers, 100); };
  const handleTableChange = (pag: any) => { setCurrentPage(pag.current); };

  const viewUserDetail = (userId: number) => {
    setDetailVisible(true);
    setDetailLoading(true);
    setSelectedUser(null);
    schoolApi.getActionLogUserDetail(userId)
      .then((res: any) => { setSelectedUser(res.data?.data || res.data || null); })
      .catch(() => message.error('获取用户详情失败'))
      .finally(() => setDetailLoading(false));
  };

  const exportCsv = () => {
    message.info('正在导出...');
    schoolApi.exportActionLogCsv()
      .then((res: any) => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url; link.download = `行动日志_${dayjs().format('YYYYMMDD')}.csv`;
        link.click(); window.URL.revokeObjectURL(url);
        message.success('导出成功！');
      });
  };

  const handleRefresh = () => { loadOverview(); loadUsers(); };

  // 用户表格列定义
  const columns = [
    { title: '用户', dataIndex: 'name', key: 'name', width: 120,
      render: (n: string, r: ActionLogUser) => (
        <div><UserOutlined style={{marginRight:8,color:'#1890ff'}}/><span style={{fontWeight:600}}>{n||`用户${r.user_id}`}</span>
          <Tag color={levelColors[r.level]} style={{marginLeft:8,fontSize:11}}>{levelNames[r.level]}</Tag>
        </div>
      )
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 120 },
    { title: '等级', dataIndex: 'level', key: 'level', width: 90,
      render: (lv: number) => <Tag color={levelColors[lv]}>{levelNames[lv]}</Tag> 
    },
    { title: '总打卡天数', dataIndex: 'checkin_count', key: 'checkin_count', width: 100,
      sorter: true, render: (v: number) => <Text strong style={{color:'#1890ff'}}>{v}</Text>
    },
    { title: '本月打卡', dataIndex: '', key: 'month', width: 90,
      render: (_:any, r: ActionLogUser) => <Text type="secondary">{r.last_active && r.last_active.startsWith(dayjs().format('YYYY-MM')) ? '✅' : '-'}</Text>
    },
    { title: '连续打卡', dataIndex: 'max_streak', key: 'max_streak', width: 90,
      sorter: true, render: (v: number) => v > 0 ? <Text style={{color:'#faad14',fontWeight:700}}>🔥{v}天</Text> : '-'
    },
    { title: '平均心态分', dataIndex: 'avg_score', key: 'avg_score', width: 100,
      sorter: true, render: (v: number) => v > 0 ? (
        <Progress percent={Math.round(v*10)} size="small" strokeColor={v>=48?'#52c41a':v>=36?'#faad14':'#ff4d4f'} />
      ) : '-'
    },
    { title: '年度目标', dataIndex: '', key: 'annual', width: 110,
      render: (_:any, r: ActionLogUser) => `${r.annual_completed}/${r.annual_goals}`
    },
    { title: '承诺书', dataIndex: 'commitments', key: 'commitments', width: 80,
      render: (v: number) => v > 0 ? <Badge count={v} style={{backgroundColor:'#e94560'}}/> : '-'
    },
    { title: '最后活跃', dataIndex: 'last_active', key: 'last_active', width: 120,
      render: (d: string) => d ? dayjs(d).format('MM-DD HH:mm') : '-'
    },
    { title: '操作', key: 'action', width: 80, fixed: 'right',
      render: (_: any, r: ActionLogUser) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => viewUserDetail(r.user_id)}>详情</Button>
      )
    }
  ];

  return (
    <div className="action-log-page">
      {/* ========== 总览Banner ========== */}
      <div className="al-page-banner">
        <div className="al-banner-content">
          <div className="al-banner-left">
            <div className="al-banner-icon"><RocketOutlined /></div>
            <div><Title level={3} style={{margin:0,color:'#fff'}}>📋 行动日志管理</Title>
              <Text style={{color:'rgba(255,255,255,0.8)',fontSize:14}}>全部代理商目标管理 · 每日跟进 · 成长追踪</Text>
            </div>
          </div>
          {overview && (
          <div className="al-banner-stats">
            <div className="al-banner-stat">
              <div className="al-bstat-value">{overview.todayCheckins}</div>
              <div className="al-bstat-label">今日打卡</div>
            </div>
            <div className="al-banner-divider" />
            <div className="al-banner-stat">
              <div className="al-bstat-value">{overview.activeUsers30d}</div>
              <div className="al-bstat-label">活跃代理</div>
            </div>
            <div className="al-banner-divider" />
            <div className="al-banner-stat">
              <div className="al-bstat-value">{overview.monthCheckins}</div>
              <div className="al-bstat-label">本月记录</div>
            </div>
            <div className="al-banner-divider" />
            <div className="al-banner-stat">
              <div className="al-bstat-value">{overview.annualGoals.completed}/{overview.annualGoals.total}</div>
              <div className="al-bstat-label">年度完成</div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* ========== 统计卡片 ========== */}
      {overview && (
      <Row gutter={[16,16]} style={{marginTop:16}}>
        <Col xs={12} sm={8} md={4}>
          <Card hoverable bordered={false}>
            <Statistic title="活跃用户(30天)" value={overview.activeUsers30d}
              prefix={<TeamOutlined />} valueStyle={{color:'#1890ff'}}/>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card hoverable bordered={false}>
            <Statistic title="今日打卡人数" value={overview.todayCheckins}
              prefix={<FireOutlined />} valueStyle={{color:'#faad14'}}/>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card hoverable bordered={false}>
            <Statistic title="月度目标数" value={overview.monthlyGoals.total}
              prefix={<CalendarOutlined />} valueStyle={{color:'#722ed1'}}/>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card hoverable bordered={false}>
            <Statistic title="承诺书总数" value={overview.commitments.total} prefix={<CrownOutlined />} valueStyle={{color:'#e94560'}} />
            <Text style={{fontSize:12,color:'#999',display:'block',textAlign:'center',marginTop:-8}}>{overview.commitments.active} 进行中</Text>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card hoverable bordered={false}>
            <Statistic title="年度完成率"
              value={overview.annualGoals.total > 0 ? Math.round(overview.annualGoals.completed / overview.annualGoals.total * 100) : 0}
              suffix="%" prefix={<TrophyOutlined />} valueStyle={{color:'#52c41a'}}/>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card hoverable bordered={false}>
            <Statistic title="本月总记录" value={overview.monthCheckins}
              prefix={<BookOutlined />} valueStyle={{color:'#13c2c2'}}/>
          </Card>
        </Col>
      </Row>
      )}

      {/* ========== 搜索+操作栏 ========== */}
      <Card style={{marginTop:16}} size="small">
        <Row align="middle" justify="space-between">
          <Col flex="1" style={{display:'flex',gap:12,alignItems:'center'}}>
            <Input.Search placeholder="搜索姓名/手机号..." allowClear enterButton={<SearchOutlined/>}
              onSearch={handleSearch} style={{width:240}}/>
            <Select value={sortBy} onChange={(v)=>{setSortBy(v);setCurrentPage(1)}} style={{width:140}}>
              <Option value="lastActive">最近活跃</Option>
              <Option value="checkinCount">打卡最多</Option>
              <Option value="avgScore">心态最好</Option>
              <Option value="streak">连续最长</Option>
            </Select>
            <Text type="secondary" style={{fontSize:13}}>共 {usersTotal} 人有记录</Text>
          </Col>
          <Col>
            <Space>
              <Button icon="download" onClick={exportCsv}>导出CSV</Button>
              <Button icon="reload" loading={loading} onClick={handleRefresh}>刷新</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ========== 用户表格 ========== */}
      <Card style={{marginTop:16}} bodyStyle={{padding:0}}>
        <Table<ActionLogUser>
          columns={columns as any}
          dataSource={users}
          rowKey="user_id"
          loading={loading}
          pagination={{
            current: currentPage, pageSize, total: usersTotal,
            showSizeChanger:false, showQuickJumper:true,
            showTotal:(t)=>`共${t}人`, onChange:handleTableChange
          }}
          scroll={{x:1200}}
          size="middle"
        />
        {!loading && users.length === 0 && (
          <div style={{textAlign:'center',padding:60}}>
            <Empty description="暂无行动日志数据，等待代理商开始使用" image={Empty.PRESENTED_IMAGE_SIMPLE}/>
          </div>
        )}
      </Card>

      {/* ========== 用户详情弹窗 ========== */}
      <Modal title={null} open={detailVisible} onCancel={() => setDetailVisible(false)}
        footer={[<Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>]}
        width={900} destroyOnClose
      >
        {detailLoading ? <div style={{textAlign:'center',padding:80}}><Spin size="large"/><br/>加载中...</div> : selectedUser ? (
          <div className="user-detail-modal">
            {/* 用户头部信息 */}
            <div className="udm-header">
              <Avatar size={64} icon={<UserOutlined />} style={{background:'#e94560'}}/>
              <div className="udm-info">
                <Title level={4} style={{margin:0}}>
                  {selectedUser.user.real_name || selectedUser.user.username || `用户${selectedUser.user.id}`}
                  <Tag color={levelColors[selectedUser.user.agent_level]} style={{marginLeft:8}}>
                    {levelNames[selectedUser.user.agent_level]}
                  </Tag>
                </Title>
                <Text type="secondary">{selectedUser.user.phone || ''} · ID: {selectedUser.user.id}</Text>
              </div>
              <div className="udm-quick-stats">
                <Statistic title="总打卡" value={selectedUser.stats.totalCheckins} valueStyle={{fontSize:18,color:'#1890ff'}}/>
                <Statistic title="本月" value={selectedUser.stats.thisMonthCheckins} valueStyle={{fontSize:18,color:'#52c41a'}}/>
                <Statistic title="均分" value={selectedUser.stats.avgScore} suffix="/60" valueStyle={{fontSize:18,color:selectedUser.stats.avgScore>=48?'#52c41a':'#ff4d4f'}}/>
              </div>
            </div>

            {/* Tab内容 */}
            <Tabs defaultActiveKey="annual" size="small">
              {/* 年度目标Tab */}
              <Tabs.TabPane tab={`年度目标 (${selectedUser.annualGoals.length})`} key="annual">
                {selectedUser.annualGoals.length > 0 ? (
                  <div>
                    <Progress 
                      percent={selectedUser.annualGoals.length > 0 ? Math.round(selectedUser.annualGoals.reduce((s:number,g:any)=>s+(g.progress||0),0)/selectedUser.annualGoals.length) : 0}
                      strokeColor="#e94560"/>
                    <Row gutter={[12,12]} style={{marginTop:12}}>
                      {selectedUser.annualGoals.map((g:any,i:number)=>(
                        <Col span={24} key={i}>
                          <Card size="small" style={{borderLeft:`4px solid ${g.category.includes('财务')?'#e94560':g.category.includes('学习')?'#1890ff':'#52c41a'}`}}>
                            <Text strong>{g.title}</Text><br/>
                            <Text type="secondary" style={{fontSize:12}}>{g.content}</Text>
                            <Progress percent={g.progress||0} size="small" style={{marginTop:6}}
                              strokeColor={g.progress>=80?'#52c41a':g.progress>=50?'#faad14':'#ff4d4f'} />
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ) : <Empty description="暂无年度目标" image={Empty.PRESENTED_IMAGE_SIMPLE}/>}
              </Tabs.TabPane>

              {/* 今日日志Tab */}
              <Tabs.TabPane tab="今日日志" key="today">
                {selectedUser.todayLog ? (
                  <div>
                    <Alert type={selectedUser.todayLog.mindset_total >= 48 ? "success" : "warning"}
                      showIcon message={`心态评分: ${selectedUser.todayLog.mindset_total}/60`}
                      description={selectedUser.todayLog.mindset_total >= 48 ? '状态极佳！' : '需要关注'}
                      style={{marginBottom:12}}/>
                    {selectedUser.todayItems.length > 0 && (
                      <div>
                        <Text strong>今日事项:</Text>
                        {selectedUser.todayItems.map((item:any,i:number)=>(
                          <div key={i} style={{padding:'8px 0',borderBottom:'1px solid #f5f5f5',display:'flex',alignItems:'center'}}>
                            <Tag color={priorityColor[item.priority]||'#999'} style={{marginRight:8}}>{item.priority}</Tag>
                            <Text style={{textDecoration:item.is_completed?'line-through':'none',opacity:item.is_completed?0.5:1}}>{item.task}</Text>
                            {item.is_completed ? <CheckCircleFilled style={{color:'#52c41a',marginLeft:8}}/> : ''}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedUser.todayLog.study_content && (
                      <div style={{marginTop:12}}><Text type="secondary">📚 学习：{selectedUser.todayLog.study_content}</Text></div>
                    )}
                    {selectedUser.todayLog.improvement && (
                      <div style={{marginTop:8}}><Text type="secondary">🔧 改进：{selectedUser.todayLog.improvement}</Text></div>
                    )}
                  </div>
                ) : <Empty description="今日尚未填写日志"/>}
              </Tabs.TabPane>

              {/* 最近记录Tab */}
              <Tabs.TabPane tab={`最近记录 (${selectedUser.recentLogs.length})`} key="recent">
                {selectedUser.recentLogs.length > 0 ? (
                  <Timeline mode="left">
                    {selectedUser.recentLogs.map((log:any,i:number)=>(
                      <Timeline.Item key={i}
                        color={log.score>=70?'green':log.score>=40?'orange':'red'}
                        dot={log.score>=90?<TrophyOutlined />:undefined}>
                        <Text strong>{log.log_date}</Text>
                        <br/><Text type="secondary">心态: {log.score||0}分 · {log.study_content?log.study_content.substring(0,40)+'...':'无学习记录'}</Text>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                ) : <Empty description="暂无记录"/>}
              </Tabs.TabPane>

              {/* 承诺书Tab */}
              <Tabs.TabPane tab={`承诺书 (${selectedUser.commitments.length})`} key="commitment">
                {selectedUser.commitments.length > 0 ? selectedUser.commitments.map((c:any,i:number)=>(
                  <Card key={i} style={{marginBottom:12,background: c.status===1 ? 'linear-gradient(160deg,#e94560,#c62f4a)' : '#f5f5f5', color:c.status===1?'#fff':'#333'}}>
                    <Text strong style={{color:c.status===1?'#fff':'inherit'}}>👑 {c.title}</Text>
                    {c.supervisor && <div style={{opacity:0.85,fontSize:12,marginTop:4}}>监督人: {c.supervisor} {c.pk_person?`| PK: ${c.pk_person}`:''}</div>}
                    {c.content && <div style={{opacity:0.85,fontSize:13,marginTop:6,lineHeight:1.5}}>{c.content}</div>}
                    <div style={{marginTop:8}}>
                      <Tag color={c.status===1?'success':'default'}>{c.status===1?'进行中':'已结束'}</Tag>
                      <Tag style={{marginLeft:6}}>为期{c.duration||30}天 · 已打卡{c.checkin_count||0}天</Tag>
                    </div>
                  </Card>
                )) : <Empty description="暂无承诺书"/>}
              </Tabs.TabPane>
            </Tabs>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default ActionLog;