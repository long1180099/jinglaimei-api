import React from 'react';
import { 
  Modal, 
  Descriptions, 
  Tag, 
  Avatar, 
  Row, 
  Col, 
  Statistic, 
  Divider,
  Button,
  Space,
  Typography
} from 'antd';
import { 
  UserOutlined, 
  PhoneOutlined, 
  MailOutlined, 
  CalendarOutlined,
  TeamOutlined,
  BankOutlined,
  SafetyOutlined,
  EditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface UserDetailModalProps {
  user: any;
  visible: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ 
  user, 
  visible, 
  onClose,
  onEdit 
}) => {
  // 代理等级映射
  const agentLevelMap: Record<number, { text: string; color: string }> = {
    1: { text: '会员', color: 'default' },
    2: { text: '打版代言人', color: 'green' },
    3: { text: '代理商', color: 'blue' },
    4: { text: '批发商', color: 'orange' },
    5: { text: '首席分公司', color: 'red' },
    6: { text: '集团事业部', color: 'purple' },
  };
  
  // 状态映射
  const statusMap = {
    0: { text: '已禁用', color: 'red' },
    1: { text: '正常', color: 'green' },
    2: { text: '审核中', color: 'orange' },
  };
  
  // 性别映射
  const genderMap = {
    0: '未知',
    1: '男',
    2: '女',
  };
  
  const levelConfig = agentLevelMap[user.agent_level as keyof typeof agentLevelMap] || { text: '未知', color: 'default' };
  const statusConfig = statusMap[user.status as keyof typeof statusMap] || { text: '未知', color: 'default' };
  
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar 
            size={40} 
            src={user.avatar_url} 
            icon={!user.avatar_url && <UserOutlined />}
          />
          <div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>
              {user.username}
              {user.real_name && ` (${user.real_name})`}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              ID: {user.id} • 邀请码: {user.invite_code}
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        onEdit && (
          <Button key="edit" type="primary" icon={<EditOutlined />} onClick={onEdit}>
            编辑信息
          </Button>
        ),
      ].filter(Boolean)}
      width={800}
    >
      <div style={{ padding: '0 8px' }}>
        {/* 基本信息 */}
        <Descriptions 
          title="基本信息" 
          column={2} 
          bordered
          size="small"
          style={{ marginBottom: 24 }}
        >
          <Descriptions.Item label="手机号">
            <Space>
              <PhoneOutlined />
              {user.phone}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            <Space>
              <MailOutlined />
              {user.email || '未设置'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="性别">
            {genderMap[user.gender as keyof typeof genderMap]}
          </Descriptions.Item>
          <Descriptions.Item label="生日">
            <Space>
              <CalendarOutlined />
              {user.birthday ? dayjs(user.birthday).format('YYYY-MM-DD') : '未设置'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="代理等级">
            <Tag color={levelConfig.color}>{levelConfig.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="账户状态">
            <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="注册时间" span={2}>
            {dayjs(user.registered_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="最后更新" span={2}>
            {dayjs(user.updated_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        </Descriptions>
        
        {/* 财务统计 */}
        <Divider orientation="left">财务信息</Divider>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="账户余额"
                value={user.balance}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#07c160', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="冻结金额"
                value={user.frozen_balance}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#fa8c16', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="累计收益"
                value={user.total_income}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#1890ff', fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="今日收益"
                value={user.today_income}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#52c41a', fontSize: 20 }}
              />
            </Card>
          </Col>
        </Row>
        
        {/* 团队信息 */}
        <Divider orientation="left">团队信息</Divider>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="上级代理">
                {user.parent_name || '无上级'}
              </Descriptions.Item>
              <Descriptions.Item label="所属团队">
                {user.team_name || '未加入团队'}
              </Descriptions.Item>
              <Descriptions.Item label="团队成员">
                <Space>
                  <TeamOutlined />
                  {user.member_count || 0} 人
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="团队收益">
                <Text strong style={{ color: '#fa8c16' }}>
                  ¥{(user.total_commission || 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
        
        {/* 业务统计 */}
        <Divider orientation="left">业务统计</Divider>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="订单总数"
                value={user.order_count || 0}
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="订单金额"
                value={user.total_commission || 0}
                precision={2}
                prefix="¥"
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="平均订单"
                value={user.order_count ? ((user.total_commission || 0) / user.order_count).toFixed(2) : 0}
                precision={2}
                prefix="¥"
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
        </Row>
        
        {/* 安全信息 */}
        <Divider orientation="left">安全信息</Divider>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="微信OpenID">
            <Text code>{user.openid}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="账户安全">
            <Space>
              <SafetyOutlined />
              <Tag color="success">已验证手机</Tag>
              {user.email && <Tag color="processing">已验证邮箱</Tag>}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="账户状态">
            <Space>
              <BankOutlined />
              {user.is_deleted ? (
                <Tag color="error">已删除</Tag>
              ) : (
                <Tag color="success">正常</Tag>
              )}
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </div>
    </Modal>
  );
};

// 简化Card组件
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 1px 6px rgba(0,0,0,0.02)',
    ...style
  }}>
    {children}
  </div>
);

export default UserDetailModal;