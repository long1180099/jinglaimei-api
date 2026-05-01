// 订单管理页面（占位符）
import React from 'react';
import { Card, Typography, Alert } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const OrderManagement: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Title level={2}>
          <ShoppingCartOutlined style={{ marginRight: 12 }} />
          订单管理
        </Title>
        
        <Alert
          message="订单管理模块正在开发中"
          description="订单管理功能包括：订单列表、订单详情、发货管理、退款处理、物流跟踪等。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        
        <Paragraph>
          订单管理模块将实现以下功能：
        </Paragraph>
        
        <ul>
          <li>订单列表展示和筛选</li>
          <li>订单状态管理（待付款、待发货、已发货、已完成、已取消）</li>
          <li>订单详情查看和编辑</li>
          <li>发货管理和物流跟踪</li>
          <li>退款和退货处理</li>
          <li>订单导出和报表</li>
          <li>订单数据统计和分析</li>
        </ul>
        
        <Paragraph>
          该模块将与商品管理、用户管理、收益管理等模块实现数据联动，确保业务流程的完整性。
        </Paragraph>
      </Card>
    </div>
  );
};

export default OrderManagement;