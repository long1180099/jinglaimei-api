import React, { useState } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Typography, 
  Space, 
  Divider,
  message,
  Checkbox,
  Row,
  Col
} from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  EyeTwoTone,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import './Login.css';

const { Title, Text, Link } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { login } = useAuthContext();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password, rememberMe);
      if (result.success) {
        message.success('登录成功！');
        navigate('/dashboard');
      } else {
        message.error(result.error || '登录失败，请检查用户名和密码');
      }
    } catch (error: any) {
      message.error(error?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    message.info('请联系管理员重置密码');
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-gradient"></div>
      </div>
      
      <div className="login-content">
        <Row justify="center" align="middle" className="login-row">
          <Col xs={24} sm={20} md={16} lg={12} xl={10}>
            <Card className="login-card">
              {/* Logo区域 */}
              <div className="login-logo">
                <div className="logo-icon">
                  静
                </div>
                <div className="logo-text">
                  <Title level={3} className="login-title">静莱美代理商系统</Title>
                  <Text type="secondary" className="login-subtitle">后台管理系统</Text>
                </div>
              </div>

              {/* 登录表单 */}
              <Form
                form={form}
                name="login"
                initialValues={{ remember: false }}
                onFinish={onFinish}
                layout="vertical"
                className="login-form"
              >
                <Form.Item
                  name="username"
                  rules={[
                    { required: true, message: '请输入用户名' },
                    { min: 3, message: '用户名至少3个字符' }
                  ]}
                >
                  <Input 
                    size="large" 
                    placeholder="用户名" 
                    prefix={<UserOutlined />}
                    className="login-input"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: '请输入密码' },
                    { min: 6, message: '密码至少6个字符' }
                  ]}
                >
                  <Input.Password
                    size="large"
                    placeholder="密码"
                    prefix={<LockOutlined />}
                    className="login-input"
                    iconRender={(visible) => 
                      visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                    }
                  />
                </Form.Item>

                <div className="form-options">
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    >
                      记住我
                    </Checkbox>
                  </Form.Item>
                  
                  <Button 
                    type="link" 
                    onClick={handleForgotPassword}
                    className="forgot-password"
                  >
                    忘记密码？
                  </Button>
                </div>

                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    size="large"
                    loading={loading}
                    block
                    className="login-button"
                  >
                    登录
                  </Button>
                </Form.Item>

                {/* 底部信息 */}
                <div className="login-footer">
                  <Text type="secondary" className="footer-text">
                    登录即表示同意
                    <Link href="#" className="footer-link">用户协议</Link>
                    和
                    <Link href="#" className="footer-link">隐私政策</Link>
                  </Text>
                </div>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>

      {/* 背景装饰元素 */}
      <div className="decorations">
        <div className="decoration-circle circle-1"></div>
        <div className="decoration-circle circle-2"></div>
        <div className="decoration-circle circle-3"></div>
      </div>
    </div>
  );
};

export default Login;