/**
 * 团队统计卡片组件
 */

import React from 'react';
import { TeamStats } from '../../types/team';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import { 
  TeamOutlined, 
  DollarOutlined, 
  RiseOutlined, 
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import './TeamStatsCards.css';

interface TeamStatsCardsProps {
  stats: TeamStats | null;
  loading?: boolean;
}

const TeamStatsCards: React.FC<TeamStatsCardsProps> = ({ stats, loading = false }) => {
  if (loading) {
    return (
      <div className="stats-cards-container loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="stats-cards-container">
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
            暂无团队统计数据
          </div>
        </Card>
      </div>
    );
  }

  // 计算总人数
  const totalMembers = Object.values(stats.levelDistribution).reduce((sum, count) => sum + count, 0);
  
  // 计算平均每人收益
  const avgCommission = totalMembers > 0 ? stats.totalCommission / totalMembers : 0;
  
  // 计算团队增长趋势（模拟数据）
  const growthTrend = stats.growthRate > 0.1 ? 'up' : stats.growthRate > 0 ? 'stable' : 'down';
  
  const cards = [
    {
      key: 'totalMembers',
      title: '团队总人数',
      value: totalMembers,
      icon: <TeamOutlined className="stats-icon" style={{ color: '#1890ff' }} />,
      color: '#1890ff',
      prefix: '',
      suffix: '人',
      trend: growthTrend,
      trendValue: `${(stats.growthRate * 100).toFixed(1)}%`,
      description: '总团队成员数量'
    },
    {
      key: 'totalCommission',
      title: '团队总收益',
      value: stats.totalCommission,
      icon: <DollarOutlined className="stats-icon" style={{ color: '#52c41a' }} />,
      color: '#52c41a',
      prefix: '¥',
      suffix: '',
      trend: 'up',
      trendValue: '+15.2%',
      description: '团队累计获得收益'
    },
    {
      key: 'monthCommission',
      title: '本月收益',
      value: stats.monthCommission,
      icon: <RiseOutlined className="stats-icon" style={{ color: '#fa8c16' }} />,
      color: '#fa8c16',
      prefix: '¥',
      suffix: '',
      trend: 'up',
      trendValue: '+8.3%',
      description: '本月新增收益'
    },
    {
      key: 'avgCommission',
      title: '人均收益',
      value: avgCommission,
      icon: <UserOutlined className="stats-icon" style={{ color: '#722ed1' }} />,
      color: '#722ed1',
      prefix: '¥',
      suffix: '',
      trend: 'up',
      trendValue: '+5.7%',
      description: '团队成员平均收益'
    }
  ];

  return (
    <div className="stats-cards-container">
      <Row gutter={[16, 16]}>
        {cards.map(card => (
          <Col key={card.key} xs={24} sm={12} lg={6}>
            <Card className="stats-card" hoverable>
              <div className="stats-card-content">
                {/* 图标区域 */}
                <div 
                  className="stats-icon-container"
                  style={{ backgroundColor: `${card.color}15` }} // 使用透明色
                >
                  {card.icon}
                </div>
                
                {/* 统计信息 */}
                <div className="stats-info">
                  <div className="stats-title">{card.title}</div>
                  <div className="stats-value">
                    <span className="stats-prefix">{card.prefix}</span>
                    <span className="stats-number">
                      {typeof card.value === 'number' 
                        ? card.value.toLocaleString('zh-CN', { 
                            minimumFractionDigits: 0,
                            maximumFractionDigits: card.value < 1000 ? 2 : 0
                          })
                        : card.value}
                    </span>
                    <span className="stats-suffix">{card.suffix}</span>
                  </div>
                  
                  {/* 趋势信息 */}
                  <div className="stats-trend">
                    <span className={`trend-indicator trend-${card.trend}`}>
                      {card.trend === 'up' && <ArrowUpOutlined />}
                      {card.trend === 'down' && <ArrowDownOutlined />}
                      {card.trend === 'stable' && '—'}
                      <span className="trend-value">{card.trendValue}</span>
                    </span>
                    <span className="stats-description">{card.description}</span>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      
      {/* 等级分布统计 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="团队等级分布" className="level-distribution-card">
            <div className="level-distribution">
              {Object.entries(stats.levelDistribution).map(([level, count]) => {
                const percentage = totalMembers > 0 ? (count / totalMembers) * 100 : 0;
                const levelName = 
                  level === '1' ? '会员' :
                  level === '2' ? '打版代言人' :
                  level === '3' ? '代理商' :
                  level === '4' ? '批发商' : '首席分公司';
                
                const levelColor = 
                  level === '1' ? '#8c8c8c' :
                  level === '2' ? '#52c41a' :
                  level === '3' ? '#1890ff' :
                  level === '4' ? '#fa8c16' : '#f5222d';
                
                return (
                  <div key={level} className="level-item">
                    <div className="level-info">
                      <span 
                        className="level-color" 
                        style={{ backgroundColor: levelColor }}
                      />
                      <span className="level-name">{levelName}</span>
                      <span className="level-count">{count}人</span>
                    </div>
                    <div className="level-bar">
                      <div 
                        className="level-bar-fill"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: levelColor
                        }}
                      />
                    </div>
                    <div className="level-percentage">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeamStatsCards;