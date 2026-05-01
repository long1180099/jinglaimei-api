import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, message, Descriptions, Tag, Divider } from 'antd';
import { useDispatch } from 'react-redux';
import { updateUser } from '@/store/slices/userSlice';
import type { AppDispatch } from '@/store';

const { Option } = Select;
const { TextArea } = Input;

interface LevelChangeModalProps {
  user: any;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LevelChangeModal: React.FC<LevelChangeModalProps> = ({ 
  user, 
  visible, 
  onClose,
  onSuccess 
}) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number>(user.agent_level || 1);
  
  // 代理等级配置
  const levelConfigs: Record<number, {
    name: string;
    description: string;
    benefits: string[];
    requirements: string[];
    commissionRate: string;
    teamCommission: string;
    upgradeTarget: string;
  }> = {
    1: {
      name: '会员',
      description: '平台注册会员，享受零售价格购物',
      benefits: ['零售价格购物', '积分累计', '基础售后支持'],
      requirements: ['手机号注册'],
      commissionRate: '5%',
      teamCommission: '无',
      upgradeTarget: '打版代言人',
    },
    2: {
      name: '打版代言人',
      description: '品牌推广代言人，享受代言人专属价格和佣金',
      benefits: ['代言人折扣价', '销售佣金', '专属推广素材', '基础培训支持'],
      requirements: ['实名认证', '首次充值≥2980元'],
      commissionRate: '10%',
      teamCommission: '无',
      upgradeTarget: '代理商',
    },
    3: {
      name: '代理商',
      description: '正式代理商，享受代理价格和团队佣金',
      benefits: ['代理价格', '销售佣金', '团队佣金5%', '专业培训', '市场支持'],
      requirements: ['团队人数≥5人', '月销售额≥10000元', '持续活跃30天'],
      commissionRate: '12%',
      teamCommission: '5%',
      upgradeTarget: '批发商',
    },
    4: {
      name: '批发商',
      description: '高级批发代理商，享受超低批发价格',
      benefits: ['批发价', '销售佣金', '团队佣金8%', '区域保护', '专属培训', '市场物料支持'],
      requirements: ['团队人数≥20人', '月销售额≥50000元', '首次充值≥39800元'],
      commissionRate: '15%',
      teamCommission: '8%',
      upgradeTarget: '首席分公司',
    },
    5: {
      name: '首席分公司',
      description: '区域首席代理，享受分公司级别权益和分红',
      benefits: ['分公司价', '销售佣金', '团队佣金10%', '区域独家保护', '分红权益', '品牌授权', '高端培训'],
      requirements: ['团队人数≥50人', '月销售额≥200000元', '首次充值≥298000元', '完成高级培训'],
      commissionRate: '18%',
      teamCommission: '10%',
      upgradeTarget: '集团事业部',
    },
    6: {
      name: '集团事业部',
      description: '集团最高级别事业部，享受全方位战略权益',
      benefits: ['事业部底价', '销售佣金', '团队佣金15%', '全国市场保护', '年终分红', '股权激励', '品牌联名', '战略资源支持'],
      requirements: ['团队人数≥200人', '月销售额≥1000000元', '首次充值≥980000元', '董事级别审批'],
      commissionRate: '22%',
      teamCommission: '15%',
      upgradeTarget: '最高级别',
    },
  };
  
  // 当前级别和目标级别信息
  const currentLevel = levelConfigs[user.agent_level as keyof typeof levelConfigs];
  const targetLevel = levelConfigs[selectedLevel as keyof typeof levelConfigs];
  
  // 是否为升级操作
  const isUpgrade = selectedLevel > user.agent_level;
  const isDowngrade = selectedLevel < user.agent_level;
  
