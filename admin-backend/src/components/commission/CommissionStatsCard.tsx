/**
 * 收益统计卡片组件
 */

import React from 'react';
import { Card, Statistic } from 'antd';
import { ReactNode } from 'react';

interface CommissionStatsCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon?: ReactNode;
  color?: string;
  description?: string;
  precision?: number;
  trend?: number; // 趋势百分比，正数为上涨，负数为下跌
}

const CommissionStatsCard: React.FC<CommissionStatsCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  icon,
  color = '#1890ff',
  description,
  precision = 2,
  trend
}) => {
  const getTrendColor = () => {
    if (!trend) return undefined;
    return trend > 0 ? '#f5222d' : trend < 0 ? '#52c41a' : '#8c8c8c';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
  };

  const getTrendText = () => {
    if (!trend) return '';
    const absTrend = Math.abs(trend);
    return ` ${getTrendIcon()} ${absTrend.toFixed(1)}%`;
  };

  return (
    <Card 
      style={{ 
        borderRadius: 8,
        borderLeft: `4px solid ${color}`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
      }}
      bodyStyle={{ padding: '20px 24px' }}
    >
      <Statistic
        title={
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            {icon && <span style={{ marginRight: 8, color }}>{icon}</span>}
            <span style={{ fontSize: '14px', color: '#8c8c8c' }}>{title}</span>
          </div>
        }
        value={value}
        precision={precision}
        prefix={prefix}
        suffix={
          <span>
            {suffix}
            {trend !== undefined && (
              <span style={{ 
                fontSize: '12px', 
                color: getTrendColor(),
                marginLeft: 4,
                fontWeight: 'normal'
              }}>
                {getTrendText()}
              </span>
            )}
          </span>
        }
        valueStyle={{ 
          fontSize: '28px', 
          fontWeight: 'bold',
          color
        }}
      />
      {description && (
        <div style={{ 
          marginTop: 8, 
          fontSize: '12px', 
          color: '#8c8c8c',
          lineHeight: 1.5
        }}>
          {description}
        </div>
      )}
    </Card>
  );
};

export default CommissionStatsCard;