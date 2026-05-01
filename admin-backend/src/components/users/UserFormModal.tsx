import React, { useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Radio, 
  message,
  Row,
  Col
} from 'antd';
import { useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import { updateUser } from '@/store/slices/userSlice';
import type { AppDispatch } from '@/store';

const { Option } = Select;

interface UserFormModalProps {
  user: any | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ 
  user, 
  visible, 
  onClose,
  onSuccess 
}) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch<AppDispatch>();
  
  // 是否为编辑模式
  const isEditMode = !!user;
  
  // 初始化表单数据
  useEffect(() => {
    if (visible) {
      if (user) {
        // 编辑模式：填充现有数据
        form.setFieldsValue({
          username: user.username,
          phone: user.phone,
          email: user.email,
          real_name: user.real_name,
          gender: user.gender,
          birthday: user.birthday ? dayjs(user.birthday) : null,
          agent_level: user.agent_level,
          parent_id: user.parent_id,
          team_id: user.team_id,
          status: user.status,
        });
      } else {
        // 创建模式：重置表单
        form.resetFields();
        form.setFieldsValue({
          gender: 0,
          agent_level: 1,
          status: 1,
        });
      }
    }
  }, [visible, user, form]);
  
  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 处理生日字段
      const formData: any = {
        ...values,
        birthday: values.birthday ? values.birthday.format('YYYY-MM-DD') : undefined,
      };
      
      if (isEditMode) {
        // 更新用户
        await dispatch(updateUser({
          userId: user!.id,
          data: formData
        })).unwrap();
        message.success('用户信息更新成功');
      } else {
        // 创建用户
        await dispatch(updateUser({ userId: user?.id || "", data: formData })).unwrap();
        message.success('用户创建成功');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.message) {
        message.error(error.message);
      } else {
        message.error('操作失败');
      }
    }
  };
  
  return (
    <Modal
      title={isEditMode ? '编辑用户信息' : '创建新用户'}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={isEditMode ? '更新' : '创建'}
      cancelText="取消"
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 2, max: 20, message: '用户名长度在2-20个字符之间' },
              ]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="real_name"
              label="真实姓名"
              rules={[
                { max: 20, message: '真实姓名长度不能超过20个字符' },
              ]}
            >
              <Input placeholder="请输入真实姓名" />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="手机号"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式' },
              ]}
            >
              <Input placeholder="请输入手机号" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { type: 'email', message: '请输入正确的邮箱格式' },
              ]}
            >
              <Input placeholder="请输入邮箱" />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="gender"
              label="性别"
              rules={[{ required: true, message: '请选择性别' }]}
            >
              <Radio.Group>
                <Radio value={0}>未知</Radio>
                <Radio value={1}>男</Radio>
                <Radio value={2}>女</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="birthday"
              label="生日"
            >
              <DatePicker 
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                placeholder="请选择生日"
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="agent_level"
              label="代理等级"
              rules={[{ required: true, message: '请选择代理等级' }]}
            >
              <Select placeholder="请选择代理等级">
                <Option value={1}>会员</Option>
                <Option value={2}>打版代言人</Option>
                <Option value={3}>代理商</Option>
                <Option value={4}>批发商</Option>
                <Option value={5}>首席分公司</Option>
                <Option value={6}>集团事业部</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="status"
              label="账户状态"
              rules={[{ required: true, message: '请选择账户状态' }]}
            >
              <Select placeholder="请选择账户状态">
                <Option value={1}>正常</Option>
                <Option value={0}>禁用</Option>
                <Option value={2}>审核中</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="parent_id"
              label="上级代理ID"
            >
              <Input 
                placeholder="请输入上级代理ID" 
                type="number"
                min={1}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="team_id"
              label="团队ID"
            >
              <Input 
                placeholder="请输入团队ID" 
                type="number"
                min={1}
              />
            </Form.Item>
          </Col>
        </Row>
        
        {/* 密码设置（仅创建时） */}
        {!isEditMode && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="password"
                label="初始密码"
                rules={[
                  { required: true, message: '请输入初始密码' },
                  { min: 6, max: 20, message: '密码长度在6-20个字符之间' },
                ]}
              >
                <Input.Password placeholder="请输入初始密码" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="confirm_password"
                label="确认密码"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="请确认密码" />
              </Form.Item>
            </Col>
          </Row>
        )}
        
        {/* 备注信息 */}
        <Form.Item
          name="remark"
          label="备注"
        >
          <Input.TextArea 
            placeholder="请输入备注信息" 
            rows={3}
            maxLength={200}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserFormModal;