// 库存预警面板组件
import React, { useEffect } from 'react';
import { Card, List, Tag, Button, Space, Badge, Empty, message } from 'antd';
import { AlertOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchInventoryAlerts, resolveAlert } from '../../store/slices/productSlice';
import { InventoryAlert } from '../../types/product';

interface InventoryAlertPanelProps {
  style?: React.CSSProperties;
}

const InventoryAlertPanel: React.FC<InventoryAlertPanelProps> = ({ style }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { inventoryAlerts, loading } = useSelector((state: RootState) => state.product);

  // 初始化加载预警数据
  useEffect(() => {
    dispatch(fetchInventoryAlerts());
  }, [dispatch]);

  // 获取预警图标和颜色
  const getAlertConfig = (alertType: string) => {
    switch (alertType) {
      case 'low_stock':
        return {
          icon: <ExclamationCircleOutlined />,
          color: 'warning',
          text: '低库存',
          colorCode: '#faad14'
        };
      case 'out_of_stock':
        return {
          icon: <AlertOutlined />,
          color: 'error',
          text: '缺货',
          colorCode: '#ff4d4f'
        };
      case 'over_stock':
        return {
          icon: <ExclamationCircleOutlined />,
          color: 'default',
          text: '库存过高',
          colorCode: '#1890ff'
        };
      default:
        return {
          icon: <ExclamationCircleOutlined />,
          color: 'default',
          text: '预警',
          colorCode: '#666'
        };
    }
  };

  // 处理解决预警
  const handleResolveAlert = async (alertId: string) => {
    try {
      await dispatch(resolveAlert(alertId)).unwrap();
      message.success('预警已标记为已解决');
    } catch (error) {
      message.error('解决预警失败');
    }
  };

  // 计算统计信息
  const activeAlerts = inventoryAlerts.filter(alert => alert.status === 'active');
  const resolvedAlerts = inventoryAlerts.filter(alert => alert.status === 'resolved');
  const lowStockAlerts = activeAlerts.filter(alert => alert.alertType === 'low_stock').length;
  const outOfStockAlerts = activeAlerts.filter(alert => alert.alertType === 'out_of_stock').length;

  return (
    <Card
      title={
        <Space>
          <AlertOutlined />
          <span>库存预警</span>
          {activeAlerts.length > 0 && (
            <Badge count={activeAlerts.length} style={{ backgroundColor: '#ff4d4f' }} />
          )}
        </Space>
      }
      style={style}
      extra={
        <Space>
          <Tag color="warning">低库存：{lowStockAlerts}</Tag>
          <Tag color="error">缺货：{outOfStockAlerts}</Tag>
          <Tag color="success">已处理：{resolvedAlerts.length}</Tag>
        </Space>
      }
    >
      {activeAlerts.length === 0 ? (
        <Empty
          image={<CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />}
          imageStyle={{ height: 80 }}
          description={
            <div>
              <div>暂无库存预警</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                所有商品库存状态正常
              </div>
            </div>
          }
        />
      ) : (
        <List
          dataSource={activeAlerts}
          loading={loading}
          renderItem={(alert: InventoryAlert) => {
            const config = getAlertConfig(alert.alertType);
            
            return (
              <List.Item
                actions={[
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={() => handleResolveAlert(alert.id)}
                    icon={<CheckCircleOutlined />}
                  >
                    标记已解决
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: config.colorCode,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      {config.icon}
                    </div>
                  }
                  title={
                    <Space>
                      <span>{alert.productName}</span>
                      <Tag color={config.color as any}>{config.text}</Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <div>
                        <span style={{ color: '#666' }}>当前库存：</span>
                        <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
                          {alert.currentStock}
                        </span>
                        <span style={{ color: '#666', marginLeft: 8 }}>预警阈值：</span>
                        <span>{alert.threshold}</span>
                      </div>
                      <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                        预警时间：{new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                  }
                />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: config.colorCode }}>
                    {alert.currentStock}
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    / {alert.threshold}
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}

      {/* 库存建议 */}
      {activeAlerts.length > 0 && (
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f',
          borderRadius: 4
        }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ fontWeight: 'bold', color: '#52c41a' }}>库存管理建议：</div>
            <div style={{ fontSize: 12 }}>
              {outOfStockAlerts > 0 && (
                <div>• 有 {outOfStockAlerts} 个商品缺货，建议立即补充库存</div>
              )}
              {lowStockAlerts > 0 && (
                <div>• 有 {lowStockAlerts} 个商品库存低于预警阈值，建议及时补货</div>
              )}
              <div>• 定期检查库存周转率，优化库存结构</div>
              <div>• 设置合理的库存预警阈值，减少缺货风险</div>
            </div>
          </Space>
        </div>
      )}
    </Card>
  );
};

export default InventoryAlertPanel;