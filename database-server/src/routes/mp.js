/**
 * 小程序端 API 路由 - 微信登录、小程序用户专属接口
 * 所有接口面向小程序端用户
 */
const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');
const { generateToken } = require('../middleware/auth');
const { processOrderRebate } = require('../services/rebateService');

// ==================== 短信验证码模块 ====================
// 内存存储验证码（生产环境建议换用Redis，支持分布式和过期自动清理）
const smsCodeStore = new Map(); // key: phone, value: { code, createdAt, attempts }

/**
 * 生成6位随机验证码
 */
function generateSmsCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 发送短信验证码（当前为开发模式：控制台打印；接入腾讯云SMS后替换发送逻辑）
 * @param {string} phone - 手机号
 * @returns {{ code: string, mock: boolean }}
 */
function sendSmsToPhone(phone) {
  const code = generateSmsCode();
  const now = Date.now();

  // 存储验证码（5分钟有效）
  smsCodeStore.set(phone, {
    code,
    createdAt: now,
    attempts: 0
  });

  // 清理过期的验证码（超过10分钟的）
  for (const [key, val] of smsCodeStore.entries()) {
    if (now - val.createdAt > 10 * 60 * 1000) {
      smsCodeStore.delete(key);
    }
  }

  // TODO: 生产环境替换为腾讯云短信SDK调用
  // const tencentcloud = require('tencentcloud-sdk-nodejs');
  // const SmsClient = tencentcloud.sms.v20210111.Client;
  // ...
  console.log(`[短信验证码] 手机号: ${phone}, 验证码: ${code}, 有效期: 5分钟`);

  return { code, mock: true };
}

/**
 * 验证短信验证码
 * @param {string} phone - 手机号
 * @param {string} inputCode - 用户输入的验证码
 * @returns {{ valid: boolean, msg: string }}
 */
function verifySmsCode(phone, inputCode) {
  const record = smsCodeStore.get(phone);
  if (!record) return { valid: false, msg: '验证码已过期或未发送' };

  // 检查是否超过5分钟有效期
  if (Date.now() - record.createdAt > 5 * 60 * 1000) {
    smsCodeStore.delete(phone);
    return { valid: false, msg: '验证码已过期，请重新获取' };
  }

  // 检验尝试次数（防止暴力破解，最多5次）
  record.attempts++;
  if (record.attempts > 5) {
    smsCodeStore.delete(phone);
    return { valid: false, msg: '验证错误次数过多，请重新获取' };
  }

  if (record.code !== inputCode) {
    return { valid: false, msg: '验证码错误' };
  }

  // 验证成功后立即删除（一次性使用）
  smsCodeStore.delete(phone);
  return { valid: true, msg: '验证成功' };
}

// 兼容旧接口名
function isRealSmsVerified(phone, code) {
  return verifySmsCode(phone, code).valid;
}

// ==================== 图片URL补全工具函数 ====================
// 小程序需要完整的https URL，自动将相对路径转为完整URL（真机必须HTTPS）
const API_BASE = 'https://api.jinglaimei.com';
function fixImageUrl(url) {
  if (!url) return '';
  // 已经是完整URL（http/https开头）则不处理
  if (/^https?:\/\//i.test(url)) return url;
  // 相对路径，补全域名
  return API_BASE + url;
}
// 批量修复商品对象中的图片URL
function fixProductImages(product) {
  if (!product) return product;
  if (product.main_image) product.main_image = fixImageUrl(product.main_image);
  // 注意：不要对已处理为数组的images字段调用fixImageUrl，否则会把数组转成字符串
  if (product.image_gallery && typeof product.image_gallery === 'string') {
    try {
      const gallery = JSON.parse(product.image_gallery);
      if (Array.isArray(gallery)) {
        product.image_gallery = JSON.stringify(gallery.map(fixImageUrl));
      }
    } catch(e) {}
  }
  return product;
}

// ==================== 微信登录（生产环境异步） ====================

async function _wxLogin(req, res, code, nickname, avatarUrl, gender) {
  const axios = require('axios');
  // 使用真实的小程序AppID
  const appId = process.env.WX_APPID || 'wx9ac76bfc2dad7364';
  const appSecret = process.env.WX_APP_SECRET || '';
  try {
    const wxRes = await axios.get(`https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`);
    if (wxRes.data.errcode) return error(res, '微信登录失败: ' + wxRes.data.errmsg);
    const openid = wxRes.data.openid;
    return _completeLogin(res, openid, nickname, avatarUrl, gender);
  } catch (err) {
    return error(res, '微信服务连接失败');
  }
}

function _completeLogin(res, openid, nickname, avatarUrl, gender, inviteCodeForBinding) {
  const db = getDB();

  let user = db.prepare('SELECT * FROM users WHERE openid = ? AND is_deleted = 0').get(openid);

  if (user) {
    // 已有openid账户
    
    // 🔗 账号合并检查：如果这个openid账户没有手机号，看看有没有同手机号的完整账户
    if (!user.phone) {
      // 这个openid账户是微信直接登录创建的，可能后台已经用同手机号创建了另一个账户
      // 但这里我们不知道手机号，所以暂时跳过
      // 合并主要在 wx-phone-login 触发
    }

    // 如果提供了邀请码且当前无上级，尝试绑定
    if (inviteCodeForBinding && !user.parent_id) {
      try { _bindByInviteCode(db, user.id, inviteCodeForBinding); } catch(e) {}
    }
    db.prepare("UPDATE users SET avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now','localtime') WHERE id = ?")
      .run(avatarUrl || user.avatar_url, user.id);
    // 刷新用户数据（可能已更新parent_id）
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  } else {
    // 新注册
    const myInviteCode = generateInviteCode(db);
    try {
      const result = db.prepare(`
        INSERT INTO users (openid, username, avatar_url, gender, agent_level, invite_code, registered_at, status)
        VALUES (?, ?, ?, ?, 1, ?, datetime('now','localtime'), 1)
      `).run(openid, nickname || '微信用户' + Date.now() % 10000, avatarUrl, gender || 0, myInviteCode);
      const newUserId = result.lastInsertRowid;
      
      // 注册时填写了邀请码 → 自动绑定上级
      if (inviteCodeForBinding) {
        try { _bindByInviteCode(db, newUserId, inviteCodeForBinding); } catch(e) {}
      }
      
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId);
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        user = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid);
      } else {
        return error(res, '注册失败: ' + err.message);
      }
    }
  }

  const token = generateToken({ id: user.id, openid: user.openid, type: 'mp' });
  return success(res, {
    token,
    userInfo: {
      id: user.id, username: user.username, realName: user.real_name,
      avatar: user.avatar_url, phone: user.phone, agentLevel: user.agent_level, agent_level: user.agent_level,
      inviteCode: user.invite_code, balance: user.balance, totalIncome: user.total_income,
      parentId: user.parent_id, teamId: user.team_id
    }
  }, user.id > 0 ? '登录成功' : '注册成功');
}

/**
 * 通过邀请码绑定上级关系
 * @param {Object} db - 数据库实例
 * @param {number} userId - 当前用户ID
 * @param {string} code - 邀请码
 */
