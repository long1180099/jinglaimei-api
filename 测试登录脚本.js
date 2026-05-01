// 测试登录流程脚本
console.log('测试登录流程...');

// 清空本地存储（模拟未登录状态）
localStorage.removeItem('jlm_auth_token');
localStorage.removeItem('jlm_user_info');
localStorage.removeItem('jlm_remember_me');

console.log('清空本地存储完成');

// 模拟登录
const mockLogin = () => {
  const mockUser = {
    username: 'testuser',
    role: 'admin',
    permissions: ['all'],
    email: 'testuser@jinglaimei.com',
    phone: '13800138000',
    department: '运营部'
  };
  
  const mockToken = 'mock_token_' + Date.now();
  
  // 保存到本地存储
  localStorage.setItem('jlm_auth_token', mockToken);
  localStorage.setItem('jlm_user_info', JSON.stringify(mockUser));
  
  console.log('模拟登录完成，用户信息:', mockUser);
  console.log('本地存储中的token:', localStorage.getItem('jlm_auth_token'));
  console.log('本地存储中的用户信息:', localStorage.getItem('jlm_user_info'));
  
  // 检查认证状态
  const token = localStorage.getItem('jlm_auth_token');
  const userData = localStorage.getItem('jlm_user_info');
  
  if (token && userData) {
    console.log('认证成功！');
    const user = JSON.parse(userData);
    console.log('用户角色:', user.role);
    console.log('用户权限:', user.permissions);
  } else {
    console.log('认证失败！');
  }
};

// 执行测试
mockLogin();

// 测试ProtectedRoute逻辑
const testProtectedRoute = () => {
  const token = localStorage.getItem('jlm_auth_token');
  const userData = localStorage.getItem('jlm_user_info');
  
  if (token && userData) {
    console.log('\nProtectedRoute检查：');
    console.log('1. isAuthenticated: true');
    
    const user = JSON.parse(userData);
    console.log('2. user存在: ', !!user);
    console.log('3. 用户角色: ', user.role);
    
    // 检查权限
    if (user.role === 'admin') {
      console.log('4. 管理员权限: 拥有所有权限');
    }
    
    console.log('ProtectedRoute应该允许访问！');
  } else {
    console.log('\nProtectedRoute检查：');
    console.log('isAuthenticated: false，应该重定向到登录页面');
  }
};

testProtectedRoute();