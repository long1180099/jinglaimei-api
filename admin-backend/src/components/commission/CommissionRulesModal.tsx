/**
 * 分润规则配置模态框
 */

import React from 'react';
import { Modal, Form, InputNumber, Switch, Button, Row, Col, Card, Alert, message } from 'antd';
import { SettingOutlined, PercentageOutlined, MoneyCollectOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { updateCommissionRules } from '../../store/slices/commissionSlice';

interface CommissionRulesModalProps {
  visible: boolean;
  onCancel: () => void;
  initialRules: any;
}

const CommissionRulesModal: React.FC<CommissionRulesModalProps> = ({
  visible,
  onCancel,
  initialRules
}) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  
  // 表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 将百分比转换为小数
      const processedValues = {
        ...values,
        peerBonusRate: values.peerBonusRate / 100,
        taxRate: values.taxRate / 100
      };
      
      await dispatch(updateCommissionRules(processedValues)).unwrap();
      message.success('分润规则更新成功');
      onCancel();
    } catch (error) {
      console.error('更新分润规则失败:', error);
      message.error('更新分润规则失败');
    }
  };
  
  // 初始化表单值
  React.useEffect(() => {
    if (initialRules && visible) {
      form.setFieldsValue({
        ...initialRules,
        peerBonusRate: initialRules.peerBonusRate * 100,
        taxRate: initialRules.taxRate * 100
      });
    }
  }, [initialRules, visible, form]);
  
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SettingOutlined style={{ marginRight: 8 }} />
          分润规则配置
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          保存配置
        </Button>
      ]}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          peerBonusRate: 20,
          autoUpgradeEnabled: true,
          commissionSettlementDelay: 7,
          minWithdrawalAmount: 100,
          maxDailyWithdrawal: 50000,
          taxRate: 6
        }}
      >
        <Row gutter={[16, 16]}>
          {/* 平级奖励配置 */}
          <Col span={24}>
            <Card size="small" title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <PercentageOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                <span>平级奖励配置</span>
              </div>
            }>
              <Form.Item
                name="peerBonusRate"
                label="平级奖励比例"
                rules={[
                  { required: true, message: '请输入平级奖励比例' },
                  { type: 'number', min: 0, max: 100, message: '比例必须在0-100之间' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  suffix="%"
                  min={0}
                  max={100}
                  precision={1}
                />
              </Form.Item>
              
              <Alert
                message="平级奖励规则"
                description="当下级用户首单下单时，如果直接上级与下级等级相同，则上级获得下级首次充值金额的指定比例作为奖励。仅首单有效，后续订单不再发放平级奖励。"
                type="info"
                showIcon
                style={{ marginTop: 12 }}
              />
            </Card>
          </Col>
          
          {/* 自动升级配置 */}
          <Col span={24}>
            <Card size="small" title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <MoneyCollectOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                <span>自动升级配置</span>
              </div>
            }>
              <Form.Item
                name="autoUpgradeEnabled"
                label="自动升级开关"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren="开启" 
                  unCheckedChildren="关闭" 
                />
              </Form.Item>
              
              <Alert
                message="自动升级规则"
                description="用户累计进货额达到下一等级门槛时，系统自动升级用户等级。升级后用户享受新的拿货价优惠，并影响后续订单的分润计算。"
                type="info"
                showIcon
                style={{ marginTop: 12 }}
              />
            </Card>
          </Col>
          
          {/* 分润结算配置 */}
          <Col span={12}>
            <Card size="small" title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <ClockCircleOutlined style={{ marginRight: 8, color: '#722ed1' }} />
                <span>结算配置</span>
              </div>
            }>
              <Form.Item
                name="commissionSettlementDelay"
                label="分润结算延迟"
                rules={[
                  { required: true, message: '请输入结算延迟天数' },
                  { type: 'number', min: 0, max: 30, message: '延迟天数必须在0-30之间' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="7"
                  suffix="天"
                  min={0}
                  max={30}
                />
              </Form.Item>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card size="small" title="税率配置">
              <Form.Item
                name="taxRate"
                label="分润税率"
                rules={[
                  { required: true, message: '请输入税率' },
                  { type: 'number', min: 0, max: 100, message: '税率必须在0-100之间' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="6"
                  suffix="%"
                  min={0}
                  max={100}
                  precision={1}
                />
              </Form.Item>
            </Card>
          </Col>
          
          {/* 提现配置 */}
          <Col span={12}>
            <Card size="small" title="提现配置">
              <Form.Item
                name="minWithdrawalAmount"
                label="最小提现金额"
                rules={[
                  { required: true, message: '请输入最小提现金额' },
                  { type: 'number', min: 0, message: '金额必须大于等于0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="100"
                  prefix="¥"
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card size="small" title="提现限额">
              <Form.Item
                name="maxDailyWithdrawal"
                label="单日最大提现"
                rules={[
                  { required: true, message: '请输入单日最大提现金额' },
                  { type: 'number', min: 0, message: '金额必须大于等于0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="50000"
                  prefix="¥"
                  min={0}
                  precision={2}
                />
              </Form.Item>
            </Card>
          </Col>
        </Row>
        
        <div style={{ marginTop: 24 }}>
          <Alert
            message="配置生效说明"
            description="分润规则配置保存后，新产生的订单将按照新规则计算分润。历史订单的分润不会受到影响。平级奖励比例、税率等关键配置变更需要谨慎操作。"
            type="warning"
            showIcon
          />
        </div>
      </Form>
    </Modal>
  );
};

export default CommissionRulesModal;