/**
 * 账号合并：将重复账户的数据合并到主账户，删除重复账户
 * 场景：后台创建的用户(有phone无openid) vs 微信登录创建的用户(有openid无phone)
 * @param {Object} db - 数据库实例
 * @param {number} keepUserId - 保留的主账户ID（通常是后台创建的、有完整数据的）
 * @param {number} mergeUserId - 要合并进去的账户ID（通常是微信自动创建的）
 */
function _mergeAccounts(db, keepUserId, mergeUserId) {
  if (keepUserId === mergeUserId) return;
  
  const keep = db.prepare('SELECT id, phone, openid FROM users WHERE id = ?').get(keepUserId);
  const merge = db.prepare('SELECT id, phone, openid, parent_id, agent_level, invite_code, balance, total_income FROM users WHERE id = ?').get(mergeUserId);
  if (!keep || !merge) return;

  console.log(`[账号合并] 主账户(${keepUserId}, phone=${keep.phone||'无'}) ← 合并账户(${mergeUserId}, openid=${merge.openid||'无'})`);

  const tablesToMigrate = [
    // [表名, 用户字段名]
    ['orders', 'user_id'],
    ['order_items', 'order_id'], // 通过订单关联
    ['commissions', 'user_id'],
    ['balance_logs', 'user_id'],
    ['withdrawals', 'user_id'],
    ['action_weekly_goals', 'user_id'],
    ['action_daily_items', 'user_id'],
    ['action_monthly_tracking', 'user_id'],
    ['action_commitments_checkins', 'user_id'],
    ['socratic_sessions', 'user_id'],
    ['socratic_messages', 'session_id'], // 特殊处理
  ];

  try {
    db.prepare('BEGIN TRANSACTION');

    // 1. 迁移数据表
    for (const [table, field] of tablesToMigrate) {
      if (table === 'order_items') {
        // order_items通过order_id间接关联
        const orderIds = db.prepare(`SELECT id FROM orders WHERE user_id = ?`).all(mergeUserId);
        for (const oid of orderIds) {
          db.prepare(`UPDATE ${table} SET user_id = ? WHERE order_id = ?`).run(keepUserId, oid.id);
        }
      } else if (table === 'socratic_sessions') {
        db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id = ?`).run(keepUserId, mergeUserId);
      } else if (table === 'socratic_messages') {
        // socratic_messages 通过 session_id 关联 socratic_sessions
        const sessionIds = db.prepare(`SELECT id FROM socratic_sessions WHERE user_id = ?`).all(mergeUserId);
        for (const sid of sessionIds) {
          db.prepare(`UPDATE socratic_messages SET user_id = ? WHERE session_id = ?`).run(keepUserId, sid.id);
        }
      } else {
        // 直接迁移用户字段
        db.prepare(`UPDATE ${table} SET ${field} = ? WHERE ${field} = ?`).run(keepUserId, mergeUserId);
      }
    }

    // 2. 合并余额：把子账户余额加到主账户
    if (parseFloat(merge.balance) > 0) {
      const newBalance = parseFloat((parseFloat(keep.balance) + parseFloat(merge.balance)).toFixed(2));
      db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, keepUserId);
      // 记录余额合并日志
      db.prepare(`
        INSERT INTO balance_logs (user_id, change_type, change_amount, balance_before, balance_after, remark)
        VALUES (?, 'system_merge', ?, ?, ?, '账号合并: 从用户ID' || ? || '并入')
      `).run(keepUserId, parseFloat(merge.balance), parseFloat(keep.balance), newBalance, mergeUserId);
      
      // 同步 total_income
      const newTotalIncome = parseFloat((parseFloat(keep.total_income || 0) + parseFloat(merge.total_income || 0)).toFixed(2));
      db.prepare('UPDATE users SET total_income = ? WHERE id = ?').run(newTotalIncome > 0 ? newTotalIncome : 0, keepUserId);
    }

    // 3. 补全主账户缺失字段
    if (!keep.phone && merge.phone) {
      db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(merge.phone, keepUserId);
    }
    if (!keep.openid && merge.openid) {
      db.prepare('UPDATE users SET openid = ? WHERE id = ?').run(merge.openid, keepUserId);
    }
    // 如果子账户有头像而主账户没有，也补上
    if (!keep.avatar_url && merge.avatar_url) {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(merge.avatar_url, keepUserId);
    }

    // 4. 处理上下级关系：如果主账户没上级但子账户有，迁移过来
    if (!keep.parent_id && merge.parent_id) {
      db.prepare('UPDATE users SET parent_id = ? WHERE id = ?').run(merge.parent_id, keepUserId);
    }
    // 如果子账户是别人的上级，把那些下级的parent_id改成主账户
    db.prepare("UPDATE users SET parent_id = ? WHERE parent_id = ? AND id != ?").run(keepUserId, mergeUserId, keepUserId);

    // 5. 标记子账户为已合并删除
    db.prepare(`
      UPDATE users SET is_deleted = 1, username = username || '_已合并至ID' || ?,
      updated_at = datetime('now','localtime') WHERE id = ?
    `).run(keepUserId, mergeUserId);

    db.prepare('COMMIT');
    console.log(`[账号合并] ✅ 完成: 子账户${mergeUserId}的数据已合并到主账户${keepUserId}`);
    
  } catch (err) {
    db.prepare('ROLLBACK');
    console.error('[账号合并] ❌ 回滚:', err.message);
  }
}

/**
 * 生成4位随机邀请码（数字+大写字母）
 * @returns {string} 4位唯一邀请码，如 "A3X7"
 */
function generateInviteCode(db) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉容易混淆的 O/0/I/1/L
  let code;
  let attempts = 0;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    attempts++;
    if (attempts > 20) break; // 安全退出
  } while (db.prepare('SELECT 1 FROM users WHERE invite_code = ?').get(code));
  return code;
}

function _bindByInviteCode(db, userId, code) {
  if (!code || !code.trim()) return;
  const parent = db.prepare('SELECT id, username FROM users WHERE invite_code = ? AND is_deleted = 0 AND id != ?')
    .get(code.trim(), userId);
  if (parent) {
    db.prepare("UPDATE users SET parent_id = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(parent.id, userId);
    console.log(`[邀请码绑定] 用户${userId} 绑定上级: ${parent.username}(${parent.id}), 邀请码: ${code}`);
  }
}

// ==================== 微信登录 ====================

/**
 * POST /api/mp/wx-login
 * 微信小程序登录 - wx.login code 换 openid
 * 开发阶段：不调用微信API，直接用code模拟openid
 * 支持邀请码参数：新用户注册时自动绑定上级
 */
router.post('/wx-login', (req, res) => {
  const { code, nickname, avatarUrl, gender, invite_code } = req.body;

  if (!code) return error(res, '登录code不能为空');

  const db = getDB();

  // 开发阶段：使用code的hash作为openid（上线后替换为真实微信API调用）
  let openid;
  if (process.env.NODE_ENV === 'production' && process.env.WX_APP_SECRET) {
    // 生产环境：调用微信 code2session API
    return _wxLogin(req, res, code, nickname, avatarUrl, gender);
  } else {
    // 开发环境：使用固定openid，避免每次登录创建新用户
    return _completeLogin(res, 'dev_test_openid_001', nickname, avatarUrl, gender, invite_code);
  }
});

/**
 * POST /api/mp/wx-phone-login
 * 微信手机号快捷登录（真机版：用微信code解密手机号）
 * 前端传入微信getPhoneNumber返回的code
 * 支持邀请码参数：新用户注册时自动绑定上级
 */
router.post('/wx-phone-login', async (req, res) => {
  const { code, invite_code } = req.body;
  if (!code) return error(res, '手机号授权code不能为空');

  const axios = require('axios');
  // 使用真实的微信小程序AppID（必须与project.config.json一致）
  const appId = process.env.WX_APPID || 'wx9ac76bfc2dad7364';
  const appSecret = process.env.WX_APP_SECRET || '';

  try {
    let phone = null;

    // 有AppSecret时：调用微信API解密手机号
    if (appSecret) {
      // 1. 获取access_token
      const tokenRes = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`);
      const accessToken = tokenRes.data.access_token;
      if (!accessToken) return error(res, '获取微信凭证失败: ' + (tokenRes.data.errmsg || ''));

      // 2. 用access_token+code解密手机号
      const phoneRes = await axios.post(`https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`, { code });
      if (phoneRes.data.errcode && phoneRes.data.errcode !== 0) {
        console.error('[微信一键登录] 解密手机号失败:', JSON.stringify(phoneRes.data));
        // 返回具体错误码，便于前端提示用户
        const errMsg = phoneRes.data.errmsg || '未知错误';
        const errMap = {
          '40001': '微信凭证无效，请检查AppSecret配置',
          '40003': '无效的openid',
          '45009': '接口调用超限，请稍后重试',
          '47001': '缺少参数',
        };
        return error(res, errMap[String(phoneRes.data.errcode)] || '获取手机号失败: ' + errMsg);
      }
      phone = phoneRes.data.phone_info.phoneNumber;
      console.log(`[微信一键登录] 成功获取手机号: ${phone.slice(0,3)}****${phone.slice(-4)}`);
    } else {
      // 无AppSecret（开发环境）：用固定模拟手机号，并返回明确提示
      phone = '13800138000';
      console.log('[开发模式] wx-phone-login 使用模拟手机号: ' + phone + ' （请在.env中配置WX_APP_SECRET启用真实手机号）');
    }

    if (!phone) return error(res, '手机号获取失败');

    // 查找或创建用户（支持账号合并）
    const db = getDB();
    let user = db.prepare('SELECT * FROM users WHERE phone = ? AND is_deleted = 0').get(phone);

    if (!user) {
      const inviteCode = generateInviteCode(db);
      try {
        const result = db.prepare(`
          INSERT INTO users (phone, username, agent_level, invite_code, registered_at, status)
          VALUES (?, ?, 1, ?, datetime('now','localtime'), 1)
        `).run(phone, '用户' + phone.slice(-4), inviteCode);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        
        // 新用户绑定邀请码
        if (invite_code) {
          try { _bindByInviteCode(db, user.id, invite_code); user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id); } catch(e) {}
        }
      } catch (err) {
        return error(res, '注册失败: ' + err.message);
      }
    } else if (invite_code && !user.parent_id) {
      // 老用户无上级，尝试绑定
      try { _bindByInviteCode(db, user.id, invite_code); user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id); } catch(e) {}
    }

    // 🔗 账号合并：检查是否有同手机号的openid账户未合并（微信直接登录创建的重复账号）
    const openidOnlyUser = db.prepare(
      "SELECT * FROM users WHERE phone IS NULL AND openid IS NOT NULL AND openid != '' AND id != ? AND is_deleted = 0"
    ).get(user.id);
    
    // 也反向检查：是否有同手机号的另一个账号（理论上phone唯一，但防异常）
    // 更重要的是：如果当前user没有openid，看看有没有openid指向它的其他记录需要清理
    
    if (!user.openid) {
      // 主账户没有openid → 查找有没有openid-only的同手机号账户可以合并
      // （这种情况发生在：后台先创建用户，后来用微信直接登录又建了一个）
      const dupByPhone = db.prepare("SELECT * FROM users WHERE phone = ? AND openid IS NOT NULL AND openid != '' AND id != ? AND is_deleted = 0").get(phone, user.id);
      if (dupByPhone) {
        console.log(`[账号合并触发] 手机号登录发现重复账户: 主=${user.id}(无openid) vs 重复=${dupByPhone.id}(有openid), 执行合并`);
        _mergeAccounts(db, user.id, dupByPhone.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id); // 刷新数据
      }
    }

    const token = generateToken({ id: user.id, openid: user.openid, type: 'mp' });

    return success(res, {
      token,
      userInfo: {
        id: user.id, username: user.username, realName: user.real_name,
        avatar: user.avatar_url, phone: user.phone, agentLevel: user.agent_level, agent_level: user.agent_level,
        inviteCode: user.invite_code, balance: user.balance, totalIncome: user.total_income
      }
    }, '登录成功');
  } catch (err) {
    console.error('微信手机号登录失败:', err.message);
    return error(res, '手机号登录失败: ' + err.message);
  }
});

