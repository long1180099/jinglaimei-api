// 商品统计卡片组件
import React from 'react';
import { Card, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

interface ProductStatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  unit?: string;
  precision?: number;
}

const ProductStatsCard: React.FC<ProductStatsCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  trendValue,
  unit = '',
  precision = 0
}) => {
  // 渲染趋势图标
  const renderTrend = () => {
    if (!trend || !trendValue) return null;
    
    const isUp = trend === 'up';
    const trendColor = isUp ? '#52c41a' : '#ff4d4f';
    const IconComponent = isUp ? ArrowUpOutlined : ArrowDownOutlined;
    
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        fontSize: 12,
        color: trendColor,
        marginTop: 4
      }}>
        <IconComponent style={{ marginRight: 4 }} />
        <span>{Math.abs(trendValue)}%</span>
      </div>
    );
  };

  return (
    <Card 
      style={{ 
        borderRadius: 8,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 6px rgba(0, 0, 0, 0.02)'
      }}
      bodyStyle={{ padding: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>{title}</div>
          <Statistic
            value={value}
            prefix={typeof value === 'string' && value.startsWith('¥') ? undefined : unit}
            valueStyle={{ 
              fontSize: 24, 
              fontWeight: 'bold', 
              color: color 
            }}
            precision={precision}
          />
          {renderTrend()}
        </div>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: `${color}15`, // 15%透明度
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          fontSize: 24
        }}>
          {icon}
        </div>
      </div>
      
      {/* 附加信息 */}
      {typeof value === 'number' && title === '低库存商品' && value > 0 && (
        <div style={{
          marginTop: 12,
          padding: '6px 12px',
          backgroundColor: '#fff7e6',
          border: '1px solid #ffd591',
          borderRadius: 4,
          fontSize: 12,
          color: '#d46b08'
        }}>
          建议及时补充库存
        </div>
      )}
      
      {typeof value === 'number' && title === '在售商品' && value === 0 && (
        <div style={{
          marginTop: 12,
          padding: '6px 12px',
          backgroundColor: '#fff2f0',
          border: '1px solid #ffccc7',
          borderRadius: 4,
          fontSize: 12,
          color: '#cf1322'
        }}>
          暂无在售商品，请添加商品
        </div>
      )}
      
      {typeof value === 'string' && title === '总销售额' && parseFloat(value.replace('¥', '')) > 0 && (
        <div style={{
          marginTop: 12,
          padding: '6px 12px',
          backgroundColor: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: 4,
          fontSize: 12,
          color: '#52c41a'
        }}>
          销售业绩良好
        </div>
      )}
    </Card>
  );
};

export default ProductStatsCard;