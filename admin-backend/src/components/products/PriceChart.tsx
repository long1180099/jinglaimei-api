// 商品价格趋势图表组件
import React from 'react';
import { Line } from '@ant-design/charts';
import { Card, Select, Space, Statistic } from 'antd';
import { Product } from '../../types/product';

const { Option } = Select;

interface PriceChartProps {
  products: Product[];
}

const PriceChart: React.FC<PriceChartProps> = ({ products }) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  // 准备图表数据
  const prepareChartData = () => {
    if (selectedCategory === 'all') {
      return products.slice(0, 10).map(product => ({
        name: product.name,
        retailPrice: product.retailPrice,
        agentPrice: product.agentPrice,
        vipPrice: product.vipPrice,
        partnerPrice: product.partnerPrice,
        category: product.category
      }));
    } else {
      return products
        .filter(product => product.category === selectedCategory)
        .slice(0, 10)
        .map(product => ({
          name: product.name,
          retailPrice: product.retailPrice,
          agentPrice: product.agentPrice,
          vipPrice: product.vipPrice,
          partnerPrice: product.partnerPrice,
          category: product.category
        }));
    }
  };

  const chartData = prepareChartData();

  // 计算价格统计
  const calculateStats = () => {
    const prices = chartData.flatMap(item => [
      item.retailPrice,
      item.agentPrice,
      item.vipPrice,
      item.partnerPrice
    ]);
    
    if (prices.length === 0) {
      return { min: 0, max: 0, avg: 0 };
    }
    
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    return { min, max, avg };
  };

  const stats = calculateStats();

  // 配置图表
  const config = {
    data: chartData,
    xField: 'name',
    yField: 'value',
    seriesField: 'type',
    meta: {
      value: {
        alias: '价格（元）',
        formatter: (value: number) => `¥${value.toFixed(2)}`
      }
    },
    xAxis: {
      label: {
        autoRotate: false,
        formatter: (text: string) => {
          // 截断长文本
          return text.length > 8 ? text.substring(0, 8) + '...' : text;
        }
      }
    },
    yAxis: {
      label: {
        formatter: (value: number) => `¥${value}`
      }
    },
    color: ['#1890ff', '#52c41a', '#faad14', '#722ed1'],
    legend: {
      position: 'top'
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: datum.type, value: `¥${datum.value.toFixed(2)}` };
      }
    },
    smooth: true,
    height: 300
  };

  // 转换数据格式用于图表
  const transformData = () => {
    const result: any[] = [];
    
    chartData.forEach(item => {
      result.push(
        { name: item.name, type: '零售价', value: item.retailPrice, category: item.category },
        { name: item.name, type: '代言人价', value: item.vipPrice, category: item.category },
        { name: item.name, type: '代理价', value: item.agentPrice, category: item.category },
        { name: item.name, type: '批发价', value: item.partnerPrice, category: item.category }
      );
    });
    
    return result;
  };

  const lineData = transformData();
  const chartConfig = {
    ...config,
    data: lineData
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <span>筛选分类：</span>
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            style={{ width: 120 }}
          >
            <Option value="all">全部商品</Option>
            <Option value="护肤品">护肤品</Option>
            <Option value="面膜">面膜</Option>
            <Option value="防晒">防晒</Option>
            <Option value="身体护理">身体护理</Option>
            <Option value="男士护肤">男士护肤</Option>
            <Option value="手部护理">手部护理</Option>
            <Option value="卸妆">卸妆</Option>
            <Option value="套装">套装</Option>
          </Select>
          <span style={{ marginLeft: 24 }}>当前显示：{chartData.length}个商品</span>
        </Space>
      </div>

      {/* 价格统计 */}
      <Space size="large" style={{ marginBottom: 24 }}>
        <Statistic title="最低价格" value={stats.min} prefix="¥" precision={2} />
        <Statistic title="最高价格" value={stats.max} prefix="¥" precision={2} />
        <Statistic title="平均价格" value={stats.avg} prefix="¥" precision={2} />
      </Space>

      {/* 图表 */}
      {lineData.length > 0 ? (
        <Line {...chartConfig} />
      ) : (
        <div style={{ 
          height: 300, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px dashed #d9d9d9',
          borderRadius: 4,
          color: '#999'
        }}>
          暂无数据，请选择其他分类或添加商品
        </div>
      )}

      {/* 图例说明 */}
      <div style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
        <div>图例说明：</div>
        <Space size="large" style={{ marginTop: 8 }}>
          <div><span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#1890ff', marginRight: 8 }}></span>零售价 - 终端消费者价格</div>
          <div><span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#52c41a', marginRight: 8 }}></span>代理商价 - 代理商采购价格</div>
          <div><span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#faad14', marginRight: 8 }}></span>代言人价 - 打版代言人价格</div>
          <div><span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#722ed1', marginRight: 8 }}></span>批发价 - 批发商采购价格</div>
        </Space>
      </div>
    </div>
  );
};

export default PriceChart;