/**
 * POST /api/mp/send-sms
 * 发送短信验证码（开发模式：控制台打印验证码；生产环境接入腾讯云SMS）
 */
router.post('/send-sms', (req, res) => {
  const { phone } = req.body;
  if (!phone) return error(res, '手机号不能为空');
  if (!/^1[3-9]\d{9}$/.test(phone)) return error(res, '手机号格式不正确');

  // 频率限制：同一手机号60秒内只能发一次
  const record = smsCodeStore.get(phone);
  if (record && Date.now() - record.createdAt < 60 * 1000) {
    const remainSeconds = 60 - Math.floor((Date.now() - record.createdAt) / 1000);
    return error(res, `操作过于频繁，请${remainSeconds}秒后重试`);
  }

  try {
    const result = sendSmsToPhone(phone);
    return success(res, {
      mock: result.mock,
      msg: result.mock ? '开发模式：请查看服务器日志获取验证码' : '验证码已发送'
    }, '验证码已发送');
  } catch (err) {
    console.error('发送短信失败:', err);
    return error(res, '发送失败，请稍后重试');
  }
});

/**
 * POST /api/mp/phone-login
 * 手机号+验证码登录（自动注册新用户，支持邀请码绑定）
 */
router.post('/phone-login', (req, res) => {
  const { phone, code, invite_code } = req.body;
  if (!phone) return error(res, '手机号不能为空');
  if (!code) return error(res, '验证码不能为空');

  // 验证短信验证码
  const verifyResult = verifySmsCode(phone, code);
  if (!verifyResult.valid) {
    return error(res, verifyResult.msg);
  }

  const db = getDB();

  let user = db.prepare('SELECT * FROM users WHERE phone = ? AND is_deleted = 0').get(phone);
  let parentName = null;

  if (!user) {
    // 自动注册
    const myInviteCode = generateInviteCode(db);
    try {
      const result = db.prepare(`
        INSERT INTO users (phone, username, agent_level, invite_code, registered_at, status)
        VALUES (?, ?, 1, ?, datetime('now','localtime'), 1)
      `).run(phone, '用户' + phone.slice(-4), myInviteCode);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      
      // 新用户填写了邀请码 → 自动绑定上级
      if (invite_code) {
        try {
          _bindByInviteCode(db, user.id, invite_code);
          user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
          const parent = db.prepare('SELECT username FROM users WHERE id = ?').get(user.parent_id);
          parentName = parent?.username || null;
        } catch(e) {}
      }
    } catch (err) {
      return error(res, '注册失败: ' + err.message);
    }
  } else if (invite_code && !user.parent_id) {
    // 老用户无上级，尝试绑定
    try {
      _bindByInviteCode(db, user.id, invite_code);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      const parent = db.prepare('SELECT username FROM users WHERE id = ?').get(user.parent_id);
      parentName = parent?.username || null;
    } catch(e) {}
  }

  // 🔗 账号合并：检查是否有同手机号的openid账户需要合并
  if (!user.openid) {
    const dupByPhone = db.prepare("SELECT * FROM users WHERE phone = ? AND openid IS NOT NULL AND openid != '' AND id != ? AND is_deleted = 0").get(phone, user.id);
    if (dupByPhone) {
      console.log(`[phone-login合并] 短信登录发现重复: 主=${user.id}(无openid) vs 重复=${dupByPhone.id}(有openid)`);
      _mergeAccounts(db, user.id, dupByPhone.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }
  }

  const token = generateToken({ id: user.id, type: 'mp' });

  return success(res, {
    token,
    userInfo: {
      id: user.id,
      username: user.username,
      realName: user.real_name,
      avatar: user.avatar_url,
      phone: user.phone,
      agentLevel: user.agent_level,
      agent_level: user.agent_level,
      inviteCode: user.invite_code,
      balance: user.balance,
      totalIncome: user.total_income
    },
    parentName
  }, '登录成功');
});

/**
 * POST /api/mp/bind-invite-code
 * 已登录用户通过邀请码绑定上级关系（一次性，仅无上级时可绑定）
 */
router.post('/bind-invite-code', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const { invite_code } = req.body;
  if (!invite_code) return error(res, '请提供邀请码');

  const db = getDB();
  
  // 检查自己是否已有上级
  const me = db.prepare('SELECT id, parent_id FROM users WHERE id = ? AND is_deleted = 0').get(decoded.id);
  if (!me) return error(res, '用户不存在');
  if (me.parent_id) return error(res, '您已有上级，无法重复绑定');

  // 验证邀请码并绑定
  try {
    _bindByInviteCode(db, decoded.id, invite_code);
    const updated = db.prepare('SELECT id, parent_id, username FROM users WHERE id = ?').get(decoded.id);
    const parent = db.prepare('SELECT username, real_name, agent_level FROM users WHERE id = ?').get(updated.parent_id);
    return success(res, {
      parentId: updated.parent_id,
      parentName: parent?.username || '',
    }, `绑定成功！您的上级是：${parent?.username || parent?.real_name || '用户' + updated.parent_id}`);
  } catch (err) {
    return error(res, err.message || '绑定失败');
  }
});

