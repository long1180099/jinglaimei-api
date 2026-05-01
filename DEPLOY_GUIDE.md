# 🚀 静莱美管理后台 - 云托管部署指南

## 部署包已就绪
📄 **文件位置**: `/Users/apple/WorkBuddy/20260324191412/admin-deploy-cloudrun.tar.gz` (5.49 MB)

---

## 部署步骤（3分钟搞定）

### ① 打开云托管控制台
https://console.cloud.tencent.com/tcb/env/list → 选择 **prod** 环境

### ② 新建服务（管理前台）
在左侧菜单 **"服务管理"** → 点 **"新建"** 或 **"创建服务"**

| 配置项 | 填写内容 |
|--------|---------|
| 服务名称 | `admin-web` |
| 运行环境 | **自定义 (代码/镜像)** |
| 部署方式 | **本地上传代码包** |
| 代码包 | 选择上面的 `.tar.gz` 文件 |
| 实例规格 | 选最便宜的（1核0.5G就够） |
| 实例数量 | 1 |

### ③ 等待构建部署（约2-3分钟）
构建完成后，云托管会分配一个临时访问地址，类似：
```
admin-web-xxx.service.tcloudbase.com
```

### ④ 验证访问
- 用上面地址打开管理后台
- 登录：`admin` / `admin123456`
- 测试订单打印功能 ✅

---

## 架构说明

```
微信云托管 prod 环境
┌─────────────────────────────────────┐
│                                     │
│  ┌──────────────┐   ┌────────────┐ │
│  │ admin-web    │──▶│ express-co3x│ │
│  │ (Nginx+React)│   │ (Node.js)   │ │
│  │ 端口: 80     │   │ 端口: 4000  │ │
│  └──────────────┘   └────────────┘ │
│       ↑                   ↑        │
│   管理后台前端          后端API     │
│   (静态SPA)           (SQLite)      │
│                                     │
└─────────────────────────────────────┘
```

- **admin-web**: Nginx 托管 React 构建产物，`/api/*` 自动代理到后端
- **express-co3x**: 已有后端 API 服务，不需要改动
- 两服务在同一环境内通过内部网络通信，速度快、免公网流量

---

## ICP 备案通过后

备案下来后，在云托管的 **"自定义域名"** 菜单添加：

| 域名 | 绑定到 |
|------|-------|
| `api.jinglaimei.com` | express-co3x 服务 |
| `admin.jinglaimei.com` | admin-web 服务 |

---

## 后续更新代码时

```bash
cd /Users/apple/WorkBuddy/20260324191412/admin-backend

# 1. 构建
npm run build  # 或者 node ../node_modules/react-scripts/scripts/build.js

# 2. 打包
node pack-for-cloudrun.js

# 3. 在控制台上传新的 .tar.gz 即可
```