  // 初始化表单
  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        new_level: user.agent_level,
        reason_type: 'performance',
        notify_user: true,
      });
      setSelectedLevel(user.agent_level);
    }
  }, [visible, user.agent_level, form]);
  
  // 处理级别变更
  const handleLevelChange = (value: number) => {
    setSelectedLevel(value);
  };
  
  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (values.new_level === user.agent_level) {
        message.warning('请选择不同的代理等级');
        return;
      }
      
      setLoading(true);
      
      await dispatch(updateUser({
        userId: user.id,
        data: { level: values.new_level },
      })).unwrap();
      
      message.success('代理等级修改成功');
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal
      title="修改代理等级"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="确认修改"
      cancelText="取消"
      confirmLoading={loading}
      okButtonProps={{
        type: 'primary',
        danger: isDowngrade,
      }}
      width={700}
    >
      {/* 用户信息 */}
      <div style={{ marginBottom: 24 }}>
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="用户信息">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: '50%', 
                overflow: 'hidden',
                backgroundColor: '#e6f7ff'
              }}>
                <img 
                  src={user.avatar_url || 'https://randomuser.me/api/portraits/lego/1.jpg'} 
                  alt={user.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>
                  {user.username}
                  {user.real_name && ` (${user.real_name})`}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  ID: {user.id} • 手机号: {user.phone}
                </div>
              </div>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="团队信息">
            <div>
              <div>团队成员: {user.member_count || 0}人</div>
              <div>累计收益: ¥{user.total_income.toFixed(2)}</div>
            </div>
          </Descriptions.Item>
        </Descriptions>
      </div>
      
      {/* 等级选择 */}
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          name="new_level"
          label="选择新的代理等级"
          rules={[{ required: true, message: '请选择代理等级' }]}
        >
          <Radio.Group 
            onChange={(e) => handleLevelChange(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {Object.entries(levelConfigs).map(([level, config]) => (
              <Radio key={level} value={parseInt(level)}>
                <div style={{ 
                  padding: 12, 
                  border: `2px solid ${parseInt(level) === selectedLevel ? '#07c160' : '#f0f0f0'}`,
                  borderRadius: 8,
                  backgroundColor: parseInt(level) === selectedLevel ? '#f6ffed' : '#fff',
                  width: '100%'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                        {config.name}
                        {parseInt(level) === user.agent_level && (
                          <Tag color="blue" style={{ marginLeft: 8 }}>当前等级</Tag>
                        )}
                      </div>
                      <div style={{ color: '#666', fontSize: 12 }}>{config.description}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>佣金比例</div>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#07c160' }}>
                        {config.commissionRate}
                      </div>
                    </div>
                  </div>
                </div>
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
        
        {/* 等级对比 */}
        {selectedLevel !== user.agent_level && (
          <div style={{ marginBottom: 24 }}>
            <Divider orientation="left">等级变更对比</Divider>
            <Descriptions 
              bordered 
              size="small" 
              column={2}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="变更类型">
                <Tag color={isUpgrade ? 'success' : 'warning'}>
                  {isUpgrade ? '升级' : '降级'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="变更方向">
                {currentLevel.name} → {targetLevel.name}
              </Descriptions.Item>
              <Descriptions.Item label="佣金变化">
                {currentLevel.commissionRate} → {targetLevel.commissionRate}
              </Descriptions.Item>
              <Descriptions.Item label="团队佣金变化">
                {currentLevel.teamCommission} → {targetLevel.teamCommission}
              </Descriptions.Item>
            </Descriptions>
            
            <div style={{ 
              padding: 12, 
              backgroundColor: isUpgrade ? '#f6ffed' : '#fff7e6', 
              borderRadius: 6,
              fontSize: 12
            }}>
              <strong>{isUpgrade ? '升级优势' : '降级影响'}：</strong>
              {isUpgrade ? (
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                  <li>享受更低的进货价格</li>
                  <li>获得更高的佣金比例</li>
                  <li>增加团队佣金收入</li>
                  <li>获得更多培训和支持资源</li>
                </ul>
              ) : (
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                  <li>进货价格将相应提高</li>
                  <li>佣金比例将降低</li>
                  <li>团队佣金收入可能减少</li>
                  <li>部分高级功能可能受限</li>
                </ul>
              )}
            </div>
          </div>
        )}
        
        {/* 变更原因 */}
        <Form.Item
          name="reason_type"
          label="变更原因类型"
          rules={[{ required: true, message: '请选择变更原因类型' }]}
          initialValue="performance"
        >
          <Select placeholder="请选择变更原因类型">
            <Option value="performance">业绩达标</Option>
            <Option value="request">用户申请</Option>
            <Option value="promotion">促销活动</Option>
            <Option value="adjustment">系统调整</Option>
            <Option value="violation">违规降级</Option>
            <Option value="other">其他原因</Option>
          </Select>
        </Form.Item>
        
        <Form.Item
          name="reason"
          label="详细原因说明"
          rules={[
            { required: true, message: '请输入详细原因说明' },
            { min: 10, message: '原因说明至少10个字符' },
            { max: 500, message: '原因说明最多500个字符' },
          ]}
        >
          <TextArea
            placeholder="请详细说明等级变更的原因..."
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>
        
        {/* 生效时间 */}
        <Form.Item
          name="effective_time"
          label="生效时间"
          initialValue="immediate"
        >
          <Radio.Group>
            <Radio value="immediate">立即生效</Radio>
            <Radio value="next_month">次月生效</Radio>
            <Radio value="custom">自定义时间</Radio>
          </Radio.Group>
        </Form.Item>
        
        {/* 是否通知用户 */}
        <Form.Item
          name="notify_user"
          label="是否通知用户"
          initialValue={true}
        >
          <Radio.Group>
            <Radio value={true}>发送等级变更通知</Radio>
            <Radio value={false}>暂不通知</Radio>
          </Radio.Group>
        </Form.Item>
        
        {/* 内部备注 */}
        <Form.Item
          name="internal_notes"
          label="内部备注"
        >
          <TextArea
            placeholder="可填写内部备注信息，用户不可见"
            rows={2}
            maxLength={200}
            showCount
          />
        </Form.Item>
      </Form>
      
      {/* 注意事项 */}
      <div style={{ 
        padding: 12, 
        backgroundColor: '#fff1f0', 
        borderRadius: 6,
        marginTop: 16,
        fontSize: 12,
        color: '#ff4d4f'
      }}>
        <strong>重要提示：</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
          <li>等级变更将影响用户的进货价格和佣金比例</li>
          <li>变更操作不可逆，请谨慎确认</li>
          <li>变更记录将保存在操作日志中</li>
          <li>如选择发送通知，系统将自动向用户发送等级变更通知</li>
          <li>降级操作可能会影响用户积极性，请提前沟通</li>
        </ul>
      </div>
    </Modal>
  );
};

export default LevelChangeModal;