/**
 * POST /api/mp/bind-phone
 * 绑定手机号
 */
router.post('/bind-phone', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const { phone, code } = req.body;
  if (!phone) return error(res, '手机号不能为空');

  const db = getDB();

  try {
    // 检查手机号是否已被其他账户占用
    const existingUser = db.prepare('SELECT * FROM users WHERE phone = ? AND is_deleted = 0 AND id != ?').get(phone, decoded.id);
    
    if (existingUser) {
      // 🔗 手机号被占用 → 执行账号合并（当前openid账户 → 已有phone的主账户）
      console.log(`[bind-phone合并] 用户${decoded.id}绑定手机${phone}，发现已有主账户${existingUser.id}，执行合并`);
      
      // 把当前用户的openid补到主账户上
      const myOpenid = db.prepare('SELECT openid FROM users WHERE id = ?').get(decoded.id).openid;
      if (myOpenid && !existingUser.openid) {
        db.prepare("UPDATE users SET openid = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(myOpenid, existingUser.id);
      }
      
      // 合并当前用户数据到主账户
      _mergeAccounts(db, existingUser.id, decoded.id);
      
      // 返回新token（指向主账户）
      const newToken = generateToken({ id: existingUser.id, openid: existingUser.openid || myOpenid, type: 'mp' });
      const mainUser = db.prepare('SELECT * FROM users WHERE id = ?').get(existingUser.id);
      return success(res, {
        token: newToken,
        merged: true,
        userInfo: {
          id: mainUser.id, username: mainUser.username, realName: mainUser.real_name,
          avatar: mainUser.avatar_url, phone: mainUser.phone,
          agentLevel: mainUser.agent_level, agent_level: mainUser.agent_level,
          inviteCode: mainUser.invite_code, balance: mainUser.balance, totalIncome: mainUser.total_income
        }
      }, '手机号绑定成功，数据已自动合并');
    }
    
    // 手机号未被占用 → 直接绑定
    db.prepare("UPDATE users SET phone = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(phone, decoded.id);
    return success(res, null, '手机号绑定成功');
  } catch (err) {
    if (err.message.includes('UNIQUE')) return error(res, '该手机号已被其他账号绑定');
    return error(res, '绑定失败: ' + err.message);
  }
});

/**
 * PUT /api/mp/profile
 * 更新个人信息
 */
router.put('/profile', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const { real_name, avatar_url, gender, birthday } = req.body;
  const db = getDB();

  db.prepare(`
    UPDATE users SET
      real_name = COALESCE(?, real_name),
      avatar_url = COALESCE(?, avatar_url),
      gender = COALESCE(?, gender),
      birthday = COALESCE(?, birthday),
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(real_name, avatar_url, gender, birthday, decoded.id);

  return success(res, null, '更新成功');
});

/**
 * POST /api/mp/apply-agent
 * 申请成为代理商
 */
router.post('/apply-agent', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const { real_name, phone, parent_id } = req.body;
  if (!real_name || !phone) return error(res, '姓名和手机号不能为空');

  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
  if (!user) return error(res, '用户不存在');

  if (parent_id) {
    const parent = db.prepare('SELECT id, invite_code FROM users WHERE (id = ? OR invite_code = ?) AND is_deleted = 0').get(parent_id, parent_id);
    if (parent) {
      db.prepare("UPDATE users SET parent_id = ?, real_name = ?, phone = ?, agent_level = 2, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(parent.id, real_name, phone, decoded.id);
    }
  } else {
    db.prepare("UPDATE users SET real_name = ?, phone = ?, agent_level = 2, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(real_name, phone, decoded.id);
  }

  return success(res, null, '申请提交成功，等待审核');
});

// ==================== 小程序端首页 ====================

/**
 * GET /api/mp/categories
 * 公开商品分类（无需登录，供商品页使用）
 */
router.get('/categories', (req, res) => {
  const db = getDB();
  const categories = db.prepare('SELECT * FROM product_categories WHERE status = 1 ORDER BY sort_order').all();
  return success(res, categories);
});

/**
 * GET /api/mp/home
 * 小程序首页数据聚合
 */
router.get('/home', (req, res) => {
  const db = getDB();

  // 轮播图/公告（使用系统配置）
  const banners = db.prepare("SELECT * FROM system_configs WHERE config_key LIKE 'banner_%' ORDER BY sort_order").all();
  const announcements = db.prepare("SELECT * FROM system_configs WHERE config_key LIKE 'notice_%' ORDER BY sort_order").all();

  // 热门商品（按销量排序）
  const hotProducts = db.prepare(`
    SELECT id, product_name, main_image, retail_price, agent_price, vip_price, partner_price,
           wholesale_price, chief_price, division_price,
           (stock_quantity - sold_quantity) as available_stock, sold_quantity as sales_count,
           is_hot, specifications, status
    FROM products WHERE status = 1 AND is_hot = 1
    ORDER BY sort_order ASC, sold_quantity DESC LIMIT 6
  `).all();

  // 推荐商品
  const recommendProducts = db.prepare(`
    SELECT id, product_name, main_image, retail_price, agent_price, vip_price, partner_price,
           wholesale_price, chief_price, division_price,
           (stock_quantity - sold_quantity) as available_stock, sold_quantity as sales_count,
           is_recommend, specifications, status
    FROM products WHERE status = 1 AND is_recommend = 1
    ORDER BY sort_order ASC LIMIT 4
  `).all();

  // 新品上架（按创建时间排序）
  const newProducts = db.prepare(`
    SELECT id, product_name, main_image, retail_price, agent_price, vip_price, partner_price,
           wholesale_price, chief_price, division_price,
           (stock_quantity - sold_quantity) as available_stock, sold_quantity as sales_count,
           description, specifications, status, 1 as is_new
    FROM products WHERE status = 1
    ORDER BY created_at DESC LIMIT 6
  `).all();

  // 商品分类
  const categories = db.prepare('SELECT * FROM product_categories WHERE status = 1 ORDER BY sort_order LIMIT 10').all();

  // 最新课程
  const latestCourses = db.prepare(`
    SELECT id, course_title, course_subtitle, cover_image, course_type, view_count
    FROM school_courses WHERE status = 1 ORDER BY created_at DESC LIMIT 4
  `).all();

  return success(res, {
    banners: banners.map(b => JSON.parse(b.config_value || '{}')),
    announcements: announcements.map(a => a.config_value),
    hotProducts: hotProducts.map(fixProductImages),
    recommendProducts: recommendProducts.map(fixProductImages),
    newProducts: newProducts.map(fixProductImages),
    categories,
    latestCourses
  });
});

// ==================== 小程序端商品 ====================

/**
 * GET /api/mp/products
 * 小程序端商品列表（只显示上架商品）
 */
router.get('/products', (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, keyword, categoryId, isHot, isRecommend, sort } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = ['status = 1'];
  let params = [];
  if (keyword) {
    where.push('(product_name LIKE ? OR product_code LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (categoryId) { where.push('category_id = ?'); params.push(parseInt(categoryId)); }
  if (isHot === '1') { where.push('is_hot = 1'); }
  if (isRecommend === '1') { where.push('is_recommend = 1'); }

  const whereClause = 'WHERE ' + where.join(' AND ');

  // 排序
  let orderBy = 'sort_order ASC, sold_quantity DESC';
  if (sort === 'price_asc') orderBy = 'agent_price ASC';
  else if (sort === 'price_desc') orderBy = 'agent_price DESC';
  else if (sort === 'newest') orderBy = 'created_at DESC';
  else if (sort === 'sales') orderBy = 'sold_quantity DESC';

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM products ${whereClause}`).get(...params).cnt;
  const products = db.prepare(`
    SELECT id, product_name, product_code, category_id, main_image, retail_price, agent_price,
           vip_price, partner_price, wholesale_price, chief_price, division_price,
           (stock_quantity - sold_quantity) as available_stock,
           sold_quantity as sales_count, is_hot, is_recommend, description, brand,
           specifications, status, created_at
    FROM products ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  // 根据代理商等级返回对应价格
  // 1=会员看零售价, 2=打版代言人看代言人价, 3=代理商看代理价, 4=批发商看批发价, 5=首席分公司看分公司价, 6=集团事业部看事业部价

  return success(res, { list: products.map(fixProductImages), total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

/**
 * GET /api/mp/products/:id
 * 小程序端商品详情
 */
router.get('/products/:id', (req, res) => {
  const db = getDB();
  const product = db.prepare(`
    SELECT p.*, c.category_name,
           (p.stock_quantity - p.sold_quantity) as available_stock,
           p.sold_quantity as sales_count,
           p.image_gallery as images
    FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    WHERE p.id = ? AND p.status = 1
  `).get(req.params.id);
  if (!product) return error(res, '商品不存在或已下架', 404);

  // 解析图片列表 + URL补全（防御性处理异常数据）
  let images = [];
  if (product.images) {
    try {
      var rawImages = product.images;
      // 如果是字符串且看起来像URL而非JSON数组，当作单图处理
      if (typeof rawImages === 'string') {
        rawImages = rawImages.trim();
        // 检测是否为有效的JSON数组格式
        if (rawImages.startsWith('[') || rawImages.startsWith('{')) {
          images = JSON.parse(rawImages);
        } else if (/^https?:\/\//i.test(rawImages)) {
          // 裸URL，包装成数组
          images = [rawImages];
        } else {
          // 尝试解析，失败则忽略
          try { images = JSON.parse(rawImages); } catch(e2) { images = []; }
        }
      } else if (Array.isArray(rawImages)) {
        images = rawImages;
      }
    } catch(e) { 
      console.error('[商品详情] 图片字段解析失败:', e.message, '原始值:', String(product.images).substring(0,100));
      images = []; 
    }
  }
  // 确保images始终是数组
  if (!Array.isArray(images)) images = [];
  product.images = images.map(fixImageUrl);
  fixProductImages(product); // 补全 main_image

  // 清理可能破坏JSON的字段（description等富文本中的特殊字符由JSON.stringify处理，但确保无未转义字符）
  if (product.description && typeof product.description === 'string') {
    // 确保没有未闭合的控制字符
    product.description = product.description.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  }

  // 相关推荐
  const related = db.prepare(`
    SELECT id, product_name, main_image, agent_price
    FROM products WHERE category_id = ? AND id != ? AND status = 1
    ORDER BY sold_quantity DESC LIMIT 6
  `).all(product.category_id, req.params.id);

  return success(res, { ...product, relatedProducts: related.map(fixProductImages) });
});

// ==================== 小程序端购物车 & 订单 ====================

/**
 * POST /api/mp/orders
 * 小程序端创建订单（增强版：支持多级定价）
 */
router.post('/orders', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const db = getDB();
  const { items, receiver_name, receiver_phone, receiver_address, shipping_fee = 0, discount_amount = 0, payment_method, delivery_type, remark } = req.body;
  if (!items?.length) return error(res, '商品列表不能为空');

  // payment_method: 'balance' = 余额支付, 其他 = 待支付
  const useBalance = payment_method === 'balance';
  // delivery_type: 'pickup' = 到店自提, 'express' = 快递配送
  const isPickup = delivery_type === 'pickup';

  // 获取用户信息和默认收货地址
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
  const rName = receiver_name || user.real_name || user.username;
  const rPhone = receiver_phone || user.phone;
  // 自提时手机号非必填，快递时必填
  if (!isPickup && !rPhone) return error(res, '请先填写收货手机号');
  // 自提时地址非必填（自动填"到店自提"），快递时必填
  if (!isPickup && !receiver_address) return error(res, '请填写收货地址');
  const finalAddress = isPickup ? '到店自提' : (receiver_address || '到店自提');

  const createOrder = db.transaction(() => {
    let totalAmount = 0;
    const orderItems = [];

    // 根据代理商等级确定价格
    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND status = 1').get(item.product_id);
      if (!product) throw new Error('商品不存在: ' + item.product_id);
      if ((product.stock_quantity - product.sold_quantity) < item.quantity) throw new Error('商品库存不足: ' + product.product_name);

      // 多级定价
      let unitPrice = product.retail_price;
      const level = user.agent_level || 1;
      if (level >= 6 && product.division_price) unitPrice = product.division_price;
      else if (level >= 5 && product.chief_price) unitPrice = product.chief_price;
      else if (level >= 4 && product.wholesale_price) unitPrice = product.wholesale_price;
      else if (level >= 3 && product.agent_price) unitPrice = product.agent_price;
      else if (level >= 2 && product.vip_price) unitPrice = product.vip_price;

      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;
      orderItems.push({ product, quantity: item.quantity, subtotal, unitPrice });
    }

    const actualAmount = totalAmount + parseFloat(shipping_fee) - parseFloat(discount_amount);

    // 余额支付检查
    if (useBalance) {
      if (user.balance < actualAmount) throw new Error('余额不足，当前余额 ¥' + user.balance.toFixed(2) + '，需要 ¥' + actualAmount.toFixed(2));
    }

    const orderNo = 'JLM' + Date.now().toString().slice(-14) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const orderStatus = useBalance ? 1 : 0;  // 余额支付直接到待发货
    const payStatus = useBalance ? 1 : 0;

    const orderResult = db.prepare(`
      INSERT INTO orders (order_no, user_id, total_amount, discount_amount, shipping_fee, actual_amount,
        receiver_name, receiver_phone, receiver_address, payment_method, order_status, payment_status, 
        payment_time, paid_amount, order_time, buyer_remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), ?, datetime('now','localtime'), ?)
    `).run(orderNo, decoded.id, totalAmount, discount_amount, shipping_fee, actualAmount,
           rName, rPhone, finalAddress, payment_method || 'balance', orderStatus, payStatus,
           useBalance ? actualAmount : 0, remark);

    const orderId = orderResult.lastInsertRowid;

    for (const { product, quantity, subtotal, unitPrice } of orderItems) {
      db.prepare(`INSERT INTO order_items (order_id, product_id, product_name, product_image, unit_price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(orderId, product.id, product.product_name, product.main_image, unitPrice, quantity, subtotal);
      db.prepare("UPDATE products SET sold_quantity = sold_quantity + ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(quantity, product.id);
    }

    // 余额扣减 + 记录日志
    if (useBalance) {
      const balanceBefore = user.balance;
      const balanceAfter = parseFloat((balanceBefore - actualAmount).toFixed(2));
      db.prepare("UPDATE users SET balance = ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(balanceAfter, decoded.id);
      db.prepare(`
        INSERT INTO balance_logs (user_id, change_type, change_amount, balance_before, balance_after, 
          operator_id, operator_name, remark, order_id)
        VALUES (?, 'order_pay', ?, ?, ?, NULL, 'system', ?, ?)
      `).run(decoded.id, -actualAmount, balanceBefore, balanceAfter, '余额支付订单 ' + orderNo, orderId);
    }

    return { orderId, orderNo, actualAmount, paid: useBalance };
  });

  try {
    const result = createOrder();
    return success(res, result, useBalance ? '下单并支付成功' : '订单创建成功', 201);
  } catch (err) {
    return error(res, err.message);
  }
});

