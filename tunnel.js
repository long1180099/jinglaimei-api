const http = require('http');
const https = require('https');

// 目标：localtunnel 公共隧道
const LT_URL = 'https://loca.lt';
const TUNNEL_PORT = 4000;

// 获取隧道URL
function getTunnelUrl(port) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ port, subdomain: 'jinglaimei2' });
    const options = {
      hostname: 'localtunnel.me',
      path: '/api/tunnels',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.url || result.id);
        } catch(e) {
          reject(new Error('Parse error: ' + data));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('正在连接 localtunnel...');
    const url = await getTunnelUrl(TUNNEL_PORT);
    console.log('公网地址: https://' + url);
    
    // 创建代理服务器监听本地
    // 小程序直接用 https://xxx.loca.lt 连接
  } catch(e) {
    console.error('连接失败:', e.message);
  }
}

main();
