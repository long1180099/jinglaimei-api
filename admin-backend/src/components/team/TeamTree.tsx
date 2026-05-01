/**
 * 团队树形结构组件
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { 
  fetchTeamTree, 
  toggleNodeExpanded,
  selectMember 
} from '../../store/slices/teamSlice';
import { TeamTreeNode } from '../../types/team';
import { AgentLevel } from '../../types/commission';
import {
  Avatar,
  Button,
  Card,
  Space,
  Tag,
  Tooltip,
  Spin,
  Empty,
  Collapse
} from 'antd';
import {
  TeamOutlined,
  CrownOutlined,
  StarOutlined,
  TrophyOutlined,
  ArrowDownOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  MinusOutlined,
  EyeOutlined,
  PhoneOutlined,
  MessageOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import './TeamTree.css';

const { Panel } = Collapse;

// 等级颜色映射
const levelColors: Record<string, string> = {
  '1': '#8c8c8c',        // 会员 - 灰色
  '2': '#52c41a',        // 打版代言人 - 绿色
  '3': '#1890ff',        // 代理商 - 蓝色
  '4': '#fa8c16',        // 批发商 - 橙色
  '5': '#f5222d',        // 首席分公司 - 红色
  '6': '#722ed1',        // 集团事业部 - 紫色
};

// 等级图标映射
const levelIcons: Record<string, React.ReactNode> = {
  '1': <TeamOutlined />,
  '2': <StarOutlined />,
  '3': <TrophyOutlined />,
  '4': <CrownOutlined />,
  '5': <CrownOutlined style={{ color: '#f5222d' }} />,
  '6': <CrownOutlined style={{ color: '#722ed1' }} />,
};

interface TeamTreeProps {
  maxDepth?: number;
  showStats?: boolean;
  collapsible?: boolean;
}

const TeamTree: React.FC<TeamTreeProps> = ({
  maxDepth = 3,
  showStats = true,
  collapsible = true
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    teamTree,
    teamTreeLoading,
    expandedNodeIds,
    selectedMemberIds
  } = useSelector((state: RootState) => state.team);
  
  const { currentUser } = useSelector((state: RootState) => state.user);
  
  const [localExpandedIds, setLocalExpandedIds] = useState<string[]>(['member1001']);
  
  // 初始化加载团队树
  useEffect(() => {
    if (currentUser && !teamTree) {
      dispatch(fetchTeamTree(currentUser.id));
    }
  }, [currentUser, teamTree, dispatch]);
  
  // 同步展开状态
  useEffect(() => {
    if (expandedNodeIds.length > 0) {
      setLocalExpandedIds(expandedNodeIds);
    }
  }, [expandedNodeIds]);
  
  // 切换节点展开状态
  const handleToggleNode = (nodeId: string) => {
    dispatch(toggleNodeExpanded(nodeId));
  };
  
  // 展开所有节点
  const handleExpandAll = () => {
    if (!teamTree) return;
    
    const allNodeIds: string[] = [];
    const collectNodeIds = (node: TeamTreeNode) => {
      allNodeIds.push(node.id);
      if (node.children && node.children.length > 0) {
        node.children.forEach(collectNodeIds);
      }
    };
    
    collectNodeIds(teamTree);
    setLocalExpandedIds(allNodeIds);
    // 注意：这里只更新本地状态，实际应该dispatch到redux
  };
  
  // 折叠所有节点
  const handleCollapseAll = () => {
    if (!teamTree) return;
    setLocalExpandedIds(['member1001']); // 只保留根节点展开
  };
  
  // 查看成员详情
  const handleViewMember = (member: TeamTreeNode) => {
    dispatch(selectMember(member.id));
    // 这里应该打开成员详情模态框，但这个逻辑在父组件处理
  };
  
  // 渲染树节点
  const renderTreeNode = (node: TeamTreeNode, depth: number = 0) => {
    if (depth > maxDepth) return null;
    
    const isExpanded = localExpandedIds.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedMemberIds.includes(node.id);
    
    // 计算缩进
    const indentSize = depth * 24;
    
    return (
      <div key={node.id} className="tree-node-wrapper">
        {/* 节点自身 */}
        <div 
          className={`tree-node ${isSelected ? 'selected' : ''}`}
          style={{ marginLeft: indentSize }}
          onClick={() => handleViewMember(node)}
        >
          {/* 展开/折叠按钮 */}
          {hasChildren && collapsible && (
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <MinusOutlined /> : <PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleNode(node.id);
              }}
              className="expand-button"
            />
          )}
          
          {/* 占位符（用于没有子节点的节点） */}
          {!hasChildren && collapsible && (
            <div style={{ width: 24 }} />
          )}
          
          {/* 节点内容 */}
          <div className="node-content">
            {/* 头像和基本信息 */}
            <div className="node-info">
              <Space>
                <Avatar 
                  src={node.avatar} 
                  size="default"
                  style={{ backgroundColor: levelColors[node.level] }}
                >
                  {node.username.charAt(0)}
                </Avatar>
                
                <div>
                  <div className="node-name">
                    <span style={{ marginRight: 8 }}>{node.username}</span>
                    <Tag 
                      color={levelColors[node.level]}
                      icon={levelIcons[node.level]}
                      style={{ fontSize: '11px', padding: '0 6px' }}
                    >
                      {node.levelLabel}
                    </Tag>
                  </div>
                  
                  <div className="node-meta">
                    <span className="node-phone">
                      <PhoneOutlined style={{ fontSize: 10 }} />
                      {node.phone}
                    </span>
                    <span>团队: {node.teamSize}人</span>
                    <span>加入: {new Date(node.joinTime).toLocaleDateString()}</span>
                  </div>
                </div>
              </Space>
            </div>
            
            {/* 统计信息 */}
            {showStats && (
              <div className="node-stats">
                <Tooltip title="累计收益">
                  <div className="stat-item total">
                    <span className="stat-label">累计:</span>
                    <span className="stat-value">¥{node.totalCommission.toFixed(2)}</span>
                  </div>
                </Tooltip>
                
                <Tooltip title="本月收益">
                  <div className="stat-item month">
                    <span className="stat-label">本月:</span>
                    <span className="stat-value">¥{node.monthCommission.toFixed(2)}</span>
                  </div>
                </Tooltip>
                
                <Tooltip title="今日收益">
                  <div className="stat-item day">
                    <span className="stat-label">今日:</span>
                    <span className="stat-value">¥{node.dayCommission.toFixed(2)}</span>
                  </div>
                </Tooltip>
              </div>
            )}
            
            {/* 操作按钮 */}
            <div className="node-actions">
              <Tooltip title="查看详情">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewMember(node);
                  }}
                />
              </Tooltip>
              
              <Tooltip title="发送消息">
                <Button
                  type="text"
                  size="small"
                  icon={<MessageOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 发送消息逻辑
                  }}
                />
              </Tooltip>
              
              <Tooltip title="拨打电话">
                <Button
                  type="text"
                  size="small"
                  icon={<PhoneOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    // 拨打电话逻辑
                  }}
                />
              </Tooltip>
            </div>
          </div>
        </div>
        
        {/* 子节点 */}
        {isExpanded && hasChildren && (
          <div className="children-container">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  // 渲染树形结构
  const renderTree = () => {
    if (!teamTree) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无团队数据"
        />
      );
    }
    
    return (
      <div className="team-tree">
        {/* 树控制栏 */}
        <div className="tree-controls">
          <Space>
            <Button 
              size="small" 
              icon={<PlusOutlined />}
              onClick={handleExpandAll}
            >
              展开全部
            </Button>
            <Button 
              size="small" 
              icon={<MinusOutlined />}
              onClick={handleCollapseAll}
            >
              折叠全部
            </Button>
          </Space>
          
          {/* 等级图例 */}
          <div className="tree-legend">
            <span style={{ marginRight: 8 }}>等级:</span>
            {Object.entries(levelColors).map(([level, color]) => (
              <Tooltip 
                key={level} 
                title={level === '1' ? '会员' : 
                       level === '2' ? '打版代言人' : 
                       level === '3' ? '代理商' : 
                       level === '4' ? '批发商' : 
                       level === '5' ? '首席分公司' : '集团事业部'}
              >
                <div 
                  className="legend-item"
                  style={{ backgroundColor: color }}
                />
              </Tooltip>
            ))}
          </div>
        </div>
        
        {/* 树内容 */}
        <div className="tree-content">
          {renderTreeNode(teamTree)}
        </div>
      </div>
    );
  };
  
  // 渲染加载状态
  if (teamTreeLoading) {
    return (
      <div className="team-tree-container loading">
        <Spin 
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
          tip="加载团队树..."
        />
      </div>
    );
  }
  
  return (
    <Card className="team-tree-container">
      {renderTree()}
    </Card>
  );
};

export default TeamTree;