/**
 * GET /api/mp/orders
 * 小程序端我的订单
 */
router.get('/orders', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const { page = 1, pageSize = 10, status } = req.query;
  const db = getDB();
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = ['o.user_id = ?'];
  let params = [decoded.id];
  if (status !== undefined && status !== '') {
    where.push('o.order_status = ?');
    params.push(parseInt(status));
  }

  const whereClause = 'WHERE ' + where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM orders o ${whereClause}`).get(...params).cnt;
  const orders = db.prepare(`
    SELECT o.id, o.order_no, o.total_amount, o.actual_amount, o.order_status, o.payment_status,
           o.order_time, o.shipping_no, o.receiver_name,
           (SELECT GROUP_CONCAT(oi.product_name || ':' || oi.quantity, ', ') FROM order_items oi WHERE oi.order_id = o.id) as item_summary,
           (SELECT oi.product_image FROM order_items oi WHERE oi.order_id = o.id LIMIT 1) as first_image
    FROM orders o ${whereClause}
    ORDER BY o.order_time DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return success(res, { list: orders, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

/**
 * GET /api/mp/orders/:id
 * 小程序端订单详情
 */
router.get('/orders/:id', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const db = getDB();
  const order = db.prepare(`
    SELECT o.* FROM orders o WHERE o.id = ? AND o.user_id = ?
  `).get(req.params.id, decoded.id);
  if (!order) return error(res, '订单不存在', 404);

  const items = db.prepare(`
    SELECT oi.* FROM order_items oi WHERE oi.order_id = ?
  `).all(req.params.id);

  return success(res, { ...order, items });
});

/**
 * POST /api/mp/orders/:id/confirm
 * 确认收货
 */
router.post('/orders/:id/confirm', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ? AND order_status = 2')
    .get(req.params.id, decoded.id);
  if (!order) return error(res, '订单不存在或当前状态不可确认收货');

  db.transaction(() => {
    // 更新订单状态
    db.prepare(`UPDATE orders SET order_status = 3, confirm_time = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?`)
      .run(req.params.id);
    // 差价返利：上级赚取下级差价
    const rebateResult = processOrderRebate(order.id, decoded.id, db);
    if (rebateResult.totalRebate > 0) {
      console.log('[差价返利] 订单' + order.id + ' 买家' + decoded.id + ' 获得返利 ¥' + rebateResult.totalRebate);
    }
  })();

  return success(res, null, '已确认收货');
});

/**
 * POST /api/mp/orders/:id/cancel
 * 取消订单
 */
router.post('/orders/:id/cancel', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const db = getDB();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ? AND order_status IN (0, 1)')
    .get(req.params.id, decoded.id);
  if (!order) return error(res, '订单不存在或当前状态不可取消');

  // 恢复库存
  db.transaction(() => {
    const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(req.params.id);
    for (const item of items) {
      db.prepare("UPDATE products SET sold_quantity = sold_quantity - ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(item.quantity, item.product_id);
    }
    db.prepare(`UPDATE orders SET order_status = 4, cancel_time = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?`)
      .run(req.params.id);
  })();

  return success(res, null, '订单已取消');
});

// ==================== 小程序端收益 ====================

/**
 * GET /api/mp/income
 * 我的收益概览
 */
router.get('/income', (req, res) => {
  try {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const db = getDB();
  const user = db.prepare('SELECT COALESCE(balance,0) as balance, COALESCE(frozen_balance,0) as frozen_balance, COALESCE(total_income,0) as total_income FROM users WHERE id = ?').get(decoded.id);
  if (!user) return error(res, '用户不存在', 404);

  const todayIncome = db.prepare("SELECT COALESCE(SUM(commission_amount), 0) as val FROM commissions WHERE user_id = ? AND date(created_at) = date('now') AND commission_status = 1")
    .get(decoded.id).val;
  const monthIncome = db.prepare("SELECT COALESCE(SUM(commission_amount), 0) as val FROM commissions WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m','now') AND commission_status = 1")
    .get(decoded.id).val;
  const pendingIncome = db.prepare("SELECT COALESCE(SUM(commission_amount), 0) as val FROM commissions WHERE user_id = ? AND commission_status = 0")
    .get(decoded.id).val;

  return success(res, {
    balance: parseFloat(user.balance) || 0,
    frozenBalance: parseFloat(user.frozen_balance) || 0,
    totalIncome: parseFloat(user.total_income) || 0,
    todayIncome: parseFloat(todayIncome) || 0,
    monthIncome: parseFloat(monthIncome) || 0,
    pendingIncome: parseFloat(pendingIncome) || 0
  });
  } catch(e) {
    console.error('[收益概览] 接口异常:', e.message || e);
    return error(res, '获取收益数据失败: ' + (e.message || '未知错误'), 500);
  }
});

/**
 * GET /api/mp/income/records
 * 收益明细
 */
router.get('/income/records', (req, res) => {
  try {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const { page = 1, pageSize = 10, status } = req.query;
  const db = getDB();
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let params = [decoded.id];
  if (status !== undefined && status !== '') { params.push(parseInt(status)); }

  // COUNT查询无别名，用 user_id
  let countWhere = ['user_id = ?'];
  if (status !== undefined && status !== '') { countWhere.push('commission_status = ?'); }
  const countClause = 'WHERE ' + countWhere.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM commissions ${countClause}`).get(...params).cnt;

  // 主查询有别名c，用 c.user_id
  let selectWhere = ['c.user_id = ?'];
  if (status !== undefined && status !== '') { selectWhere.push('c.commission_status = ?'); }
  const selectClause = 'WHERE ' + selectWhere.join(' AND ');
  const records = db.prepare(`
    SELECT c.id, c.commission_type, c.commission_amount, c.commission_status,
           c.created_at, COALESCE(c.order_id, 0) as order_id, COALESCE(o.order_no, '') as order_no
    FROM commissions c
    LEFT JOIN orders o ON c.order_id = o.id
    ${selectClause}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return success(res, { list: records || [], total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch(e) {
    console.error('[收益明细] 接口异常:', e.message || e);
    return error(res, '获取收益明细失败: ' + (e.message || '未知错误'), 500);
  }
});

/**
 * POST /api/mp/income/withdraw
 * 申请提现
 */
router.post('/income/withdraw', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const { withdrawal_amount, bank_name, bank_card_no, account_name } = req.body;
  if (!withdrawal_amount || withdrawal_amount <= 0) return error(res, '提现金额必须大于0');

  const db = getDB();
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(decoded.id);
  if (!user || user.balance < withdrawal_amount) return error(res, '余额不足');

  const serviceFee = parseFloat((withdrawal_amount * 0.005).toFixed(2));
  const actualAmount = parseFloat((withdrawal_amount - serviceFee).toFixed(2));
  const no = 'WD' + Date.now();

  try {
    const doWithdraw = db.transaction(() => {
      db.prepare(`INSERT INTO withdrawals (withdrawal_no, user_id, withdrawal_amount, service_fee, actual_amount, bank_name, bank_card_no, account_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(no, decoded.id, withdrawal_amount, serviceFee, actualAmount, bank_name || '招商银行', bank_card_no || '', account_name || '');
      db.prepare("UPDATE users SET balance = balance - ?, frozen_balance = frozen_balance + ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(withdrawal_amount, withdrawal_amount, decoded.id);
    });
    doWithdraw();
    return success(res, { withdrawalNo: no, actualAmount, serviceFee }, '提现申请提交成功', 201);
  } catch (err) {
    return error(res, '提现申请失败');
  }
});

/**
 * GET /api/mp/income/withdrawals
 * 我的提现记录
 */
router.get('/income/withdrawals', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const { page = 1, pageSize = 10 } = req.query;
  const db = getDB();
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  const total = db.prepare('SELECT COUNT(*) as cnt FROM withdrawals WHERE user_id = ?').get(decoded.id).cnt;
  const records = db.prepare(`
    SELECT * FROM withdrawals WHERE user_id = ?
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(decoded.id, parseInt(pageSize), offset);

  return success(res, { list: records, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

// ==================== 小程序端团队 ====================

/**
 * GET /api/mp/team
 * 我的团队信息
 */
router.get('/team', (req, res) => {
  try {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const db = getDB();
  const user = db.prepare(`
    SELECT u.id, u.username, u.real_name, u.avatar_url, u.agent_level, u.total_income,
           u.balance, u.frozen_balance,
           COALESCE(u.invite_code, '') as invite_code,
           COALESCE(t.team_name, '') as team_name, COALESCE(t.team_level, 0) as team_level, COALESCE(t.total_sales, 0) as team_sales,
           COALESCE(p.username, '') as parent_username, COALESCE(p.real_name, '') as parent_real_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    LEFT JOIN users p ON u.parent_id = p.id
    WHERE u.id = ? AND (u.is_deleted = 0 OR u.is_deleted IS NULL)
  `).get(decoded.id);

  if (!user) return error(res, '用户不存在', 404);

  // 直属下级数量
  const directCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE parent_id = ? AND is_deleted = 0').get(decoded.id).cnt;
  // 团队总人数（递归计算所有下级）
  const teamCount = db.prepare(`
    WITH RECURSIVE team_tree(id) AS (
      SELECT ? UNION ALL
      SELECT u.id FROM users u JOIN team_tree t ON u.parent_id = t.id WHERE u.is_deleted = 0
    )
    SELECT COUNT(*) - 1 as cnt FROM team_tree
  `).get(decoded.id).cnt;

  // 直属成员列表（用created_at或registered_at兼容不同字段）
  let members;
  try {
    members = db.prepare(`
      SELECT id, username, 
             COALESCE(real_name, '') as real_name, 
             COALESCE(avatar_url, '') as avatar_url, 
             COALESCE(agent_level, 1) as agent_level,
             COALESCE(total_income, 0) as total_income,
             COALESCE(created_at, registered_at, '') as created_at,
             (SELECT COUNT(*) FROM users sub WHERE sub.parent_id = users.id AND (sub.is_deleted = 0 OR sub.is_deleted IS NULL)) as sub_count
      FROM users WHERE parent_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY COALESCE(created_at, registered_at, '') DESC
    `).all(decoded.id);
  } catch(e2) {
    members = db.prepare(`
      SELECT id, COALESCE(username, '') as username, '' as real_name, '' as avatar_url,
             COALESCE(agent_level, 1) as agent_level, COALESCE(total_income, 0) as total_income,
             '' as created_at, 0 as sub_count
      FROM users WHERE parent_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
    `).all(decoded.id);
  }

  return success(res, { ...user, directCount, teamCount, directMembers: members });
  } catch(e) {
    console.error('[团队管理] 获取团队数据失败:', e.message || e);
    return error(res, '获取团队数据失败: ' + (e.message || e), 500);
  }
});

/**
 * GET /api/mp/team/tree
 * 团队树形结构
 */
router.get('/team/tree', (req, res) => {
  try {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const db = getDB();

  function buildTree(parentId, depth = 0) {
    if (depth > 5) return [];
    const children = db.prepare(`
      SELECT id, username, real_name, avatar_url, agent_level, total_income,
             COALESCE(created_at, registered_at) as registered_at,
             (SELECT COUNT(*) FROM users sub WHERE sub.parent_id = users.id AND (sub.is_deleted=0 OR sub.is_deleted IS NULL)) as children_count
      FROM users WHERE parent_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY agent_level DESC, COALESCE(created_at, registered_at) ASC
    `).all(parentId);

    return children.map(child => ({
      ...child,
      children: buildTree(child.id, depth + 1)
    }));
  }

  const me = db.prepare('SELECT id, username, real_name, avatar_url, agent_level, total_income FROM users WHERE id = ?').get(decoded.id);

  return success(res, { ...me, children: buildTree(decoded.id) });
  } catch(e) {
    console.error('[团队树] 获取团队树失败:', e.message || e);
    return error(res, '获取团队树数据失败: ' + (e.message || e), 500);
  }
});

/**
 * GET /api/mp/team/ranking
 * 团队排行（仅显示同团队）
 */
router.get('/team/ranking', (req, res) => {
  try {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const db = getDB();
  const user = db.prepare('SELECT COALESCE(team_id,0) as team_id FROM users WHERE id = ?').get(decoded.id);

  if (!user || !user.team_id) {
    return success(res, []);
  }

  const ranking = db.prepare(`
    SELECT u.id, u.username, u.real_name, u.avatar_url, u.agent_level,
           COALESCE(SUM(c.commission_amount), 0) as month_income,
           COUNT(DISTINCT o.id) as month_orders
    FROM users u
    LEFT JOIN commissions c ON u.id = c.user_id AND strftime('%Y-%m', c.created_at) = strftime('%Y-%m','now') AND c.commission_status = 1
    LEFT JOIN orders o ON u.id = o.user_id AND strftime('%Y-%m', o.order_time) = strftime('%Y-%m','now') AND o.order_status = 3
    WHERE u.team_id = ? AND (u.is_deleted = 0 OR u.is_deleted IS NULL)
    GROUP BY u.id
    ORDER BY month_income DESC
    LIMIT 20
  `).all(user.team_id);

  return success(res, ranking);
  } catch(e) {
    console.error('[团队排行] 获取排行榜失败:', e.message || e);
    return error(res, '获取团队排行失败: ' + (e.message || e), 500);
  }
});

/**
 * GET /api/mp/public/ranking
 * 公开业绩排行榜（无需登录，供首页展示）
 * 支持查询参数: limit(默认10), period(month/all)
 */
router.get('/public/ranking', (req, res) => {
  const db = getDB();
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const period = req.query.period || 'month';

  let dateFilter = '';
  if (period === 'month') {
    dateFilter = "AND strftime('%Y-%m', c.created_at) = strftime('%Y-%m','now') AND c.commission_status = 1";
  } else if (period === 'all') {
    dateFilter = "AND c.commission_status = 1";
  }

  // 查询所有用户（非删除）的业绩排行
  const ranking = db.prepare(`
    SELECT u.id, u.username, u.real_name, u.avatar_url, u.agent_level,
           COALESCE(SUM(c.commission_amount), 0) as total_income,
           COUNT(DISTINCT o.id) as order_count,
           (SELECT COUNT(*) FROM users sub WHERE sub.parent_id = u.id AND sub.is_deleted = 0) as team_count
    FROM users u
    LEFT JOIN commissions c ON u.id = c.user_id ${dateFilter}
    LEFT JOIN orders o ON u.id = o.user_id ${period === 'month' ? "AND strftime('%Y-%m', o.order_time) = strftime('%Y-%m','now') AND o.order_status = 3" : "AND o.order_status = 3"}
    WHERE u.is_deleted = 0 AND u.status != 0
    GROUP BY u.id
    ORDER BY total_income DESC, order_count DESC
    LIMIT ?
  `).all(limit);

  // 添加排名
  const result = ranking.map((r, i) => ({ ...r, rank: i + 1 }));

  return success(res, result);
});

// ==================== 小程序端商学院 ====================

/**
 * GET /api/mp/school/courses
 * 小程序端课程列表
 */
router.get('/school/courses', (req, res) => {
  const db = getDB();
  const { page = 1, pageSize = 10, type, keyword } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let where = ['status = 1'];
  let params = [];
  if (type) { where.push('course_type = ?'); params.push(parseInt(type)); }
  if (keyword) { where.push('course_title LIKE ?'); params.push(`%${keyword}%`); }

  const whereClause = 'WHERE ' + where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as cnt FROM school_courses ${whereClause}`).get(...params).cnt;
  const courses = db.prepare(`
    SELECT id, course_title, course_subtitle, cover_image, video_url, content, course_type, required_time,
           difficulty_level, credit_points, view_count, like_count, created_at
    FROM school_courses ${whereClause}
    ORDER BY sort_order ASC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(pageSize), offset);

  return success(res, { list: courses, total, page: parseInt(page), pageSize: parseInt(pageSize) });
});

/**
 * GET /api/mp/school/courses/:id
 * 小程序端课程详情
 */
router.get('/school/courses/:id', (req, res) => {
  const db = getDB();
  const course = db.prepare('SELECT * FROM school_courses WHERE id = ? AND status = 1').get(req.params.id);
  if (!course) return error(res, '课程不存在', 404);

  // 浏览量+1
  db.prepare('UPDATE school_courses SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);

  // 检查当前用户学习进度
  let myProgress = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      myProgress = db.prepare('SELECT * FROM study_progress WHERE user_id = ? AND course_id = ?').get(decoded.id, req.params.id);
    } catch {}
  }

  return success(res, { ...course, myProgress });
});

/**
 * POST /api/mp/school/progress
 * 更新学习进度
 */
router.post('/school/progress', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const { course_id, progress_percent, study_duration, study_status } = req.body;
  if (!course_id) return error(res, '课程ID不能为空');

  const db = getDB();
  const isComplete = study_status === 2 || progress_percent >= 100;

  db.prepare(`
    INSERT INTO study_progress (user_id, course_id, study_status, progress_percent, study_duration, start_time, complete_time)
    VALUES (?, ?, ?, ?, ?, datetime('now','localtime'), ?)
    ON CONFLICT(user_id, course_id) DO UPDATE SET
      study_status = CASE WHEN excluded.progress_percent >= 100 THEN 2 ELSE MAX(study_status, excluded.study_status) END,
      progress_percent = MAX(progress_percent, excluded.progress_percent),
      study_duration = study_duration + excluded.study_duration,
      complete_time = CASE WHEN excluded.progress_percent >= 100 THEN datetime('now','localtime') ELSE complete_time END,
      updated_at = datetime('now','localtime')
  `).run(decoded.id, course_id, isComplete ? 2 : (study_status || 1), Math.min(progress_percent || 0, 100), study_duration || 0, isComplete ? "datetime('now','localtime')" : null);

  return success(res, null, '进度已保存');
});

/**
 * GET /api/mp/school/my-courses
 * 我的课程/学习记录
 */
router.get('/school/my-courses', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return error(res, '未登录', 401);
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../middleware/auth');
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); } catch { return error(res, '登录已过期', 401); }

  const db = getDB();
  const records = db.prepare(`
    SELECT sp.*, c.course_title, c.cover_image, c.course_type, c.required_time
    FROM study_progress sp
    JOIN school_courses c ON sp.course_id = c.id
    WHERE sp.user_id = ?
    ORDER BY sp.updated_at DESC
  `).all(decoded.id);

  return success(res, records);
});

module.exports = router;
