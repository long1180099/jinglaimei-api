/**
 * 分润计算器模态框组件
 */

import React, { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, Row, Col, Card, Tag, Statistic, Alert, Space } from 'antd';
import { CalculatorOutlined, UserOutlined, ShoppingOutlined, PercentageOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { calculateCommission, clearCalculationResult } from '../../store/slices/commissionSlice';
import { CommissionCalculationParams, CommissionType, AgentLevel } from '../../types/commission';

const { Option } = Select;

interface CommissionCalculatorModalProps {
  visible: boolean;
  onCancel: () => void;
}

const CommissionCalculatorModal: React.FC<CommissionCalculatorModalProps> = ({
  visible,
  onCancel
}) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const { calculationResult, loading, levelConfigs } = useSelector((state: RootState) => state.commission);
  
  const [calculationParams, setCalculationParams] = useState<CommissionCalculationParams | null>(null);
  
  // 获取等级名称
  const getLevelName = (level: AgentLevel) => {
    const config = levelConfigs[level];
    return config?.name || `等级${level}`;
  };
  
  // 获取等级颜色
  const getLevelColor = (level: AgentLevel) => {
    const config = levelConfigs[level];
    return config?.color || '#8c8c8c';
  };
  
  // 处理计算
  const handleCalculate = async () => {
    try {
      const values = await form.validateFields();
      
      const params: CommissionCalculationParams = {
        orderId: `calc_${Date.now()}`,
        userId: values.userId,
        parentId: values.parentId,
        userLevel: values.userLevel,
        userPrice: values.userPrice,
        parentLevel: values.parentLevel,
        parentPrice: values.parentPrice,
        orderAmount: values.orderAmount,
        quantity: values.quantity,
        isFirstOrder: values.isFirstOrder,
        firstRechargeAmount: values.firstRechargeAmount || 0
      };
      
      setCalculationParams(params);
      dispatch(calculateCommission(params));
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };
  
  // 重置表单
  const handleReset = () => {
    form.resetFields();
    dispatch(clearCalculationResult());
    setCalculationParams(null);
  };
  
  // 关闭模态框
  const handleClose = () => {
    handleReset();
    onCancel();
  };
  
  // 获取分润类型名称
  const getCommissionTypeName = (type: CommissionType) => {
    const typeNames = {
      [CommissionType.LEVEL_DIFF]: '级差利润',
      [CommissionType.PEER_BONUS]: '平级奖励',
      [CommissionType.UPGRADE_BONUS]: '升级奖励'
    };
    return typeNames[type] || type;
  };
  
  // 获取分润类型颜色
  const getCommissionTypeColor = (type: CommissionType) => {
    switch (type) {
      case CommissionType.LEVEL_DIFF:
        return 'blue';
      case CommissionType.PEER_BONUS:
        return 'green';
      case CommissionType.UPGRADE_BONUS:
        return 'orange';
      default:
        return 'default';
    }
  };
  
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <CalculatorOutlined style={{ marginRight: 8 }} />
          分润计算器
        </div>
      }
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={null}
      destroyOnClose
    >
      <Row gutter={[24, 24]}>
        {/* 输入表单 */}
        <Col span={12}>
          <Card size="small" title="计算参数">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                userLevel: AgentLevel.MEMBER,
                parentLevel: AgentLevel.MODEL_AGENT,
                userPrice: 100,
                parentPrice: 50,
                orderAmount: 1000,
                quantity: 10,
                isFirstOrder: false,
                firstRechargeAmount: 2980
              }}
            >
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="userId"
                    label="下单用户ID"
                    rules={[{ required: true, message: '请输入下单用户ID' }]}
                  >
                    <Input placeholder="user_001" prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="parentId"
                    label="上级用户ID"
                    rules={[{ required: true, message: '请输入上级用户ID' }]}
                  >
                    <Input placeholder="user_101" prefix={<UserOutlined />} />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="userLevel"
                    label="下单用户等级"
                    rules={[{ required: true, message: '请选择等级' }]}
                  >
                    <Select>
                      {Object.values(levelConfigs).map(config => (
                        <Option key={config.level} value={config.level}>
                          <Tag color={config.color}>{config.name}</Tag>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="parentLevel"
                    label="上级用户等级"
                    rules={[{ required: true, message: '请选择等级' }]}
                  >
                    <Select>
                      {Object.values(levelConfigs).map(config => (
                        <Option key={config.level} value={config.level}>
                          <Tag color={config.color}>{config.name}</Tag>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="userPrice"
                    label="下单用户拿货价"
                    rules={[{ required: true, message: '请输入拿货价', type: 'number', min: 0 }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }}
                      placeholder="100.00"
                      prefix="¥"
                      min={0}
                      precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="parentPrice"
                    label="上级用户拿货价"
                    rules={[{ required: true, message: '请输入拿货价', type: 'number', min: 0 }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }}
                      placeholder="50.00"
                      prefix="¥"
                      min={0}
                      precision={2}
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="orderAmount"
                    label="订单金额"
                    rules={[{ required: true, message: '请输入订单金额', type: 'number', min: 0 }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }}
                      placeholder="1000.00"
                      prefix="¥"
                      min={0}
                      precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="quantity"
                    label="商品数量"
                    rules={[{ required: true, message: '请输入商品数量', type: 'number', min: 1 }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }}
                      placeholder="10"
                      min={1}
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="firstRechargeAmount"
                    label="首次充值金额"
                    rules={[{ type: 'number', min: 0 }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }}
                      placeholder="2980.00"
                      prefix="¥"
                      min={0}
                      precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="isFirstOrder"
                    label="是否首单"
                    valuePropName="checked"
                  >
                    <Select>
                      <Option value={false}>否</Option>
                      <Option value={true}>是</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<CalculatorOutlined />} 
                    onClick={handleCalculate}
                    loading={loading}
                  >
                    计算分润
                  </Button>
                  <Button onClick={handleReset}>
                    重置
                  </Button>
                </Space>
              </div>
            </Form>
          </Card>
        </Col>
        
        {/* 计算结果 */}
        <Col span={12}>
          <Card size="small" title="计算结果">
            {calculationResult ? (
              <div>
                {calculationResult.success ? (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                      <Statistic
                        title="分润金额"
                        value={calculationResult.commissionAmount}
                        precision={2}
                        prefix="¥"
                        valueStyle={{ 
                          fontSize: '32px', 
                          color: '#52c41a',
                          fontWeight: 'bold'
                        }}
                      />
                    </div>
                    
                    <div style={{ marginBottom: 16 }}>
                      <Tag color={getCommissionTypeColor(calculationResult.commissionType)} style={{ fontSize: '14px', padding: '4px 8px' }}>
                        {getCommissionTypeName(calculationResult.commissionType)}
                      </Tag>
                      <span style={{ marginLeft: 8 }}>分润比例: {calculationResult.commissionRate.toFixed(1)}%</span>
                    </div>
                    
                    <Alert
                      message="计算说明"
                      description={calculationResult.description}
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    
                    {calculationParams && (
                      <Card size="small" title="计算详情" style={{ marginTop: 16 }}>
                        <Row gutter={[8, 8]}>
                          <Col span={12}>
                            <div>下单用户等级:</div>
                            <Tag color={getLevelColor(calculationParams.userLevel)}>
                              {getLevelName(calculationParams.userLevel)}
                            </Tag>
                          </Col>
                          <Col span={12}>
                            <div>上级用户等级:</div>
                            <Tag color={getLevelColor(calculationParams.parentLevel)}>
                              {getLevelName(calculationParams.parentLevel)}
                            </Tag>
                          </Col>
                          <Col span={12}>
                            <div>下单用户拿货价: ¥{calculationParams.userPrice.toFixed(2)}</div>
                          </Col>
                          <Col span={12}>
                            <div>上级用户拿货价: ¥{calculationParams.parentPrice.toFixed(2)}</div>
                          </Col>
                          <Col span={12}>
                            <div>订单金额: ¥{calculationParams.orderAmount.toFixed(2)}</div>
                          </Col>
                          <Col span={12}>
                            <div>商品数量: {calculationParams.quantity}件</div>
                          </Col>
                          {calculationParams.isFirstOrder && (
                            <Col span={24}>
                              <div>首次充值金额: ¥{calculationParams.firstRechargeAmount.toFixed(2)}</div>
                            </Col>
                          )}
                        </Row>
                      </Card>
                    )}
                    
                    {calculationResult.calculationDetails && (
                      <Card size="small" title="算法详情" style={{ marginTop: 16 }}>
                        <div style={{ fontSize: '12px', color: '#8c8c8c', lineHeight: 1.6 }}>
                          {calculationResult.calculationDetails.profitOwnerFound ? (
                            <>
                              <div>✓ 找到收益归属人: 等级{calculationResult.calculationDetails.profitOwnerLevel}</div>
                              {calculationResult.calculationDetails.levelDiff !== undefined && (
                                <div>✓ 级差计算: ¥{calculationResult.calculationDetails.parentPrice.toFixed(2)} - ¥{calculationResult.calculationDetails.userPrice.toFixed(2)} = ¥{calculationResult.calculationDetails.levelDiff.toFixed(2)}</div>
                              )}
                              {calculationResult.calculationDetails.peerBonusRate !== undefined && (
                                <div>✓ 平级奖励: 首次充值¥{calculationResult.calculationDetails.firstRechargeAmount} × {calculationResult.calculationDetails.peerBonusRate * 100}%</div>
                              )}
                            </>
                          ) : (
                            <div>✗ 未找到符合条件的收益归属人</div>
                          )}
                        </div>
                      </Card>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Alert
                      message="无分润产生"
                      description="根据分润规则，当前条件下无分润产生。可能原因：平级非首单、上级等级低于下级、首次充值金额为0等。"
                      type="warning"
                      showIcon
                    />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                color: '#8c8c8c'
              }}>
                <ShoppingOutlined style={{ fontSize: '48px', marginBottom: 16, color: '#d9d9d9' }} />
                <div>填写参数并点击"计算分润"查看结果</div>
                <div style={{ fontSize: '12px', marginTop: 8 }}>
                  支持级差利润、平级奖励、升级奖励等多种分润类型计算
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
      
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Alert
          message="分润规则说明"
          description={
            <div>
              <div>1. 级差利润：上级等级高于下级时，上级获得(上级拿货价-下级拿货价)×数量的利润</div>
              <div>2. 平级奖励：上级等级等于下级，且为首单时，上级获得下级首次充值金额的20%作为奖励</div>
              <div>3. 无分润：上级等级低于下级，或平级非首单，或无首次充值金额</div>
            </div>
          }
          type="info"
          showIcon
        />
      </div>
    </Modal>
  );
};

export default CommissionCalculatorModal;