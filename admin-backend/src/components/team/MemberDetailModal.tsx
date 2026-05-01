/**
 * 团队成员详情模态框组件
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchMemberDetail, clearMemberDetail } from '../../store/slices/teamSlice';
import { AgentLevel } from '../../types/commission';
import {
  Modal,
  Avatar,
  Descriptions,
  Tabs,
  Table,
  Tag,
  Button,
  Space,
  Spin,
  Statistic,
  Row,
  Col,
  Card,
  Timeline
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  TeamOutlined,
  DollarOutlined,
  CalendarOutlined,
  CrownOutlined,
  StarOutlined,
  TrophyOutlined,
  ArrowUpOutlined,
  HistoryOutlined,
  ShoppingOutlined,
  MessageOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import './MemberDetailModal.css';

const { TabPane } = Tabs;

interface MemberDetailModalProps {
  visible: boolean;
  memberId: string;
  onClose: () => void;
}

const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  visible,
  memberId,
  onClose
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    memberDetail,
    detailLoading,
    detailError
  } = useSelector((state: RootState) => state.team);
  
  // 加载成员详情
  useEffect(() => {
    if (visible && memberId) {
      dispatch(fetchMemberDetail(memberId));
    }
    
    // 清理详情数据
    return () => {
      if (visible) {
        dispatch(clearMemberDetail());
      }
    };
  }, [visible, memberId, dispatch]);
  
  // 等级图标映射
  const levelIcons: Record<string, React.ReactNode> = {
    '1': <UserOutlined />,
    '2': <StarOutlined />,
    '3': <TrophyOutlined />,
    '4': <CrownOutlined />,
    '5': <CrownOutlined style={{ color: '#f5222d' }} />,
    '6': <CrownOutlined style={{ color: '#722ed1' }} />,
  };

  // 等级颜色映射
  const levelColors: Record<string, string> = {
    '1': '#8c8c8c',
    '2': '#52c41a',
    '3': '#1890ff',
    '4': '#fa8c16',
    '5': '#f5222d',
    '6': '#722ed1',
  };

  // 等级名称映射
  const levelNames: Record<string, string> = {
    '1': '会员',
    '2': '打版代言人',
    '3': '代理商',
    '4': '批发商',
    '5': '首席分公司',
    '6': '集团事业部',
  };
  
  // 渲染加载状态
  if (detailLoading) {
    return (
      <Modal
        title="成员详情"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
      >
        <div className="detail-loading">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <p>加载成员详情...</p>
        </div>
      </Modal>
    );
  }
  
  // 渲染错误状态
  if (detailError || !memberDetail) {
    return (
      <Modal
        title="成员详情"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
      >
        <div className="detail-error">
          <p>加载成员详情失败</p>
          <Button type="primary" onClick={() => dispatch(fetchMemberDetail(memberId))}>
            重试
          </Button>
        </div>
      </Modal>
    );
  }
  
  // 分润记录表格列定义
  const commissionColumns = [
    {
      title: '时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 150,
      render: (time: string) => dayjs(time).format('MM-DD HH:mm')
    },
    {
      title: '分润类型',
      dataIndex: 'commissionType',
      key: 'commissionType',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          'level_diff': { label: '级差利润', color: 'blue' },
          'peer_bonus': { label: '平级奖励', color: 'green' },
          'upgrade_bonus': { label: '升级奖励', color: 'orange' }
        };
        const info = typeMap[type] || { label: type, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      }
    },
    {
      title: '订单金额',
      dataIndex: 'orderAmount',
      key: 'orderAmount',
      width: 120,
      render: (amount: number) => `¥${amount.toFixed(2)}`
    },
    {
      title: '分润金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => (
        <span style={{ color: '#fa8c16', fontWeight: 500 }}>
          ¥{amount.toFixed(2)}
        </span>
      )
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true
    }
  ];
  
  return (
    <Modal
      title="成员详情"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="message" icon={<MessageOutlined />}>
          发送消息
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={900}
      className="member-detail-modal"
    >
      {/* 顶部信息卡片 */}
      <Card className="member-header-card">
        <div className="member-header">
          <Avatar 
            src={memberDetail.avatar} 
            size={80}
            icon={<UserOutlined />}
            className="member-avatar"
          />
          
          <div className="member-info">
            <div className="member-name-row">
              <h2>{memberDetail.username}</h2>
              <Tag 
                color={levelColors[memberDetail.level]}
                icon={levelIcons[memberDetail.level]}
                className="member-level-tag"
              >
                {memberDetail.levelLabel}
              </Tag>
            </div>
            
            <div className="member-contact">
              <Space size="large">
                <span className="contact-item">
                  <PhoneOutlined />
                  {memberDetail.phone}
                </span>
                {memberDetail.email && (
                  <span className="contact-item">
                    <MailOutlined />
                    {memberDetail.email}
                  </span>
                )}
                <span className="contact-item">
                  <CalendarOutlined />
                  加入时间: {dayjs(memberDetail.joinTime).format('YYYY-MM-DD')}
                </span>
              </Space>
            </div>
          </div>
          
          <div className="member-stats">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="累计收益"
                  value={memberDetail.totalCommission}
                  prefix="¥"
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="团队人数"
                  value={memberDetail.teamSize}
                  prefix={<TeamOutlined />}
                  suffix="人"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="本月收益"
                  value={memberDetail.monthCommission}
                  prefix="¥"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="今日收益"
                  value={memberDetail.dayCommission}
                  prefix="¥"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
          </div>
        </div>
      </Card>
      
      {/* 标签页内容 */}
      <Tabs defaultActiveKey="basic" className="member-tabs">
        <TabPane tab="基本信息" key="basic">
          <Descriptions bordered column={2} size="middle">
            <Descriptions.Item label="用户ID">{memberDetail.id}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={memberDetail.isActive ? 'success' : 'default'}>
                {memberDetail.isActive ? '活跃' : '休眠'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="累计进货额">
              ¥{memberDetail.totalPurchase.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="订单总数">
              {memberDetail.totalOrders}笔
            </Descriptions.Item>
            <Descriptions.Item label="最后下单时间">
              {memberDetail.lastOrderTime 
                ? dayjs(memberDetail.lastOrderTime).format('YYYY-MM-DD HH:mm')
                : '暂无订单'
              }
            </Descriptions.Item>
            <Descriptions.Item label="直接下级">
              {memberDetail.directSubordinates}人
            </Descriptions.Item>
          </Descriptions>
        </TabPane>
        
        <TabPane tab="分润记录" key="commission">
          <Card title="分润历史" className="commission-history-card">
            <Table
              columns={commissionColumns}
              dataSource={memberDetail.commissionHistory}
              rowKey="id"
              size="middle"
              pagination={{ pageSize: 5 }}
            />
          </Card>
          
          <Card title="分润统计" style={{ marginTop: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title="累计分润"
                  value={memberDetail.commissionHistory.reduce((sum, item) => sum + item.amount, 0)}
                  prefix="¥"
                  precision={2}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="分润笔数"
                  value={memberDetail.commissionHistory.length}
                  suffix="笔"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="平均分润"
                  value={memberDetail.commissionHistory.length > 0 
                    ? memberDetail.commissionHistory.reduce((sum, item) => sum + item.amount, 0) / memberDetail.commissionHistory.length
                    : 0
                  }
                  prefix="¥"
                  precision={2}
                />
              </Col>
            </Row>
          </Card>
        </TabPane>
        
        <TabPane tab="升级历史" key="upgrade">
          <Timeline className="upgrade-timeline">
            {memberDetail.upgradeHistory.map((history, index) => (
              <Timeline.Item
                key={index}
                dot={
                  <div className="upgrade-dot">
                    <ArrowUpOutlined />
                  </div>
                }
                color={levelColors[history.toLevel]}
              >
                <div className="upgrade-item">
                  <div className="upgrade-info">
                    <span className="upgrade-levels">
                      <Tag color={levelColors[history.fromLevel]}>
                        {levelNames[history.fromLevel] || '未知'}
                      </Tag>
                      <span style={{ margin: '0 8px' }}>→</span>
                      <Tag color={levelColors[history.toLevel]}>
                        {levelNames[history.toLevel] || '未知'}
                      </Tag>
                    </span>
                    <span className="upgrade-time">
                      {dayjs(history.upgradeTime).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </div>
                  <div className="upgrade-details">
                    <p>触发金额: ¥{history.triggerAmount.toFixed(2)}</p>
                    {history.remark && <p>备注: {history.remark}</p>}
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </TabPane>
        
        <TabPane tab="订单概况" key="orders">
          <Card title="订单统计" className="order-stats-card">
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Statistic
                  title="订单总数"
                  value={memberDetail.orderStats.totalOrders}
                  suffix="笔"
                  prefix={<ShoppingOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="累计金额"
                  value={memberDetail.orderStats.totalAmount}
                  prefix="¥"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="平均订单金额"
                  value={memberDetail.orderStats.avgOrderAmount}
                  prefix="¥"
                  precision={2}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="最后下单时间"
                  value={dayjs(memberDetail.orderStats.lastOrderTime).format('MM-DD HH:mm')}
                />
              </Col>
            </Row>
          </Card>
          
          {memberDetail.orderStats.favoriteProducts.length > 0 && (
            <Card title="常用商品" style={{ marginTop: 16 }}>
              <Space wrap>
                {memberDetail.orderStats.favoriteProducts.map((product, index) => (
                  <Tag key={index} color="blue">
                    {product}
                  </Tag>
                ))}
              </Space>
            </Card>
          )}
        </TabPane>
        
        <TabPane tab="下级团队" key="team">
          <Card title="直接下级">
            {memberDetail.directSubordinates > 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <TeamOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 12 }} />
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {memberDetail.directSubordinates}
                </div>
                <div style={{ color: '#8c8c8c', marginTop: 8 }}>直接下级人数</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>
                暂无直接下级
              </div>
            )}
          </Card>
          
          {memberDetail.recentSubordinates.length > 0 && (
            <Card title="最近加入的下级" style={{ marginTop: 16 }}>
              <div className="subordinate-list">
                {memberDetail.recentSubordinates.map(sub => (
                  <div key={sub.id} className="subordinate-item">
                    <Avatar src={sub.avatar} size="small">
                      {sub.username.charAt(0)}
                    </Avatar>
                    <div className="subordinate-info">
                      <span className="subordinate-name">{sub.username}</span>
                      <span className="subordinate-time">
                        加入: {dayjs(sub.joinTime).format('MM-DD')}
                      </span>
                    </div>
                    <div className="subordinate-stats">
                      <Tag color="green">新成员</Tag>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default MemberDetailModal;