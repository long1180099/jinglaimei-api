/**
 * 加载遮罩组件 - 提供统一的加载状态显示
 */

import React from 'react';
import { Spin, Space, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LoadingOverlayProps {
  loading?: boolean;
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'default' | 'large';
  opacity?: number;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading = true,
  message = '加载中...',
  fullScreen = false,
  size = 'large',
  opacity = 0.7,
}) => {
  if (!loading) return null;

  const spinSize = size === 'small' ? 24 : size === 'default' ? 32 : 48;

  const overlayStyle: React.CSSProperties = {
    position: fullScreen ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `rgba(255, 255, 255, ${opacity})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
  };

  const contentStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  };

  return (
    <div style={overlayStyle}>
      <div style={contentStyle}>
        <Spin 
          indicator={<LoadingOutlined style={{ fontSize: spinSize }} spin />} 
          size={size}
        />
        {message && (
          <Text type="secondary" style={{ marginTop: 8 }}>
            {message}
          </Text>
        )}
      </div>
    </div>
  );
};

// 页面级加载组件
export const PageLoading: React.FC<{ message?: string }> = ({ message }) => (
  <div style={{ 
    minHeight: '400px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center' 
  }}>
    <Space direction="vertical" align="center" size="large">
      <Spin size="large" />
      <Text type="secondary">{message || '页面加载中...'}</Text>
    </Space>
  </div>
);

// 骨架屏加载组件
export const SkeletonLoader: React.FC<{ 
  type?: 'table' | 'card' | 'list';
  count?: number;
}> = ({ type = 'card', count = 4 }) => {
  const skeletons = Array.from({ length: count });
  
  if (type === 'table') {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ 
          height: '40px', 
          backgroundColor: '#f0f0f0', 
          borderRadius: '4px', 
          marginBottom: '16px' 
        }} />
        {skeletons.map((_, index) => (
          <div 
            key={index}
            style={{ 
              height: '60px', 
              backgroundColor: '#fafafa', 
              borderRadius: '4px', 
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px'
            }}
          >
            <div style={{ 
              width: '30%', 
              height: '16px', 
              backgroundColor: '#e8e8e8', 
              borderRadius: '2px' 
            }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div style={{ padding: 20 }}>
        {skeletons.map((_, index) => (
          <div 
            key={index}
            style={{ 
              height: '72px', 
              backgroundColor: '#fafafa', 
              borderRadius: '8px', 
              marginBottom: '12px',
              padding: '16px'
            }}
          >
            <div style={{ 
              width: '60%', 
              height: '20px', 
              backgroundColor: '#e8e8e8', 
              borderRadius: '2px',
              marginBottom: '8px'
            }} />
            <div style={{ 
              width: '40%', 
              height: '16px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '2px' 
            }} />
          </div>
        ))}
      </div>
    );
  }

  // 卡片类型（默认）
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
      gap: '16px',
      padding: '20px'
    }}>
      {skeletons.map((_, index) => (
        <div 
          key={index}
          style={{ 
            backgroundColor: '#fafafa', 
            borderRadius: '8px', 
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ 
            width: '80%', 
            height: '20px', 
            backgroundColor: '#e8e8e8', 
            borderRadius: '2px',
            marginBottom: '12px'
          }} />
          <div style={{ 
            width: '100%', 
            height: '100px', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '4px',
            marginBottom: '16px'
          }} />
          <div style={{ 
            width: '60%', 
            height: '16px', 
            backgroundColor: '#e8e8e8', 
            borderRadius: '2px' 
          }} />
        </div>
      ))}
    </div>
  );
};

// 进度加载器
export const ProgressLoader: React.FC<{
  percent: number;
  status?: 'active' | 'success' | 'exception' | 'normal';
  format?: (percent?: number) => React.ReactNode;
  strokeWidth?: number;
}> = ({ percent, status = 'active', format, strokeWidth = 6 }) => {
  return (
    <div style={{ 
      width: '100%', 
      padding: '20px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ width: '80%' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '8px' 
        }}>
          <Text type="secondary">处理进度</Text>
          <Text type="secondary">
            {format ? format(percent) : `${percent}%`}
          </Text>
        </div>
        <div style={{ 
          width: '100%', 
          height: strokeWidth, 
          backgroundColor: '#f0f0f0', 
          borderRadius: strokeWidth / 2,
          overflow: 'hidden'
        }}>
          <div 
            style={{ 
              width: `${percent}%`, 
              height: '100%',
              backgroundColor: status === 'exception' ? '#ff4d4f' : 
                               status === 'success' ? '#52c41a' : '#1890ff',
              borderRadius: strokeWidth / 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '8px' 
        }}>
          <Text type="secondary">
            {status === 'active' ? '处理中...' : 
             status === 'success' ? '处理完成' : 
             status === 'exception' ? '处理失败' : '准备处理'}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;