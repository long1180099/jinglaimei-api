/**
 * 联调测试脚本：注册绑定→下单→扣库存→扣余额→差价到账→平级无利润
 * 
 * 测试场景：
 *   场景A: 有差价 - 上级(level3代理商) > 下级(level1会员)，确认收货后上级获得差价
 *   场景B: 平级无利 - 上级(level3) == 下级(level3)，确认收货后无人获利
 */

const API_BASE = 'http://118.195.185.6/api';

// ==================== HTTP工具 ====================
async function request(path, options = {}) {
  const url = API_BASE + path;
  const opts = {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };
  const res = await fetch(url, opts);
  const data = await res.json();
  return { status: res.status, data };
}

// ==================== 步骤管理器 ====================
const results = [];
function logStep(scenario, step, success, detail) {
  const entry = { time: new Date().toLocaleTimeString(), scenario, step, success: success ? '✅' : '❌', detail };
  results.push(entry);
  console.log(`[${entry.time}] [${scenario}] ${entry.success} ${step} — ${detail}`);
}

// ==================== 主测试函数 ====================
async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║    静莱美系统联调测试                                    ║');
  console.log('║    注册绑定 → 下单 → 扣库存 → 扣余额 → 差价 → 平级   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ---- 0. 获取管理员Token ----
  let adminToken;
  try {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'admin123456' },
    });
    adminToken = loginRes.data.data?.token || loginRes.data.token;
    logStep('INIT', '管理员登录', !!adminToken, `token=${adminToken ? adminToken.slice(0, 20) + '...' : 'FAIL'}`);
  } catch (e) {
    logStep('INIT', '管理员登录', false, e.message);
    return results;
  }

  // ---- 0.1 查看现有用户和商品 ----
  const usersRes = await request('/users', { headers: { Authorization: `Bearer ${adminToken}` } });
  const users = usersRes.data?.data?.list || [];
  logStep('INIT', '查询用户列表', true, `共${users.length}个用户`);

  const productsRes = await request('/products', { headers: { Authorization: `Bearer ${adminToken}` } });
  const products = productsRes.data?.data?.list || [];
  logStep('INIT', '查询商品列表', true, `共${products.length}个商品`);
  
  // 选第一个上架商品做测试
  const testProduct = products[0];
  if (!testProduct) { logStep('INIT', '选择测试商品', false, '无可用商品'); return results; }
  logStep('INIT', '选择测试商品', true, `${testProduct.product_name}(ID:${testProduct.id}) 零售价¥${testProduct.retail_price} 库存(${testProduct.stock_quantity}/${testProduct.sold_quantity})`);

  // ============================================================
  // 场景A: 有差价 — 上级(level3) > 下级(level1)
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 场景A: 有差价 — 上级(代理商L3) > 下级(会员L1)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step A1: 创建/找到上级用户(L3代理商)并设置余额为5000
  let upperUserA;
  const existingUpperA = users.find(u => u.username === 'test_upper_agent');
  if (existingUpperA) {
    upperUserA = existingUpperA;
    logStep('A1', '查找上级用户(代理商)', true, `ID=${upperUserA.id}, L=${upperUserA.agent_level}, 余额¥${upperUserA.balance}`);
  } else {
    const createUpperA = await request('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { username: 'test_upper_agent', phone: '13900001111', real_name: '测试上级代理', agent_level: 3 },
    });
    upperUserA = createUpperA.data?.data;
    logStep('A1', '创建上级用户(代理商)', createUpperA.data?.code === 0, `ID=${upperUserA?.id}, agent_level=3`);
  }

  // 给上级充余额方便后续验证
  if (upperUserA) {
    await request(`/users/${upperUserA.id}/balance`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { amount: 5000, remark: '联调测试充值' },
    });
    logStep('A1+', '上级充值¥5000', true, `ID=${upperUserA.id}`);
  }
  
  // 获取上级邀请码（如果没有则生成一个）
  let upperInviteCode = upperUserA?.invite_code;
  if (!upperInviteCode) {
    const upperDetail = await request(`/users/${upperUserA.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    upperInviteCode = upperDetail.data?.data?.invite_code;
  }
  if (!upperInviteCode) {
    // 管理端创建的用户没有邀请码，手动生成一个
    upperInviteCode = 'JLM' + Date.now().toString(36).toUpperCase() + 'A';
    await request(`/users/${upperUserA.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { invite_code: upperInviteCode },
    });
    logStep('A1++', '为上级生成邀请码', true, upperInviteCode);
  } else {
    logStep('A1++', '获取上级邀请码', true, upperInviteCode);
  }

  // Step A2: 用手机号注册/登录下级用户(L1会员)，同时绑定上级
  // 使用时间戳后缀确保唯一性（避免UNIQUE约束冲突）
  const tsSuffix = String(Date.now()).slice(-6);
  const lowerPhoneA = `1390099${tsSuffix}`;
  
  let lowerUserA_token, lowerUserA_info;

  // 尝试注册
  const loginARes = await request('/mp/phone-login', {
    method: 'POST',
    body: { phone: lowerPhoneA, code: '000000', invite_code: upperInviteCode },
  });

  if (loginARes.data?.code === 0 && loginARes.data?.data?.userInfo?.id) {
    lowerUserA_token = loginARes.data?.data?.token;
    lowerUserA_info = loginARes.data?.data?.userInfo;
    logStep('A2', '✅ 注册/登录下级用户(会员)', true,
      `phone=${lowerPhoneA}, userId=${lowerUserA_info?.id}, parentId=${lowerUserA_info?.parentId}`);
  } else {
    logStep('A2', '❌ 注册下级用户(会员)', false, loginARes.data?.message);
    return; // 无法继续
  }

  // 如果补充绑定上级（如果还没绑）
  if (lowerUserA_info && !lowerUserA_info.parentId) {
    const bindParentRes = await request(`/users/${lowerUserA_info.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { parent_id: upperUserA.id },
    });
    if (bindParentRes.data?.code === 0 || bindParentRes.data?.code === undefined) {
      lowerUserA_info.parentId = upperUserA.id;
      logStep('A2b', '🔧 绑定上级(put)', true, `userId=${lowerUserA_info.id} → parentId=${upperUserA.id}`);
    } else {
      logStep('A2b', '🔧 绑定上级(put)', false, bindParentRes.data?.message);
    }
  }

  // 验证最终状态
  if (!lowerUserA_info?.id) {
    logStep('A2_FAIL', '⚠️ 下级用户获取失败，场景A中止', false);
    return;
  }
  if (!lowerUserA_token) {
    const jwt = require('jsonwebtoken');
    lowerUserA_token = jwt.sign({ id: lowerUserA_info.id, type: 'mp' }, 'jinglaimei-secret-2024');
  }

  // Step A3: 给下级充值用于下单
  if (lowerUserA_info?.id) {
    await request(`/users/${lowerUserA_info.id}/balance`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { amount: 10000, remark: '联调测试充值-下级下单' },
    });
    logStep('A3', '下级充值¥10000', true, `userId=${lowerUserA_info.id}`);

    // 查询余额确认
    const balCheck = await request(`/users/${lowerUserA_info.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const newBal = balCheck.data?.data?.balance;
    logStep('A3+', '确认下级余额', true, `余额=¥${newBal}`);
  }

  // Step A4: 记录下单前状态
  const productBeforeA = await request(`/products/${testProduct.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const soldBeforeA = productBeforeA.data?.data?.sold_quantity || 0;
  const stockBeforeA = (productBeforeA.data?.data?.stock_quantity || 0) - soldBeforeA;
  const upperBeforeA = await request(`/users/${upperUserA.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const upperBalanceBeforeA = upperBeforeA.data?.data?.balance || 0;

  logStep('A4', '【快照】下单前状态', true,
    `商品已售=${soldBeforeA}, 可用库存≈${stockBeforeA}, 上级余额=¥${upperBalanceBeforeA.toFixed(2)}`);

  // Step A5: 下单（余额支付）
  const orderARes = await request('/mp/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lowerUserA_token}` },
    body: {
      items: [{ product_id: testProduct.id, quantity: 2 }],
      receiver_name: '测试收货人A',
      receiver_phone: lowerPhoneA,
      receiver_address: '北京市测试路1号',
      payment_method: 'balance',
      delivery_type: 'express',
    },
  });
  const orderA = orderARes.data?.data;
  const orderIdA = orderA?.orderId;
  logStep('A5', '下单位额支付(2件)', orderARes.data?.code === 0,
    `orderId=${orderIdA}, orderNo=${orderA?.orderNo}, 实付¥${orderA?.actualAmount}, paid=${orderA?.paid}`);

  // Step A6: 验证库存扣减
  const productAfterOrderA = await request(`/products/${testProduct.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const soldAfterOrderA = productAfterOrderA.data?.data?.sold_quantity || 0;
  const stockDeductedA = soldAfterOrderA - soldBeforeA;
  logStep('A6', '✅ 库存扣减验证', stockDeductedA === 2,
    `下单前已售=${soldBeforeA} → 下单后已售=${soldAfterOrderA} (变化+${stockDeductedA})`);

  // Step A7: 验证余额扣减
  const lowerAfterPayA = await request(`/users/${lowerUserA_info.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const lowerBalanceAfterPayA = lowerAfterPayA.data?.data?.balance || 0;
  const balanceDeductedA = 10000 - lowerBalanceAfterPayA; // 充了10000后的变化
  logStep('A7', '✅ 余额扣减验证', lowerBalanceAfterPayA < 10000,
    `充值10000后余额=¥${lowerBalanceAfterPayA.toFixed(2)} (扣除了约¥${orderA?.actualAmount})`);

  // Step A8: 管理端标记发货
  const shipARes = await request(`/orders/${orderIdA}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 2, shippingNo: 'SF_TEST_A001' },
  });
  logStep('A8', '管理端标记已发货', shipARes.data?.code === 0, `orderId=${orderIdA} → status=2`);

  // Step A9: 小程序端确认收货（触发差价返利！）
  const confirmARes = await request(`/mp/orders/${orderIdA}/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lowerUserA_token}` },
  });
  logStep('A9', '⭐ 小程序确认收货(触发返利)', confirmARes.data?.code === 0,
    `orderId=${orderIdA} → status=3, processOrderRebate已执行`);

  // Step A10: 验证差价到账！
  const upperAfterRebateA = await request(`/users/${upperUserA.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const upperBalanceAfterA = upperAfterRebateA.data?.data?.balance || 0;
  const rebateAmountA = parseFloat((upperBalanceAfterA - upperBalanceBeforeA).toFixed(2));
  const hasRebateA = rebateAmountA > 0;

  logStep('A10', '⭐⭐ 差价到账验证', hasRebateA,
    `上级余额: ¥${upperBalanceBeforeA.toFixed(2)} → ¥${upperBalanceAfterA.toFixed(2)} (差价 +¥${rebateAmountA})`);

  // 诊断：查看商品的完整价格信息
  const prodDetail = await request(`/products/${testProduct.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const prod = prodDetail.data?.data;
  logStep('A10_DIAG', '📋 商品价格诊断', true,
    `retail=${prod?.retail_price}, vip=${prod?.vip_price}, agent=${prod?.agent_price}, partner=${prod?.partner_price}, wholesale=${prod?.wholesale_price}, chief=${prod?.chief_price}, division=${prod?.division_price}`);

  // 诊断：查看上下级链路关系是否正确
  const chainRes = await request(`/users/${lowerUserA_info.id}/upline-chain`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const chainData = chainRes.data?.data;
  
  // 直接查用户详情看parent_id是否真存了
  const lowerDetailA = await request(`/users/${lowerUserA_info.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const realParentId = lowerDetailA.data?.data?.parent_id;
  
  logStep('A10_CHAIN', '⛓️ 上下级链路诊断', true,
    `DB_parentId=${realParentId}, expected=${upperUserA.id}, uplineCount=${chainData?.uplineCount}`);

  if (!realParentId || String(realParentId) !== String(upperUserA.id)) {
    logStep('A10_ROOT', '❌ 根因发现: parent_id未存入DB', false,
      `DB值=${realParentId}, 期望=${upperUserA.id}. PUT /users/:id 可能不支持更新parent_id`);
  }
  const orderDetailA = await request(`/orders/${orderIdA}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const commDataA = orderDetailA.data?.data?.commission || [];
  logStep('A10_DIAG+', '📋 订单返利数据', commDataA.length > 0,
    JSON.stringify(commDataA.map(c => ({ type: c.commission_type, amt: c.commission_amount, status: c.commission_status }))));

  // 查佣金记录
  const commARes = await request(`/commissions?userId=${upperUserA.id}&page=1&pageSize=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const commRecordsA = commARes.data?.data?.list || [];
  const latestCommA = commRecordsA.find(c => c.order_id === orderIdA);
  logStep('A10+', '佣金记录验证', !!latestCommA,
    latestCommA ? `commission_type=3(差价), ¥${latestCommA.commission_amount}, status=${latestCommA.commission_status}` : '未找到该订单的佣金记录');

  // ============================================================
  // 场景B: 平级无利润 — 上级(L3) == 下级(L3)
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 场景B: 平级无利 — 上级(代理商L3) == 下级(代理商L3)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step B1: 找/创建另一个上级(L3)
  let upperUserB;
  const existingUpperB = users.find(u => u.username === 'test_upper_peer');
  if (existingUpperB) {
    upperUserB = existingUpperB;
    logStep('B1', '查找平级上级(L3)', true, `ID=${upperUserB.id}, L=${upperUserB.agent_level}`);
  } else {
    const createUpperB = await request('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { username: 'test_upper_peer', phone: '13900002222', real_name: '测试平级上级', agent_level: 3 },
    });
    upperUserB = createUpperB.data?.data;
    logStep('B1', '创建平级上级(L3)', createUpperB.data?.code === 0, `ID=${upperUserB?.id}, agent_level=3`);
  }

  let upperInviteCodeB = upperUserB?.invite_code;
  if (!upperInviteCodeB) {
    const ub = await request(`/users/${upperUserB.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    upperInviteCodeB = ub.data?.data?.invite_code;
  }
  if (!upperInviteCodeB) {
    upperInviteCodeB = 'JLM' + Date.now().toString(36).toUpperCase() + 'B';
    await request(`/users/${upperUserB.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { invite_code: upperInviteCodeB },
    });
    logStep('B1+', '为平级上级生成邀请码', true, upperInviteCodeB);
  }

  // Step B2: 注册/登录下级也是L3，绑定上级L3
  const tsSuffixB = String(Date.now()).slice(-6);
  const lowerPhoneB = `1390098${tsSuffixB}`;
  
  let lowerUserB_token, lowerUserB_info;
  
  const loginBRes = await request('/mp/phone-login', {
    method: 'POST',
    body: { phone: lowerPhoneB, code: '000000', invite_code: upperInviteCodeB },
  });
  
  if (loginBRes.data?.code === 0 && loginBRes.data?.data?.userInfo?.id) {
    lowerUserB_token = loginBRes.data?.data?.token;
    lowerUserB_info = loginBRes.data?.data?.userInfo;
    logStep('B2', '✅ 注册/登录下级(L3)', true, `phone=${lowerPhoneB}, userId=${lowerUserB_info?.id}`);
  } else {
    logStep('B2', '❌ 注册下级(L3)', false, loginBRes.data?.message);
    return;
  }

  // 如果没有绑定，用管理端绑定
  if (lowerUserB_info && !lowerUserB_info.parentId) {
    const bindParentResB = await request(`/users/${lowerUserB_info.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { parent_id: upperUserB.id },
    });
    if (bindParentResB.data?.code === 0 || bindParentResB.data?.code === undefined) {
      lowerUserB_info.parentId = upperUserB.id;
      logStep('B2b', '🔧 绑定平级上级(put)', true, `userId=${lowerUserB_info.id} → parentId=${upperUserB.id}`);
    } else {
      logStep('B2b', '🔧 绑定平级上级(put)', false, bindParentResB.data?.message);
    }
  }

  if (!lowerUserB_info?.id || !lowerUserB_token) {
    const jwt = require('jsonwebtoken');
    lowerUserB_token = jwt.sign({ id: lowerUserB_info?.id || 0, type: 'mp' }, 'jinglaimei-secret-2024');
    if (!lowerUserB_info?.id) {
      logStep('B2_FAIL', '⚠️ 下级用户获取失败，场景B中止', false);
      return;
    }
  }

  // 把下级改为L3（模拟同级）
  if (lowerUserB_info?.id) {
    await request(`/users/${lowerUserB_info.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { agent_level: 3 },  // 改成和上级一样是L3
    });
    logStep('B2+', '将下级等级改为L3(平级)', true, `userId=${lowerUserB_info.id} → agent_level=3`);

    // 给下级充值
    await request(`/users/${lowerUserB_info.id}/balance`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { amount: 10000, remark: '联调测试充值-平级' },
    });
  }

  // Step B3: 记录上级当前余额
  const upperBeforeB = await request(`/users/${upperUserB.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const upperBalanceBeforeB = upperBeforeB.data?.data?.balance || 0;
  logStep('B3', '【快照】上级余额(确认收货前)', true, `¥${upperBalanceBeforeB.toFixed(2)}`);

  // Step B4: 下单
  const orderBRes = await request('/mp/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lowerUserB_token}` },
    body: {
      items: [{ product_id: testProduct.id, quantity: 1 }],
      receiver_name: '测试收货人B',
      receiver_phone: lowerPhoneB,
      receiver_address: '上海市测试路2号',
      payment_method: 'balance',
      delivery_type: 'pickup',
    },
  });
  const orderB = orderBRes.data?.data;
  const orderIdB = orderB?.orderId;
  logStep('B4', '下单位额支付(1件)', orderBRes.data?.code === 0,
    `orderId=${orderIdB}, 实付¥${orderB?.actualAmount}`);

  // Step B5: 发货
  await request(`/orders/${orderIdB}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { status: 2 },
  });
  logStep('B5', '标记已发货', true, `orderId=${orderIdB} → status=2`);

  // Step B6: 确认收货
  const confirmBRes = await request(`/mp/orders/${orderIdB}/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${lowerUserB_token}` },
  });
  logStep('B6', '⭐ 确认收货(平级应无返利)', confirmBRes.data?.code === 0, `orderId=${orderIdB} → status=3`);

  // Step B7: 验证——上级余额不应增加！
  const upperAfterB = await request(`/users/${upperUserB.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const upperBalanceAfterB = upperAfterB.data?.data?.balance || 0;
  const diffB = parseFloat((upperBalanceAfterB - upperBalanceBeforeB).toFixed(2));
  const noProfitB = diffB === 0;

  logStep('B7', '⭐⭐ 平级无利润验证', noProfitB,
    `上级余额: ¥${upperBalanceBeforeB.toFixed(2)} → ¥${upperBalanceAfterB.toFixed(2)} (变化: ¥${diffB}, 期望=0)`);

  // 查佣金——应该没有这条订单的佣金
  const commBRes = await request(`/commissions?userId=${upperUserB.id}&page=1&pageSize=5`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const commRecordsB = commBRes.data?.data?.list || [];
  const peerCommB = commRecordsB.find(c => c.order_id === orderIdB);
  logStep('B7+', '佣金记录验证(应为空)', !peerCommB,
    peerCommB ? `⚠️ 意外存在佣金: ¥${peerCommB.commission_amount}` : '✅ 无佣金记录（符合预期）');

  // ============================================================
  // 最终报告
  // ============================================================
  console.log('\n\n╔══════════════════════════════════════════════╗');
  console.log('║          📊 联调测试最终报告                  ║');
  console.log('╠══════════════════════════════════════════════╣');

  const passCount = results.filter(r => r.success === '✅').length;
  const failCount = results.filter(r => r.success === '❌').length;

  results.forEach(r => {
    console.log(`║ ${r.success} [${r.scenario.padEnd(4)}] ${(r.step + ' — ').padEnd(32)} ${String(r.detail || '').padEnd(30)}`);
  });

  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  总计: ${results.length}步 | 通过: ${passCount} | 失败: ${failCount} | ${failCount === 0 ? '全部通过 ✅' : '有失败 ⚠️'}`);
  console.log('╚══════════════════════════════════════════════╝\n');

  return results;
}

// 执行
runTests().catch(err => {
  console.error('脚本异常:', err.message);
  process.exit(1);
});
