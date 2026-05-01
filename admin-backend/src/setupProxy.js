const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 行动日志API代理 - 端口4001
  app.use(
    '/api/action-log',
    createProxyMiddleware({
      target: 'http://localhost:4001/api',
      changeOrigin: true,
    })
  );

  // 中台API代理 - 端口4000
  // http-proxy-middleware v3 会strip context path，所以target要包含/api前缀
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:4000/api',
      changeOrigin: true,
    })
  );
};
