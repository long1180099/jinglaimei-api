import React, { useState } from 'react';
import { Modal, Form, Input, Select, Radio, message } from 'antd';
import { useDispatch } from 'react-redux';
import { changeUserStatus } from '@/store/slices/userSlice';
import type { AppDispatch } from '@/store';

const { Option } = Select;
const { TextArea } = Input;

interface StatusChangeModalProps {
  user: any;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const StatusChangeModal: React.FC<StatusChangeModalProps> = ({ 
  user, 
  visible, 
  onClose,
  onSuccess 
}) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  
  // 状态映射
  const statusMap = {
    0: '已禁用',
    1: '正常',
    2: '审核中',
  };
  
  // 获取当前状态和对应操作
  const getCurrentStatusInfo = () => {
    const currentStatus = statusMap[user.status as keyof typeof statusMap];
    let targetStatus = user.status === 1 ? 0 : 1;
    let targetStatusText = user.status === 1 ? '禁用' : '启用';
    let modalTitle = user.status === 1 ? '禁用账户' : '启用账户';
    
    return {
      currentStatus,
      targetStatus,
      targetStatusText,
      modalTitle,
    };
  };
  
  const { currentStatus, targetStatus, targetStatusText, modalTitle } = getCurrentStatusInfo();
  
  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      await dispatch(changeUserStatus({ userId: user.id, status: Boolean(targetStatus) }));
      
      message.success(`账户${targetStatusText}成功`);
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
      title={modalTitle}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={targetStatusText}
      cancelText="取消"
      confirmLoading={loading}
      okButtonProps={{
        danger: user.status === 1, // 禁用操作显示为危险按钮
        type: user.status === 1 ? 'primary' : 'primary',
      }}
      width={500}
    >
      <div style={{ marginBottom: 24 }}>
        <p>您正在对以下用户进行账户状态变更：</p>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#f6f6f6', 
          borderRadius: 6,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
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
          <div style={{ fontSize: 14 }}>
            <span>当前状态: </span>
            <span style={{ 
              color: user.status === 1 ? '#52c41a' : user.status === 0 ? '#ff4d4f' : '#fa8c16',
              fontWeight: 500
            }}>
              {currentStatus}
            </span>
            <span style={{ marginLeft: 16 }}>目标状态: </span>
            <span style={{ 
              color: targetStatus === 1 ? '#52c41a' : '#ff4d4f',
              fontWeight: 500
            }}>
              {targetStatus === 1 ? '正常' : '已禁用'}
            </span>
          </div>
        </div>
        
        <p style={{ color: user.status === 1 ? '#ff4d4f' : '#52c41a' }}>
          <strong>操作影响：</strong>
          {user.status === 1 ? (
            '禁用后用户将无法登录系统、下单、查看收益等。已产生的订单和收益不受影响。'
          ) : (
            '启用后用户将恢复正常使用权限，可以登录系统并进行相关操作。'
          )}
        </p>
      </div>
      
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          name="reason_type"
          label="变更原因类型"
          rules={[{ required: true, message: '请选择变更原因类型' }]}
          initialValue="other"
        >
          <Radio.Group>
            <Radio value="violation">违规操作</Radio>
            <Radio value="inactive">账户长期未使用</Radio>
            <Radio value="request">用户主动申请</Radio>
            <Radio value="other">其他原因</Radio>
          </Radio.Group>
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
            placeholder={`请详细说明${targetStatusText}账户的原因...`}
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>
        
        <Form.Item
          name="notify_user"
          label="是否通知用户"
          initialValue={true}
        >
          <Radio.Group>
            <Radio value={true}>发送通知</Radio>
            <Radio value={false}>不发送通知</Radio>
          </Radio.Group>
        </Form.Item>
        
        {user.status === 1 && (
          <Form.Item
            name="restrict_actions"
            label="限制操作"
            initialValue={['login', 'order']}
          >
            <Select
              mode="multiple"
              placeholder="选择要限制的操作"
              style={{ width: '100%' }}
            >
              <Option value="login">禁止登录</Option>
              <Option value="order">禁止下单</Option>
              <Option value="withdraw">禁止提现</Option>
              <Option value="team">禁止团队操作</Option>
              <Option value="all">全部限制</Option>
            </Select>
          </Form.Item>
        )}
        
        <Form.Item
          name="notes"
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
      
      <div style={{ 
        padding: 12, 
        backgroundColor: '#fff7e6', 
        borderRadius: 6,
        marginTop: 16,
        fontSize: 12,
        color: '#fa8c16'
      }}>
        <strong>注意事项：</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
          <li>状态变更操作不可逆，请谨慎操作</li>
          <li>变更记录将保存在操作日志中</li>
          <li>如选择发送通知，系统将自动向用户发送状态变更通知</li>
          <li>禁用账户前请确认已处理完相关业务</li>
        </ul>
      </div>
    </Modal>
  );
};

export default StatusChangeModal;