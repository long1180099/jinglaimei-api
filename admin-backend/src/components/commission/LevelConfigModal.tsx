/**
 * 等级配置模态框组件
 */

import React, { useState } from 'react';
import { Modal, Form, InputNumber, Input, Button, Row, Col, Card, Table, Tag, ColorPicker, message, Space } from 'antd';
import { SettingOutlined, EditOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { updateLevelConfig } from '../../store/slices/commissionSlice';
import { AgentLevel } from '../../types/commission';

interface LevelConfigModalProps {
  visible: boolean;
  onCancel: () => void;
  levelConfigs: Record<string, any>;
}

interface LevelConfigFormData {
  name: string;
  discount: number;           // 折扣比例 (0-1)
  rechargeThreshold: number;  // 首次充值门槛
  cargoValue: number;         // 配送货值
  color: string;              // UI颜色
}

const LevelConfigModal: React.FC<LevelConfigModalProps> = ({
  visible,
  onCancel,
  levelConfigs
}) => {
  const [editingLevel, setEditingLevel] = useState<AgentLevel | null>(null);
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  
  // 开始编辑等级
  const handleEditLevel = (level: AgentLevel) => {
    const config = levelConfigs[level];
    if (config) {
      form.setFieldsValue({
        ...config,
        discount: config.discount * 100 // 转换为百分比
      });
      setEditingLevel(level);
    }
  };
  
  // 保存等级配置
  const handleSaveLevel = async () => {
    try {
      if (!editingLevel) return;
      
      const values = await form.validateFields();
      
      // 处理表单数据
      const configData = {
        discount: values.discount / 100, // 转换回小数
        rechargeThreshold: values.rechargeThreshold,
        cargoValue: values.cargoValue,
        color: values.color
      };
      
      await dispatch(updateLevelConfig({ level: editingLevel, config: configData })).unwrap();
      message.success(`${levelConfigs[editingLevel].name}配置更新成功`);
      setEditingLevel(null);
      form.resetFields();
    } catch (error) {
      console.error('保存等级配置失败:', error);
      message.error('保存等级配置失败');
    }
  };
  
  // 取消编辑
  const handleCancelEdit = () => {
    setEditingLevel(null);
    form.resetFields();
  };
  
  // 获取等级名称
  const getLevelName = (level: AgentLevel) => {
    const config = levelConfigs[level];
    return config?.name || `等级${level}`;
  };
  
  // 表格列定义
  const columns = [
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: AgentLevel) => {
        const config = levelConfigs[level];
        return (
          <Tag color={config?.color} style={{ fontSize: '14px', padding: '4px 8px' }}>
            {config?.name}
          </Tag>
        );
      }
    },
    {
      title: '折扣',
      dataIndex: 'discount',
      key: 'discount',
      render: (discount: number) => `${(discount * 100).toFixed(0)}%`
    },
    {
      title: '充值门槛',
      dataIndex: 'rechargeThreshold',
      key: 'rechargeThreshold',
      render: (value: number) => value > 0 ? `¥${value.toLocaleString()}` : '无门槛'
    },
    {
      title: '配送货值',
      dataIndex: 'cargoValue',
      key: 'cargoValue',
      render: (value: number) => value > 0 ? `¥${value.toLocaleString()}` : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button 
          type="link" 
          size="small" 
          icon={<EditOutlined />}
          onClick={() => handleEditLevel(record.level)}
        >
          编辑
        </Button>
      )
    }
  ];
  
  // 表格数据
  const tableData = Object.values(levelConfigs).map(config => ({
    ...config,
    key: config.level
  }));
  
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SettingOutlined style={{ marginRight: 8 }} />
          代理商等级配置
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          关闭
        </Button>
      ]}
      destroyOnClose
    >
      <Row gutter={[24, 24]}>
        {/* 等级列表表格 */}
        <Col span={editingLevel ? 12 : 24}>
          <Card size="small" title="等级列表">
            <Table
              dataSource={tableData}
              columns={columns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        
        {/* 编辑表单 */}
        {editingLevel && (
          <Col span={12}>
            <Card 
              size="small" 
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <EditOutlined style={{ marginRight: 8 }} />
                  编辑等级配置：{getLevelName(editingLevel)}
                </div>
              }
              extra={
                <Space>
                  <Button size="small" onClick={handleCancelEdit}>
                    取消
                  </Button>
                  <Button 
                    type="primary" 
                    size="small" 
                    icon={<SaveOutlined />}
                    onClick={handleSaveLevel}
                  >
                    保存
                  </Button>
                </Space>
              }
            >
              <Form
                form={form}
                layout="vertical"
              >
                <Form.Item
                  name="name"
                  label="等级名称"
                  rules={[{ required: true, message: '请输入等级名称' }]}
                >
                  <Input disabled placeholder="例如：代理商" />
                </Form.Item>
                
                <Form.Item
                  name="discount"
                  label="折扣比例"
                  rules={[
                    { required: true, message: '请输入折扣比例' },
                    { type: 'number', min: 0, max: 100, message: '比例必须在0-100之间' }
                  ]}
                  help="相对于零售价的折扣，如50%表示零售价×50%"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="50"
                    suffix="%"
                    min={0}
                    max={100}
                    precision={1}
                  />
                </Form.Item>
                
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      name="rechargeThreshold"
                      label="首次充值门槛"
                      rules={[{ type: 'number', min: 0, message: '金额必须大于等于0' }]}
                      help="达到此金额可升级到此等级"
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="9800"
                        prefix="¥"
                        min={0}
                        precision={2}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="cargoValue"
                      label="配送货值"
                      rules={[{ type: 'number', min: 0, message: '金额必须大于等于0' }]}
                      help="升级时赠送的货值"
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="10200"
                        prefix="¥"
                        min={0}
                        precision={2}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item
                  name="color"
                  label="等级颜色"
                  rules={[{ required: true, message: '请选择等级颜色' }]}
                  help="用于UI显示的颜色标识"
                >
                  <ColorPicker
                    showText
                    format="hex"
                  />
                </Form.Item>
                
                <div style={{ 
                  backgroundColor: '#f6ffed', 
                  border: '1px solid #b7eb8f',
                  borderRadius: 4,
                  padding: 12,
                  marginTop: 16
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>配置说明：</div>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', lineHeight: 1.6 }}>
                    <div>• 折扣比例：用户拿货价 = 零售价 × 折扣比例</div>
                    <div>• 充值门槛：用户首次充值达到此金额可升级到此等级</div>
                    <div>• 配送货值：升级时系统自动赠送的货品价值</div>
                    <div>• 等级颜色：在团队树、用户列表等界面显示的颜色标识</div>
                  </div>
                </div>
              </Form>
            </Card>
          </Col>
        )}
      </Row>
      
      <div style={{ marginTop: 24 }}>
        <Card size="small" title="等级体系说明">
          <div style={{ fontSize: '13px', lineHeight: 1.7 }}>
            <div><strong>静莱美代理商等级体系：</strong></div>
            <div>1. <Tag color="#8c8c8c">会员</Tag> - 无折扣，可发展下级，基本无利润空间</div>
            <div>2. <Tag color="#52c41a">打版代言人</Tag> - 50%折扣，充值¥2980送¥1500货</div>
            <div>3. <Tag color="#1890ff">代理商</Tag> - 50%折扣，充值¥9800升级</div>
            <div>4. <Tag color="#fa8c16">批发商</Tag> - 32%折扣，充值¥39800送¥10200货</div>
            <div>5. <Tag color="#f5222d">首席分公司</Tag> - 23%折扣，充值¥298000送¥150000货</div>
          </div>
          
          <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 12, lineHeight: 1.6 }}>
            <div><strong>分润规则关联：</strong></div>
            <div>• 等级差决定分润类型和金额</div>
            <div>• 不同等级拿货价不同，形成级差利润</div>
            <div>• 平级情况（相同等级）可能产生平级奖励</div>
            <div>• 等级变更会影响后续所有订单的分润计算</div>
          </div>
        </Card>
      </div>
    </Modal>
  );
};

export default LevelConfigModal;