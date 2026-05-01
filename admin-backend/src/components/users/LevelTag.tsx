import React from 'react';
import { Tag } from 'antd';
import { AgentLevel } from '../../types/commission';

interface LevelTagProps {
  level: AgentLevel | string | number;
  label?: string;
}

const levelColorMap: Record<string, string> = {
  '0': 'default',
  '1': 'default',
  '2': 'green',
  '3': 'blue',
  '4': 'orange',
  '5': 'red',
  '6': 'purple',
};

const levelLabelMap: Record<string, string> = {
  '0': '游客',
  '1': '会员',
  '2': '打版代言人',
  '3': '代理商',
  '4': '批发商',
  '5': '首席分公司',
  '6': '集团事业部',
};

export const LevelTag: React.FC<LevelTagProps> = ({ level, label }) => {
  const key = String(level);
  const color = levelColorMap[key] || 'default';
  const displayLabel = label || levelLabelMap[key] || `等级${key}`;
  return <Tag color={color}>{displayLabel}</Tag>;
};

export default LevelTag;
