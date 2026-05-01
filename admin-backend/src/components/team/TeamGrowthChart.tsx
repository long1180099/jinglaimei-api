/**
 * 团队增长图表组件
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchTeamGrowthAnalysis } from '../../store/slices/teamSlice';
import { Card, Button, Radio, Spin, Empty } from 'antd';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  RiseOutlined,
  TeamOutlined,
  DollarOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import './TeamGrowthChart.css';

interface TeamGrowthChartProps {
  userId: string;
}

type ChartType = 'line' | 'bar' | 'area';
type PeriodType = 'week' | 'month' | 'quarter';

const TeamGrowthChart: React.FC<TeamGrowthChartProps> = ({ userId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    growthAnalysis,
    growthAnalysisLoading
  } = useSelector((state: RootState) => state.team);
  
  const [chartType, setChartType] = useState<ChartType>('line');
  const [period, setPeriod] = useState<PeriodType>('month');
  const [activeTab, setActiveTab] = useState<'members' | 'commission'>('members');
  
  // 加载增长分析数据
  useEffect(() => {
    if (userId) {
      dispatch(fetchTeamGrowthAnalysis({ userId, period }));
    }
  }, [userId, period, dispatch]);
  
  // 处理数据格式化
  const formatChartData = () => {
    if (!growthAnalysis) return [];
    
    return growthAnalysis.dailyGrowth.map(item => ({
      date: item.date.substring(5), // 显示月-日格式
      新增人数: item.newMembers,
      总人数: item.totalMembers,
      总收益: item.totalCommission / 1000, // 以千为单位
    }));
  };
  
  // 渲染加载状态
  if (growthAnalysisLoading) {
    return (
      <Card className="growth-chart-card loading">
        <div className="chart-loading">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <p>加载增长数据...</p>
        </div>
      </Card>
    );
  }
  
  if (!growthAnalysis) {
    return (
      <Card className="growth-chart-card">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无增长数据"
        />
      </Card>
    );
  }
  
  const chartData = formatChartData();
  
  return (
    <Card className="growth-chart-card">
      {/* 图表头部 */}
      <div className="chart-header">
        <div className="chart-title">
          <h3>团队增长趋势</h3>
          <div className="chart-summary">
            <div className="summary-item">
              <TeamOutlined style={{ color: '#1890ff', marginRight: 4 }} />
              <span>新增成员: </span>
              <strong>{growthAnalysis.newMembers}人</strong>
            </div>
            <div className="summary-item">
              <RiseOutlined style={{ color: '#52c41a', marginRight: 4 }} />
              <span>增长率: </span>
              <strong>{(growthAnalysis.growthRate * 100).toFixed(1)}%</strong>
            </div>
            <div className="summary-item">
              <DollarOutlined style={{ color: '#fa8c16', marginRight: 4 }} />
              <span>收益增长: </span>
              <strong>{(growthAnalysis.commissionGrowth * 100).toFixed(1)}%</strong>
            </div>
          </div>
        </div>
        
        {/* 图表控制 */}
        <div className="chart-controls">
          <Radio.Group 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="week">本周</Radio.Button>
            <Radio.Button value="month">本月</Radio.Button>
            <Radio.Button value="quarter">本季</Radio.Button>
          </Radio.Group>
          
          <div className="chart-type-selector">
            <Button
              type={chartType === 'line' ? 'primary' : 'default'}
              size="small"
              onClick={() => setChartType('line')}
            >
              折线图
            </Button>
            <Button
              type={chartType === 'bar' ? 'primary' : 'default'}
              size="small"
              onClick={() => setChartType('bar')}
            >
              柱状图
            </Button>
            <Button
              type={chartType === 'area' ? 'primary' : 'default'}
              size="small"
              onClick={() => setChartType('area')}
            >
              面积图
            </Button>
          </div>
        </div>
      </div>
      
      {/* 图表内容 */}
      <div className="chart-content">
        <div className="chart-tabs">
          <Button
            type={activeTab === 'members' ? 'primary' : 'default'}
            size="small"
            onClick={() => setActiveTab('members')}
            icon={<TeamOutlined />}
          >
            成员增长
          </Button>
          <Button
            type={activeTab === 'commission' ? 'primary' : 'default'}
            size="small"
            onClick={() => setActiveTab('commission')}
            icon={<DollarOutlined />}
          >
            收益增长
          </Button>
        </div>
        
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  stroke="#8c8c8c"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#8c8c8c"
                />
                <Tooltip
                  formatter={(value) => [
                    activeTab === 'members' ? `${value}人` : `¥${(Number(value) * 1000).toLocaleString()}`,
                    activeTab === 'members' ? '数量' : '金额'
                  ]}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <Legend />
                {activeTab === 'members' ? (
                  <>
                    <Line
                      type="monotone"
                      dataKey="新增人数"
                      stroke="#1890ff"
                      strokeWidth={2}
                      dot={{ strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="总人数"
                      stroke="#52c41a"
                      strokeWidth={2}
                      dot={{ strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey="总收益"
                    stroke="#fa8c16"
                    strokeWidth={2}
                    dot={{ strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    name="总收益 (千元)"
                  />
                )}
              </LineChart>
            ) : chartType === 'bar' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  stroke="#8c8c8c"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#8c8c8c"
                />
                <Tooltip
                  formatter={(value) => [
                    activeTab === 'members' ? `${value}人` : `¥${(Number(value) * 1000).toLocaleString()}`,
                    activeTab === 'members' ? '数量' : '金额'
                  ]}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <Legend />
                {activeTab === 'members' ? (
                  <>
                    <Bar
                      dataKey="新增人数"
                      fill="#1890ff"
                      name="新增人数"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="总人数"
                      fill="#52c41a"
                      name="总人数"
                      radius={[4, 4, 0, 0]}
                    />
                  </>
                ) : (
                  <Bar
                    dataKey="总收益"
                    fill="#fa8c16"
                    name="总收益 (千元)"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            ) : (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  stroke="#8c8c8c"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#8c8c8c"
                />
                <Tooltip
                  formatter={(value) => [
                    activeTab === 'members' ? `${value}人` : `¥${(Number(value) * 1000).toLocaleString()}`,
                    activeTab === 'members' ? '数量' : '金额'
                  ]}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <Legend />
                {activeTab === 'members' ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="新增人数"
                      stroke="#1890ff"
                      fill="#1890ff"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="总人数"
                      stroke="#52c41a"
                      fill="#52c41a"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </>
                ) : (
                  <Area
                    type="monotone"
                    dataKey="总收益"
                    stroke="#fa8c16"
                    fill="#fa8c16"
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name="总收益 (千元)"
                  />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* 来源分析 */}
      {growthAnalysis.sourceAnalysis && growthAnalysis.sourceAnalysis.length > 0 && (
        <div className="source-analysis">
          <h4>成员来源分析</h4>
          <div className="source-items">
            {growthAnalysis.sourceAnalysis.map((source, index) => (
              <div key={index} className="source-item">
                <div className="source-header">
                  <span className="source-name">{source.source}</span>
                  <span className="source-count">{source.count}人</span>
                </div>
                <div className="source-bar">
                  <div 
                    className="source-bar-fill"
                    style={{ 
                      width: `${source.proportion * 100}%`,
                      backgroundColor: index === 0 ? '#1890ff' : 
                                     index === 1 ? '#52c41a' : 
                                     index === 2 ? '#fa8c16' : '#722ed1'
                    }}
                  />
                </div>
                <div className="source-percentage">
                  {(source.proportion * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default TeamGrowthChart;